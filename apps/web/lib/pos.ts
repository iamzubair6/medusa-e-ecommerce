import "server-only";
import { z } from "zod";
import { adminFetch, adminPost } from "./medusa-admin";
import { decrementSizeStock, type StockLine } from "./stock";

/**
 * POS domain layer: counter search, oversell check and the draft-order
 * checkout. Everything runs against the Medusa Admin API (live truth — no
 * storefront cache), so the counter always sees current stock.
 */

/** Walk-in sales still need an order email (Medusa requires one). */
export const POS_WALK_IN_EMAIL = "walkin@pos.maison.local";

// --- Counter search ---------------------------------------------------------

export type {
  PosColor,
  PosCustomerMatch,
  PosProduct,
  PosSaleLine,
  PosSize,
  OversellWarning,
} from "./pos-types";
import type {
  PosColor,
  PosCustomerMatch,
  PosProduct,
  PosSaleLine,
  OversellWarning,
} from "./pos-types";

const sizeStockSchema = z.record(z.string(), z.record(z.string(), z.number()));
const stringMapSchema = z.record(z.string(), z.string());
const numberMapSchema = z.record(z.string(), z.number());

interface RawPosVariant {
  id: string;
  title?: string | null;
  sku?: string | null;
  prices?: { amount: number; currency_code: string }[];
}
interface RawPosProduct {
  id: string;
  title: string;
  handle: string;
  status?: string;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
  variants?: RawPosVariant[] | null;
}

function parseMap<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

/** "{size} / {color}" → [size, color] (sizes never contain the separator). */
function splitVariantTitle(title: string): [string, string] | null {
  const sep = title.indexOf(" / ");
  return sep === -1 ? null : [title.slice(0, sep), title.slice(sep + 3)];
}

function toPosProduct(p: RawPosProduct): PosProduct {
  const meta = p.metadata ?? {};
  const swatches = parseMap(stringMapSchema, meta.swatches, {});
  const colorPrices = parseMap(numberMapSchema, meta.colorPrices, {});
  const sizeStock = parseMap(sizeStockSchema, meta.sizeStock, {});

  const colors = new Map<string, PosColor>();
  for (const v of p.variants ?? []) {
    const parts = splitVariantTitle(v.title ?? "");
    if (!parts) continue;
    const [size, colorName] = parts;
    const bdt = v.prices?.find((pr) => pr.currency_code === "bdt")?.amount;
    const color = colors.get(colorName) ?? {
      name: colorName,
      swatch: swatches[colorName],
      price: colorPrices[colorName] ?? bdt ?? 0,
      sizes: [],
    };
    color.sizes.push({
      size,
      stock: sizeStock[colorName]?.[size] ?? null,
      variantId: v.id,
      sku: v.sku ?? undefined,
    });
    colors.set(colorName, color);
  }
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail ?? undefined,
    colors: [...colors.values()],
  };
}

/**
 * Title/SKU search for the counter (a barcode scanner types the SKU + Enter,
 * so the same query path covers scanning). Live admin data, published only.
 */
export async function posSearchProducts(q: string, limit = 24): Promise<PosProduct[]> {
  const fields = "id,title,handle,status,thumbnail,metadata,*variants,*variants.prices";
  const data = await adminFetch<{ products?: RawPosProduct[] }>(
    `/admin/products?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&limit=${limit}`,
  );
  return (data?.products ?? []).filter((p) => p.status === "published").map(toPosProduct);
}

// --- Checkout ---------------------------------------------------------------

export interface PosCheckoutInput {
  lines: PosSaleLine[];
  payment: { method: "cash" | "bkash" | "nagad"; txnId?: string };
  promoCodes?: string[];
  /** ADMIN-only — the route enforces the role before passing it through. */
  manualDiscountPct?: number;
  customer?: { customerId?: string; email?: string; phone?: string };
  cashier: { email: string; name: string };
  /** Complete even when the oversell check finds shortfalls (staff hold the item). */
  force?: boolean;
}

export type PosCheckoutResult =
  | {
      ok: true;
      orderId: string;
      displayId: number;
      total: number;
      discountTotal: number;
      currency: string;
    }
  | { ok: false; status: number; error: string; warnings?: OversellWarning[] };

let regionCache: { id: string; currency: string } | null = null;
async function getPosRegion(): Promise<{ id: string; currency: string } | null> {
  if (regionCache) return regionCache;
  const data = await adminFetch<{ regions?: { id: string; currency_code: string }[] }>(
    "/admin/regions?limit=1&fields=id,currency_code",
  );
  const region = data?.regions?.[0];
  if (!region) return null;
  regionCache = { id: region.id, currency: region.currency_code };
  return regionCache;
}

interface ProductPricing {
  title: string;
  colorPrices: Record<string, number>;
  sizeStock: z.infer<typeof sizeStockSchema>;
}

async function readProductPricing(productId: string): Promise<ProductPricing | null> {
  const data = await adminFetch<{
    product?: { title?: string; metadata?: Record<string, unknown> | null };
  }>(`/admin/products/${productId}?fields=title,metadata`);
  if (!data?.product) return null;
  const meta = data.product.metadata ?? {};
  return {
    title: data.product.title ?? "Item",
    colorPrices: parseMap(numberMapSchema, meta.colorPrices, {}),
    sizeStock: parseMap(sizeStockSchema, meta.sizeStock, {}),
  };
}

