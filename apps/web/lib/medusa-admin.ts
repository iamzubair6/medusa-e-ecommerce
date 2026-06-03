import "server-only";
import type { OrderTracking, TrackingFulfillment } from "./tracking-types";
import type { AdminOrderSummary, AdminOrderDetail } from "./admin-types";

export type { OrderTracking } from "./tracking-types";
export type { AdminOrderSummary, AdminOrderDetail } from "./admin-types";

/**
 * Server-only Medusa Admin API client. Uses a secret API key (Basic auth) and
 * must never be reachable from the browser. Currently used only for order lookup
 * by the parcel tracker.
 */

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const SK = process.env.MEDUSA_ADMIN_API_KEY;

/** The store's selling currency. Used to report revenue without mixing currencies. */
const STORE_CURRENCY = "bdt";

export function adminConfigured(): boolean {
  return Boolean(BACKEND && SK);
}

async function adminFetch<T>(path: string): Promise<T | null> {
  if (!adminConfigured()) return null;
  const basic = Buffer.from(`${SK}:`).toString("base64");
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      headers: { Authorization: `Basic ${basic}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface RawFulfillment {
  packed_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  labels?: { tracking_number?: string | null; tracking_url?: string | null }[];
}

interface RawOrder {
  display_id: number;
  email: string;
  created_at: string;
  payment_status: string;
  fulfillment_status: string;
  total: number;
  currency_code: string;
  items?: { title?: string; product_title?: string; quantity: number; thumbnail?: string | null }[];
  fulfillments?: RawFulfillment[];
}

const ORDER_FIELDS = [
  "display_id",
  "email",
  "created_at",
  "payment_status",
  "fulfillment_status",
  "total",
  "currency_code",
  "*items",
  "*fulfillments",
  "*fulfillments.labels",
].join(",");

function mapTracking(o: RawOrder): OrderTracking {
  const cur = (o.currency_code ?? "usd").toUpperCase();
  const fmt = {
    format: (amount: number) =>
      cur === "BDT"
        ? `৳${Math.round(amount).toLocaleString("en-US")}`
        : new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount),
  };
  const fulfillments: TrackingFulfillment[] = (o.fulfillments ?? []).map((f) => ({
    packedAt: f.packed_at ?? undefined,
    shippedAt: f.shipped_at ?? undefined,
    deliveredAt: f.delivered_at ?? undefined,
    trackingNumbers: (f.labels ?? [])
      .filter((l) => l.tracking_number)
      .map((l) => ({ number: l.tracking_number as string, url: l.tracking_url ?? undefined })),
  }));
  return {
    displayId: o.display_id,
    placedAt: o.created_at,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    total: fmt.format(o.total ?? 0),
    items: (o.items ?? []).map((i) => ({
      title: i.product_title ?? i.title ?? "Item",
      quantity: i.quantity,
      thumbnail: i.thumbnail ?? undefined,
    })),
    fulfillments,
  };
}

/**
 * Look up an order by its number + email. Both must match (email checked exactly,
 * case-insensitively) — this is the only credential the tracker requires.
 * Returns null when not found / mismatched (never reveals which one was wrong).
 */
export async function getOrderTracking(
  displayId: number,
  email: string,
): Promise<OrderTracking | null> {
  const data = await adminFetch<{ orders?: RawOrder[] }>(
    `/admin/orders?q=${encodeURIComponent(email)}&fields=${encodeURIComponent(ORDER_FIELDS)}&limit=20`,
  );
  const match = data?.orders?.find(
    (o) => o.display_id === displayId && o.email.toLowerCase() === email.toLowerCase(),
  );
  return match ? mapTracking(match) : null;
}

// --- Product creation (CMS admin "New product" form) ------------------------

function basicAuth(): string {
  return Buffer.from(`${SK}:`).toString("base64");
}

async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Medusa ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

async function adminDelete(path: string): Promise<void> {
  const res = await fetch(`${BACKEND}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Basic ${basicAuth()}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Medusa ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/** Sales channel + shipping profile needed to create a product. */
async function getCreateContext(): Promise<{ salesChannelId?: string; shippingProfileId?: string }> {
  const sc = await adminFetch<{ sales_channels?: { id: string }[] }>("/admin/sales-channels?limit=1");
  const sp = await adminFetch<{ shipping_profiles?: { id: string }[] }>("/admin/shipping-profiles?limit=1");
  return { salesChannelId: sc?.sales_channels?.[0]?.id, shippingProfileId: sp?.shipping_profiles?.[0]?.id };
}

export interface NewProductColor {
  name: string;
  swatch: string;
  price: number; // BDT
  originalPrice?: number;
  images: string[];
  sizes: { size: string; stock: number }[];
}
export interface NewProductInput {
  title: string;
  description?: string;
  colors: NewProductColor[];
  offer?: { type: "bogo" | "discount"; label: string; percent?: number };
  categoryIds?: string[];
}

export interface AdminCategoryOption {
  id: string;
  name: string;
}

/** Active product categories for the product form's category picker. */
export async function listCategories(): Promise<AdminCategoryOption[]> {
  const data = await adminFetch<{ product_categories?: { id: string; name: string }[] }>(
    "/admin/product-categories?fields=id,name&limit=100",
  );
  return (data?.product_categories ?? []).map((c) => ({ id: c.id, name: c.name }));
}

/** Variant key used to reconcile colour×size combinations across edits. */
const variantKey = (size: string, color: string) => `${size}::${color}`;
const variantSku = (handle: string, color: string, size: string) =>
  `${handle}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");

/** The metadata blob the storefront reads (swatches, per-colour images/prices/stock, offer). */
function buildMetadata(input: NewProductInput) {
  return {
    swatches: Object.fromEntries(input.colors.map((c) => [c.name, c.swatch])),
    colorImages: Object.fromEntries(input.colors.map((c) => [c.name, c.images])),
    colorPrices: Object.fromEntries(input.colors.map((c) => [c.name, c.price])),
    colorOriginalPrices: Object.fromEntries(
      input.colors.filter((c) => c.originalPrice).map((c) => [c.name, c.originalPrice]),
    ),
    sizeStock: Object.fromEntries(
      input.colors.map((c) => [c.name, Object.fromEntries(c.sizes.map((s) => [s.size, s.stock]))]),
    ),
    ...(input.offer ? { offer: input.offer } : {}),
  };
}

/** Create a Medusa product (variants + BDT prices + metadata) from the form. */
export async function createProduct(input: NewProductInput): Promise<{ id: string; handle: string }> {
  const { salesChannelId, shippingProfileId } = await getCreateContext();
  const handle = slugify(input.title) || `product-${Date.now()}`;
  const colorNames = input.colors.map((c) => c.name);
  const sizeSet = [...new Set(input.colors.flatMap((c) => c.sizes.map((s) => s.size)))];
  const images = [...new Set(input.colors.flatMap((c) => c.images))];

  const variants = input.colors.flatMap((c) =>
    c.sizes.map((s) => ({
      title: `${s.size} / ${c.name}`,
      sku: variantSku(handle, c.name, s.size),
      manage_inventory: false, // always purchasable; stock display comes from metadata
      options: { Size: s.size, Color: c.name },
      prices: [{ amount: c.price, currency_code: "bdt" }],
    })),
  );

  const { product } = await adminPost<{ product: { id: string; handle: string } }>("/admin/products", {
    title: input.title,
    handle,
    description: input.description ?? "",
    status: "published",
    ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
    ...(images[0] ? { thumbnail: images[0] } : {}),
    images: images.map((url) => ({ url })),
    options: [
      { title: "Size", values: sizeSet },
      { title: "Color", values: colorNames },
    ],
    variants,
    ...(salesChannelId ? { sales_channels: [{ id: salesChannelId }] } : {}),
    ...(input.categoryIds?.length ? { category_ids: input.categoryIds } : {}),
    metadata: buildMetadata(input),
  });
  return product;
}

// --- Product edit / delete / publish ----------------------------------------

interface RawAdminVariant {
  id: string;
  prices?: { amount: number; currency_code: string }[];
  options?: { option_id?: string; value: string }[];
}
interface RawAdminProduct {
  id: string;
  title: string;
  handle: string;
  description?: string | null;
  status: string;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
  options?: { id: string; title: string }[];
  variants?: RawAdminVariant[];
  categories?: { id: string }[];
}

export interface AdminProductListItem {
  id: string;
  title: string;
  handle: string;
  status: string;
  thumbnail?: string;
  price: string;
}

/** All products (any status) for the admin list — bypasses the storefront price filter. */
export async function listAdminProducts(limit = 100): Promise<AdminProductListItem[]> {
  const fields = "id,title,handle,status,thumbnail,*variants.prices";
  const data = await adminFetch<{ products?: RawAdminProduct[] }>(
    `/admin/products?fields=${encodeURIComponent(fields)}&order=-created_at&limit=${limit}`,
  );
  return (data?.products ?? []).map((p) => {
    const amounts = (p.variants ?? [])
      .map((v) => v.prices?.find((pr) => pr.currency_code === "bdt")?.amount)
      .filter((a): a is number => typeof a === "number");
    return {
      id: p.id,
      title: p.title,
      handle: p.handle,
      status: p.status,
      thumbnail: p.thumbnail ?? undefined,
      price: amounts.length ? money(Math.min(...amounts), "bdt") : "—",
    };
  });
}

export interface ProductFormData extends NewProductInput {
  id: string;
  status: string;
}

/** Reconstruct the product-creator form shape from variants (truth) + metadata (enrichment). */
export async function getProductForEdit(id: string): Promise<ProductFormData | null> {
  const fields =
    "id,title,handle,description,status,thumbnail,metadata,*options,*variants,*variants.prices,*variants.options,categories.id";
  const data = await adminFetch<{ product?: RawAdminProduct }>(
    `/admin/products/${id}?fields=${encodeURIComponent(fields)}`,
  );
  const p = data?.product;
  if (!p) return null;

  const meta = (p.metadata ?? {}) as {
    swatches?: Record<string, string>;
    colorImages?: Record<string, string[]>;
    colorPrices?: Record<string, number>;
    colorOriginalPrices?: Record<string, number>;
    sizeStock?: Record<string, Record<string, number>>;
    offer?: { type: "bogo" | "discount"; label: string; percent?: number };
  };
  const titleByOptionId = new Map((p.options ?? []).map((o) => [o.id, o.title]));

  // color name -> { sizes(size->stock), price }
  const colorOrder: string[] = [];
  const sizesByColor = new Map<string, Map<string, number>>();
  const priceByColor = new Map<string, number>();
  for (const v of p.variants ?? []) {
    let size = "";
    let color = "";
    for (const ov of v.options ?? []) {
      const t = ov.option_id ? titleByOptionId.get(ov.option_id) : undefined;
      if (t === "Size") size = ov.value;
      else if (t === "Color") color = ov.value;
    }
    if (!color || !size) continue;
    if (!sizesByColor.has(color)) {
      sizesByColor.set(color, new Map());
      colorOrder.push(color);
    }
    const stock = meta.sizeStock?.[color]?.[size] ?? 10;
    sizesByColor.get(color)!.set(size, stock);
    const bdt = v.prices?.find((pr) => pr.currency_code === "bdt")?.amount;
    if (typeof bdt === "number") priceByColor.set(color, bdt);
  }

  const colors: NewProductColor[] = colorOrder.map((name) => ({
    name,
    swatch: meta.swatches?.[name] ?? "#1b1b1b",
    price: priceByColor.get(name) ?? meta.colorPrices?.[name] ?? 0,
    originalPrice: meta.colorOriginalPrices?.[name],
    images: meta.colorImages?.[name] ?? [],
    sizes: [...sizesByColor.get(name)!.entries()].map(([size, stock]) => ({ size, stock })),
  }));

  return {
    id: p.id,
    status: p.status,
    title: p.title,
    description: p.description ?? "",
    offer: meta.offer,
    colors,
    categoryIds: (p.categories ?? []).map((c) => c.id),
  };
}

/** Full replace of a product's variants/prices/options/images/metadata from the form. */
export async function updateProduct(id: string, input: NewProductInput): Promise<void> {
  const fields = "id,handle,*options,*options.values,*variants,*variants.options";
  const data = await adminFetch<{
    product?: {
      handle: string;
      options?: { id: string; title: string }[];
      variants?: { id: string; options?: { option_id?: string; value: string }[] }[];
    };
  }>(`/admin/products/${id}?fields=${encodeURIComponent(fields)}`);
  const existing = data?.product;
  if (!existing) throw new Error("Product not found");

  const handle = existing.handle;
  const sizeSet = [...new Set(input.colors.flatMap((c) => c.sizes.map((s) => s.size)))];
  const colorNames = input.colors.map((c) => c.name);
  const titleByOptionId = new Map((existing.options ?? []).map((o) => [o.id, o.title]));
  const sizeOption = existing.options?.find((o) => o.title === "Size");
  const colorOption = existing.options?.find((o) => o.title === "Color");

  // 1. Widen option value lists first so new variants can reference them.
  if (sizeOption) await adminPost(`/admin/products/${id}/options/${sizeOption.id}`, { title: "Size", values: sizeSet });
  if (colorOption) await adminPost(`/admin/products/${id}/options/${colorOption.id}`, { title: "Color", values: colorNames });

  // 2. Reconcile variants by colour×size key.
  const existingByKey = new Map<string, string>(); // key -> variant id
  for (const v of existing.variants ?? []) {
    let size = "";
    let color = "";
    for (const ov of v.options ?? []) {
      const t = ov.option_id ? titleByOptionId.get(ov.option_id) : undefined;
      if (t === "Size") size = ov.value;
      else if (t === "Color") color = ov.value;
    }
    if (size && color) existingByKey.set(variantKey(size, color), v.id);
  }

  const desired = input.colors.flatMap((c) =>
    c.sizes.map((s) => ({ size: s.size, color: c.name, price: c.price })),
  );
  const desiredKeys = new Set(desired.map((d) => variantKey(d.size, d.color)));

  // create new + update price on existing
  for (const d of desired) {
    const key = variantKey(d.size, d.color);
    const vid = existingByKey.get(key);
    if (vid) {
      await adminPost(`/admin/products/${id}/variants/${vid}`, {
        prices: [{ amount: d.price, currency_code: "bdt" }],
      });
    } else {
      await adminPost(`/admin/products/${id}/variants`, {
        title: `${d.size} / ${d.color}`,
        sku: variantSku(handle, d.color, d.size),
        manage_inventory: false,
        options: { Size: d.size, Color: d.color },
        prices: [{ amount: d.price, currency_code: "bdt" }],
      });
    }
  }
  // delete variants no longer wanted
  for (const [key, vid] of existingByKey) {
    if (!desiredKeys.has(key)) await adminDelete(`/admin/products/${id}/variants/${vid}`);
  }

  // 3. Update basics, images, metadata.
  const images = [...new Set(input.colors.flatMap((c) => c.images))];
  await adminPost(`/admin/products/${id}`, {
    title: input.title,
    description: input.description ?? "",
    ...(images[0] ? { thumbnail: images[0] } : {}),
    images: images.map((url) => ({ url })),
    ...(input.categoryIds ? { category_ids: input.categoryIds } : {}),
    metadata: buildMetadata(input),
  });
}

export async function setProductStatus(id: string, status: "published" | "draft"): Promise<void> {
  await adminPost(`/admin/products/${id}`, { status });
}

export async function deleteProduct(id: string): Promise<void> {
  await adminDelete(`/admin/products/${id}`);
}

/** Proxy a multipart upload to Medusa's file service; returns the hosted URLs. */
export async function uploadFiles(form: FormData): Promise<string[]> {
  const res = await fetch(`${BACKEND}/admin/uploads`, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth()}` },
    body: form,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = (await res.json()) as { files?: { url: string }[] };
  return (data.files ?? []).map((f) => f.url);
}

