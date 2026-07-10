import "server-only";
import { getRegionId } from "./commerce";
import type { CartLine, CartView, ShippingOptionView, CompletedOrder } from "./cart-types";

export type { CartLine, CartView, ShippingOptionView, CompletedOrder } from "./cart-types";

/**
 * Server-side Medusa Store API client for cart + checkout. Called only from
 * Next route handlers (which manage the cart-id cookie) — never from the client,
 * so the publishable key and cart ids stay server-side.
 */

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const PAYMENT_PROVIDER = "pp_system_default"; // manual provider from Medusa seed

export function medusaConfigured(): boolean {
  return Boolean(BACKEND && KEY);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  if (!medusaConfigured()) throw new Error("Medusa is not configured");
  const res = await fetch(`${BACKEND}${path}`, {
    ...init,
    headers: {
      "x-publishable-api-key": KEY as string,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Medusa ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

interface RawLine {
  id: string;
  title?: string;
  product_title?: string;
  variant_title?: string;
  quantity: number;
  unit_price: number;
  total?: number;
  thumbnail?: string | null;
  product_handle?: string | null;
  product?: { handle?: string } | null;
}

interface RawCart {
  id: string;
  email?: string | null;
  currency_code: string;
  items?: RawLine[];
  subtotal?: number;
  shipping_total?: number;
  total?: number;
  shipping_methods?: { id: string }[];
  discount_total?: number;
  promotions?: { code?: string | null }[];
  shipping_address?: {
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
    address_1?: string | null;
    city?: string | null;
  } | null;
}

function fmt(amount: number | undefined, currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "BDT") return `৳${Math.round(amount ?? 0).toLocaleString("en-US")}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount ?? 0);
}

function mapCart(cart: RawCart): CartView {
  const currency = cart.currency_code ?? "usd";
  const items: CartLine[] = (cart.items ?? []).map((it) => ({
    id: it.id,
    title: it.product_title ?? it.title ?? "Item",
    option: it.variant_title ?? undefined,
    quantity: it.quantity,
    unitPrice: fmt(it.unit_price, currency),
    lineTotal: fmt(it.total ?? it.unit_price * it.quantity, currency),
    thumbnail: it.thumbnail ?? undefined,
    handle: it.product_handle ?? it.product?.handle ?? undefined,
  }));
  return {
    id: cart.id,
    email: cart.email ?? undefined,
    currency,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    items,
    subtotal: fmt(cart.subtotal, currency),
    shippingTotal: fmt(cart.shipping_total, currency),
    discountTotal: fmt(cart.discount_total, currency),
    hasDiscount: (cart.discount_total ?? 0) > 0,
    promoCodes: (cart.promotions ?? []).map((p) => p.code).filter((c): c is string => !!c),
    total: fmt(cart.total, currency),
    hasShipping: (cart.shipping_methods ?? []).length > 0,
  };
}

const CART_FIELDS =
  "fields=*items,*items.product,*items.variant,*shipping_methods,*shipping_address,*billing_address,*promotions";

// --- Operations -------------------------------------------------------------

export async function createCart(): Promise<string> {
  const regionId = await getRegionId();
  const { cart } = await api<{ cart: RawCart }>("/store/carts", {
    method: "POST",
    body: JSON.stringify({ region_id: regionId }),
  });
  return cart.id;
}

export async function getCart(id: string): Promise<CartView | null> {
  try {
    const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}?${CART_FIELDS}`);
    return mapCart(cart);
  } catch {
    return null; // cart expired / not found
  }
}

export async function addLineItem(id: string, variantId: string, quantity: number): Promise<CartView> {
  const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  });
  return mapCart(cart);
}

export async function updateLineItem(id: string, lineId: string, quantity: number): Promise<CartView> {
  const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}/line-items/${lineId}`, {
    method: "POST",
    body: JSON.stringify({ quantity }),
  });
  return mapCart(cart);
}

export async function removeLineItem(id: string, lineId: string): Promise<CartView | null> {
  await api(`/store/carts/${id}/line-items/${lineId}`, { method: "DELETE" });
  return getCart(id);
}

export interface AddressInput {
  first_name: string;
  last_name: string;
  address_1: string;
  city: string;
  postal_code: string;
  country_code: string;
  phone?: string;
}

export async function setCartCustomer(
  id: string,
  email: string,
  address: AddressInput,
): Promise<CartView> {
  const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}`, {
    method: "POST",
    body: JSON.stringify({ email, shipping_address: address, billing_address: address }),
  });
  return mapCart(cart);
}