/**
 * Complete a counter sale: oversell re-check → draft order → convert to a real
 * order (shared MSN- sequence) → decrement shared sizeStock.
 */
export async function posCheckout(input: PosCheckoutInput): Promise<PosCheckoutResult> {
  if (input.lines.length === 0) return { ok: false, status: 422, error: "The cart is empty." };
  const region = await getPosRegion();
  if (!region) return { ok: false, status: 502, error: "Commerce backend is unreachable." };

  // One live read per product feeds BOTH the oversell check and manual pricing.
  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const pricing = new Map<string, ProductPricing>();
  for (const id of productIds) {
    const p = await readProductPricing(id);
    if (p) pricing.set(id, p);
  }

  // Oversell guard: warn (never block) — the customer is holding the item.
  if (!input.force) {
    const warnings: OversellWarning[] = [];
    for (const line of input.lines) {
      const available = pricing.get(line.productId)?.sizeStock[line.color]?.[line.size];
      if (available !== undefined && available < line.quantity) {
        warnings.push({
          title: line.title,
          color: line.color,
          size: line.size,
          requested: line.quantity,
          available,
        });
      }
    }
    if (warnings.length > 0) {
      return { ok: false, status: 409, error: "Stock is lower than the cart.", warnings };
    }
  }

  const pct = input.manualDiscountPct;
  const items = input.lines.map((line) => {
    const base = pricing.get(line.productId)?.colorPrices[line.color];
    // Manual % discount = per-line unit_price override; otherwise Medusa
    // prices the variant itself (single source of truth).
    const discounted =
      pct && base !== undefined ? Math.round((base * (100 - pct)) / 100) : undefined;
    return {
      variant_id: line.variantId,
      quantity: line.quantity,
      ...(discounted !== undefined ? { unit_price: discounted } : {}),
    };
  });

  const sc = await adminFetch<{ sales_channels?: { id: string }[] }>("/admin/sales-channels?limit=1");
  const salesChannelId = sc?.sales_channels?.[0]?.id;

  try {
    const created = await adminPost<{ draft_order: { id: string } }>("/admin/draft-orders", {
      region_id: region.id,
      currency_code: region.currency,
      // An attached customer owns the order (their stored email applies);
      // otherwise Medusa requires an email, so walk-ins get the placeholder.
      ...(input.customer?.customerId
        ? { customer_id: input.customer.customerId }
        : { email: input.customer?.email ?? POS_WALK_IN_EMAIL }),
      ...(salesChannelId ? { sales_channel_id: salesChannelId } : {}),
      items,
      ...(input.promoCodes?.length ? { promo_codes: input.promoCodes } : {}),
      no_notification_order: true,
      metadata: {
        channel: "pos",
        payment_method: `pos_${input.payment.method}`,
        ...(input.payment.txnId ? { pos_txn_id: input.payment.txnId } : {}),
        pos_cashier: input.cashier.email,
        pos_cashier_name: input.cashier.name,
        ...(input.customer?.phone ? { pos_customer_phone: input.customer.phone } : {}),
        ...(pct ? { pos_manual_discount_pct: String(pct) } : {}),
      },
    });

    const converted = await adminPost<{ order: { id: string } }>(
      `/admin/draft-orders/${created.draft_order.id}/convert-to-order`,
      {},
    );

    const detail = await adminFetch<{
      order?: { display_id: number; total?: number; discount_total?: number; currency_code?: string };
    }>(`/admin/orders/${converted.order.id}?fields=display_id,total,discount_total,currency_code`);

    // The sale is final — decrement the shared stock (best-effort, never throws).
    await decrementSizeStock(
      input.lines.map(
        (l): StockLine => ({
          productId: l.productId,
          color: l.color,
          size: l.size,
          quantity: l.quantity,
        }),
      ),
    );

    return {
      ok: true,
      orderId: converted.order.id,
      displayId: detail?.order?.display_id ?? 0,
      total: detail?.order?.total ?? 0,
      discountTotal: detail?.order?.discount_total ?? 0,
      currency: detail?.order?.currency_code ?? region.currency,
    };
  } catch (error) {
    return { ok: false, status: 502, error: (error as Error).message };
  }
}

// --- Customer attach --------------------------------------------------------

/** Look up an existing customer by phone so the sale lands in their history. */
export async function posFindCustomerByPhone(phone: string): Promise<PosCustomerMatch | null> {
  const norm = (s: string) => s.replace(/\D+/g, "");
  const data = await adminFetch<{
    customers?: {
      id: string;
      email?: string | null;
      first_name?: string | null;
      last_name?: string | null;
      phone?: string | null;
    }[];
  }>(`/admin/customers?q=${encodeURIComponent(phone)}&fields=id,email,first_name,last_name,phone&limit=10`);
  const match = (data?.customers ?? []).find((c) => c.phone && norm(c.phone) === norm(phone));
  if (!match) return null;
  const synthetic = match.email?.endsWith("@phone.maison.local") ?? false;
  return {
    customerId: match.id,
    email: synthetic ? null : (match.email ?? null),
    name:
      `${match.first_name ?? ""} ${match.last_name ?? ""}`.trim() || match.phone || "Customer",
    phone: match.phone ?? null,
  };
}