// --- Orders -----------------------------------------------------------------

function money(amount: number | undefined, currency?: string): string {
  const cur = (currency ?? "bdt").toUpperCase();
  if (cur === "BDT") return `৳${Math.round(amount ?? 0).toLocaleString("en-US")}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount ?? 0);
}

interface RawOrderListItem {
  id: string;
  display_id: number;
  email: string;
  currency_code: string;
  total: number;
  payment_status: string;
  fulfillment_status: string;
  created_at: string;
  metadata?: { payment_method?: string } | null;
  items?: { id: string }[];
}

export async function listOrders(
  limit = 50,
  offset = 0,
): Promise<{ orders: AdminOrderSummary[]; count: number }> {
  const fields =
    "id,display_id,email,currency_code,total,payment_status,fulfillment_status,created_at,metadata,items.id";
  const data = await adminFetch<{ orders?: RawOrderListItem[]; count?: number }>(
    `/admin/orders?fields=${encodeURIComponent(fields)}&order=-created_at&limit=${limit}&offset=${offset}`,
  );
  const orders = (data?.orders ?? []).map((o) => ({
    id: o.id,
    displayId: o.display_id,
    email: o.email,
    total: money(o.total, o.currency_code),
    createdAt: o.created_at,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    paymentMethod: o.metadata?.payment_method,
    itemCount: (o.items ?? []).length,
  }));
  return { orders, count: data?.count ?? orders.length };
}

interface RawOrderFull extends RawOrderListItem {
  subtotal?: number;
  shipping_total?: number;
  items?: {
    id: string;
    title?: string;
    product_title?: string;
    variant_title?: string;
    quantity: number;
    total?: number;
    thumbnail?: string | null;
  }[];
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    address_1?: string;
    city?: string;
    postal_code?: string;
    country_code?: string;
    phone?: string;
  } | null;
  fulfillments?: {
    id: string;
    shipped_at?: string | null;
    delivered_at?: string | null;
    labels?: { tracking_number?: string | null }[];
  }[];
}

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const fields =
    "id,display_id,email,currency_code,total,subtotal,shipping_total,payment_status,fulfillment_status,created_at,metadata,*items,*shipping_address,*fulfillments,*fulfillments.labels,fulfillments.delivered_at";
  const data = await adminFetch<{ order?: RawOrderFull }>(
    `/admin/orders/${id}?fields=${encodeURIComponent(fields)}`,
  );
  const o = data?.order;
  if (!o) return null;
  const cur = o.currency_code;
  return {
    id: o.id,
    displayId: o.display_id,
    email: o.email,
    total: money(o.total, cur),
    subtotal: money(o.subtotal, cur),
    shippingTotal: money(o.shipping_total, cur),
    createdAt: o.created_at,
    paymentStatus: o.payment_status,
    fulfillmentStatus: o.fulfillment_status,
    paymentMethod: o.metadata?.payment_method,
    itemCount: (o.items ?? []).length,
    items: (o.items ?? []).map((i) => ({
      id: i.id,
      title: i.product_title ?? i.title ?? "Item",
      variant: i.variant_title ?? undefined,
      quantity: i.quantity,
      total: money(i.total, cur),
      thumbnail: i.thumbnail ?? undefined,
    })),
    address: o.shipping_address
      ? {
          name: `${o.shipping_address.first_name ?? ""} ${o.shipping_address.last_name ?? ""}`.trim(),
          line1: o.shipping_address.address_1 ?? undefined,
          city: o.shipping_address.city ?? undefined,
          postalCode: o.shipping_address.postal_code ?? undefined,
          country: o.shipping_address.country_code?.toUpperCase(),
          phone: o.shipping_address.phone ?? undefined,
        }
      : undefined,
    fulfillments: (o.fulfillments ?? []).map((f) => ({
      id: f.id,
      shippedAt: f.shipped_at ?? undefined,
      deliveredAt: f.delivered_at ?? undefined,
      trackingNumbers: (f.labels ?? []).map((l) => l.tracking_number).filter((t): t is string => !!t),
    })),
    fulfilled: o.fulfillment_status !== "not_fulfilled",
  };
}

async function orderLineItems(id: string): Promise<{ id: string; quantity: number }[]> {
  const data = await adminFetch<{ order?: { items?: { id: string; quantity: number }[] } }>(
    `/admin/orders/${id}?fields=items.id,items.quantity`,
  );
  return (data?.order?.items ?? []).map((i) => ({ id: i.id, quantity: i.quantity }));
}

/** Create a fulfillment for all items in the order. */
export async function fulfillOrder(id: string): Promise<void> {
  const items = await orderLineItems(id);
  await adminPost(`/admin/orders/${id}/fulfillments`, { items });
}

/** Mark a fulfillment shipped with a tracking number. */
export async function shipOrder(id: string, trackingNumber: string, trackingUrl?: string): Promise<void> {
  const detail = await getOrderDetail(id);
  const fulfillment = detail?.fulfillments[0];
  if (!fulfillment) throw new Error("Create a fulfillment first.");
  const items = await orderLineItems(id);
  await adminPost(`/admin/orders/${id}/fulfillments/${fulfillment.id}/shipments`, {
    items,
    labels: [{ tracking_number: trackingNumber, tracking_url: trackingUrl ?? "", label_url: "" }],
  });
}

/** Mark an order's fulfillment delivered — closes the COD loop (cash collected). */
export async function markDelivered(id: string): Promise<void> {
  const detail = await getOrderDetail(id);
  const fulfillment = detail?.fulfillments[0];
  if (!fulfillment) throw new Error("Fulfil and ship the order first.");
  await adminPost(`/admin/orders/${id}/fulfillments/${fulfillment.id}/mark-as-delivered`, {});
}

export async function countOrders(): Promise<number> {
  const data = await adminFetch<{ count?: number }>("/admin/orders?fields=id&limit=1");
  return data?.count ?? 0;
}

// --- Promotions / discounts -------------------------------------------------

interface RawPromotion {
  id: string;
  code: string;
  status: string;
  type: string;
  application_method?: {
    type?: string; // "percentage" | "fixed"
    value?: number;
    currency_code?: string;
  } | null;
}

export interface AdminPromotionRow {
  id: string;
  code: string;
  status: string;
  type: string;
  valueType: string; // percentage | fixed
  display: string; // "10%" | "৳100 off"
}

export async function listPromotions(): Promise<AdminPromotionRow[]> {
  const fields = "id,code,status,type,*application_method";
  const data = await adminFetch<{ promotions?: RawPromotion[] }>(
    `/admin/promotions?fields=${encodeURIComponent(fields)}&limit=100`,
  );
  return (data?.promotions ?? []).map((p) => {
    const am = p.application_method;
    const valueType = am?.type ?? "percentage";
    const display =
      valueType === "percentage"
        ? `${am?.value ?? 0}%`
        : `${money(am?.value, am?.currency_code ?? "bdt")} off`;
    return { id: p.id, code: p.code, status: p.status, type: p.type, valueType, display };
  });
}

export interface NewPromotionInput {
  code: string;
  valueType: "percentage" | "fixed";
  value: number;
}

export async function createPromotion(input: NewPromotionInput): Promise<{ id: string }> {
  const { promotion } = await adminPost<{ promotion: { id: string } }>("/admin/promotions", {
    code: input.code,
    status: "active",
    type: "standard",
    application_method: {
      type: input.valueType,
      value: input.value,
      target_type: "order",
      allocation: "across",
      ...(input.valueType === "fixed" ? { currency_code: "bdt" } : {}),
    },
  });
  return promotion;
}

export async function setPromotionStatus(id: string, status: "active" | "inactive"): Promise<void> {
  await adminPost(`/admin/promotions/${id}`, { status });
}

export async function deletePromotion(id: string): Promise<void> {
  await adminDelete(`/admin/promotions/${id}`);
}

// --- Customers --------------------------------------------------------------

interface RawCustomer {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  created_at: string;
  orders?: { id: string }[];
}

export interface AdminCustomerRow {
  id: string;
  email: string;
  name: string;
  orders: number;
  createdAt: string;
}

export async function listCustomers(limit = 100): Promise<AdminCustomerRow[]> {
  const fields = "id,email,first_name,last_name,created_at,orders.id";
  const data = await adminFetch<{ customers?: RawCustomer[] }>(
    `/admin/customers?fields=${encodeURIComponent(fields)}&order=-created_at&limit=${limit}`,
  );
  return (data?.customers ?? []).map((c) => ({
    id: c.id,
    email: c.email,
    name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—",
    orders: (c.orders ?? []).length,
    createdAt: c.created_at,
  }));
}

// --- Dashboard stats --------------------------------------------------------

export interface AdminDashboardStats {
  revenue: string;
  orders: number;
  products: number;
  customers: number;
  pendingFulfilment: number;
}

async function countResource(path: string): Promise<number> {
  const data = await adminFetch<{ count?: number }>(path);
  return data?.count ?? 0;
}

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  const ordersData = await adminFetch<{
    orders?: { total: number; currency_code: string; fulfillment_status: string }[];
    count?: number;
  }>("/admin/orders?fields=total,currency_code,fulfillment_status&limit=1000&order=-created_at");
  const orders = ordersData?.orders ?? [];
  // Revenue is reported in the store currency (BDT); foreign demo orders in other
  // currencies are excluded so totals are never mixed across currencies.
  const revenue = orders
    .filter((o) => o.currency_code === STORE_CURRENCY)
    .reduce((sum, o) => sum + (o.total ?? 0), 0);
  const pendingFulfilment = orders.filter((o) => o.fulfillment_status === "not_fulfilled").length;

  const [products, customers] = await Promise.all([
    countResource("/admin/products?fields=id&limit=1"),
    countResource("/admin/customers?fields=id&limit=1"),
  ]);

  return {
    revenue: money(revenue, STORE_CURRENCY),
    orders: ordersData?.count ?? orders.length,
    products,
    customers,
    pendingFulfilment,
  };
}