export async function listShippingOptions(id: string): Promise<ShippingOptionView[]> {
  const data = await api<{ shipping_options: { id: string; name: string; amount?: number | null }[] }>(
    `/store/shipping-options?cart_id=${id}`,
  );
  // Only options that have a usable price in the cart's currency (skips options
  // from other regions/zones that aren't priced for this cart).
  return data.shipping_options
    .filter((o) => typeof o.amount === "number")
    .map((o) => ({ id: o.id, name: o.name, amount: fmt(o.amount as number, "bdt") }));
}

export async function applyPromotion(id: string, code: string): Promise<CartView> {
  const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}/promotions`, {
    method: "POST",
    body: JSON.stringify({ promo_codes: [code] }),
  });
  return mapCart(cart);
}

export async function removePromotion(id: string, code: string): Promise<CartView> {
  const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}/promotions`, {
    method: "DELETE",
    body: JSON.stringify({ promo_codes: [code] }),
  });
  return mapCart(cart);
}

export async function addShippingMethod(id: string, optionId: string): Promise<CartView> {
  const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}/shipping-methods`, {
    method: "POST",
    body: JSON.stringify({ option_id: optionId }),
  });
  return mapCart(cart);
}

/** Tag the cart with the chosen payment method (carried onto the order). */
/** Raw amounts + customer details a payment gateway needs (formatted CartView hides them). */
export interface CartPaymentInfo {
  id: string;
  amount: number;
  currency: string;
  email: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  itemCount: number;
}

export async function getCartPaymentInfo(id: string): Promise<CartPaymentInfo | null> {
  try {
    const { cart } = await api<{ cart: RawCart }>(`/store/carts/${id}?${CART_FIELDS}`);
    const addr = cart.shipping_address;
    return {
      id: cart.id,
      amount: cart.total ?? 0,
      currency: cart.currency_code.toUpperCase(),
      email: cart.email ?? "",
      name: [addr?.first_name, addr?.last_name].filter(Boolean).join(" ") || "Customer",
      phone: addr?.phone ?? "",
      address: addr?.address_1 ?? "",
      city: addr?.city ?? "",
      itemCount: (cart.items ?? []).reduce((n, i) => n + i.quantity, 0),
    };
  } catch {
    return null;
  }
}

export async function setCartMetadata(id: string, metadata: Record<string, unknown>): Promise<void> {
  await api(`/store/carts/${id}`, { method: "POST", body: JSON.stringify({ metadata }) });
}

/** Create a payment collection + session with the manual provider. */
export async function initPayment(id: string): Promise<void> {
  const { payment_collection } = await api<{ payment_collection: { id: string } }>(
    "/store/payment-collections",
    { method: "POST", body: JSON.stringify({ cart_id: id }) },
  );
  await api(`/store/payment-collections/${payment_collection.id}/payment-sessions`, {
    method: "POST",
    body: JSON.stringify({ provider_id: PAYMENT_PROVIDER }),
  });
}

export async function completeCart(
  id: string,
): Promise<{ ok: true; order: CompletedOrder } | { ok: false; error: string }> {
  const data = await api<{
    type: "order" | "cart";
    order?: { id: string; display_id: number; email: string; total: number; currency_code: string };
    error?: { message?: string };
  }>(`/store/carts/${id}/complete`, { method: "POST" });

  if (data.type === "order" && data.order) {
    return {
      ok: true,
      order: {
        id: data.order.id,
        displayId: data.order.display_id,
        email: data.order.email,
        total: fmt(data.order.total, data.order.currency_code),
        currency: data.order.currency_code,
      },
    };
  }
  return { ok: false, error: data.error?.message ?? "Could not complete the order" };
}
