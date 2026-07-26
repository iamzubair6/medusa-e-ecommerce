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
  offer?: { type: "bogo" | "discount" | "custom"; label: string; percent?: number };
  categoryIds?: string[];
  tags?: string[];
  type?: string;
  division?: string;
  occasion?: string[];
  style?: string[];
  trend?: string[];
  sleeve?: string[];
  neckline?: string[];
  length?: string[];
  fabric?: string[];
  print?: string[];
  material?: string;
  care?: string;
  sizeGuide?: string;
  /** "Free delivery" badge on the PDP/card (informational). */
  freeDelivery?: boolean;
  /** Optional collection to file the product under (e.g. resolved from a handle on bulk import). */
  collectionId?: string;
}

/** Resolve free-text tag values → ids, creating any that don't exist yet. */
async function resolveTagIds(values: string[]): Promise<string[]> {
  const clean = [...new Set(values.map((v) => v.trim()).filter(Boolean))];
  if (!clean.length) return [];
  const data = await adminFetch<{ product_tags?: { id: string; value: string }[] }>(
    "/admin/product-tags?fields=id,value&limit=1000",
  );
  const byValue = new Map((data?.product_tags ?? []).map((t) => [t.value.toLowerCase(), t.id]));
  const ids: string[] = [];
  for (const value of clean) {
    const existing = byValue.get(value.toLowerCase());
    if (existing) ids.push(existing);
    else {
      const { product_tag } = await adminPost<{ product_tag: { id: string } }>("/admin/product-tags", { value });
      ids.push(product_tag.id);
    }
  }
  return ids;
}

/** Resolve a free-text type value → id, creating it if needed. */
async function resolveTypeId(value?: string): Promise<string | null> {
  const v = value?.trim();
  if (!v) return null;
  const data = await adminFetch<{ product_types?: { id: string; value: string }[] }>(
    "/admin/product-types?fields=id,value&limit=1000",
  );
  const existing = (data?.product_types ?? []).find((t) => t.value.toLowerCase() === v.toLowerCase());
  if (existing) return existing.id;
  const { product_type } = await adminPost<{ product_type: { id: string } }>("/admin/product-types", { value: v });
  return product_type.id;
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

/** Product collections (for promotion/price-list targeting). */
export async function listCollections(): Promise<AdminCategoryOption[]> {
  const data = await adminFetch<{ collections?: { id: string; title: string }[] }>(
    "/admin/collections?fields=id,title&limit=100",
  );
  return (data?.collections ?? []).map((c) => ({ id: c.id, name: c.title }));
}

// --- Category & collection management ---------------------------------------

export interface AdminCategoryFull {
  id: string;
  name: string;
  handle: string;
  isActive: boolean;
  products: number;
}
export interface AdminCollectionFull {
  id: string;
  title: string;
  handle: string;
  products: number;
}

export async function listCategoriesFull(): Promise<AdminCategoryFull[]> {
  const data = await adminFetch<{
    product_categories?: { id: string; name: string; handle: string; is_active?: boolean; products?: { id: string }[] }[];
  }>("/admin/product-categories?fields=id,name,handle,is_active,products.id&limit=200");
  return (data?.product_categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    isActive: c.is_active !== false,
    products: (c.products ?? []).length,
  }));
}

export async function createCategory(name: string): Promise<{ id: string }> {
  const { product_category } = await adminPost<{ product_category: { id: string } }>("/admin/product-categories", {
    name,
    is_active: true,
  });
  return product_category;
}

export async function updateCategory(id: string, patch: { name?: string; isActive?: boolean }): Promise<void> {
  await adminPost(`/admin/product-categories/${id}`, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.isActive !== undefined ? { is_active: patch.isActive } : {}),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await adminDelete(`/admin/product-categories/${id}`);
}

export async function listCollectionsFull(): Promise<AdminCollectionFull[]> {
  const data = await adminFetch<{
    collections?: { id: string; title: string; handle: string; products?: { id: string }[] }[];
  }>("/admin/collections?fields=id,title,handle,products.id&limit=200");
  return (data?.collections ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    handle: c.handle,
    products: (c.products ?? []).length,
  }));
}

export async function createCollection(title: string): Promise<{ id: string }> {
  const { collection } = await adminPost<{ collection: { id: string } }>("/admin/collections", { title });
  return collection;
}

export async function updateCollection(id: string, title: string): Promise<void> {
  await adminPost(`/admin/collections/${id}`, { title });
}

export async function deleteCollection(id: string): Promise<void> {
  await adminDelete(`/admin/collections/${id}`);
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
    ...(input.freeDelivery ? { freeDelivery: true } : {}),
    ...(input.division ? { division: input.division } : {}),
    ...(input.occasion?.length ? { occasion: input.occasion } : {}),
    ...(input.style?.length ? { style: input.style } : {}),
    ...(input.trend?.length ? { trend: input.trend } : {}),
    ...(input.sleeve?.length ? { sleeve: input.sleeve } : {}),
    ...(input.neckline?.length ? { neckline: input.neckline } : {}),
    ...(input.length?.length ? { length: input.length } : {}),
    ...(input.fabric?.length ? { fabric: input.fabric } : {}),
    ...(input.print?.length ? { print: input.print } : {}),
    ...(input.material ? { material: input.material } : {}),
    ...(input.care ? { care: input.care } : {}),
    ...(input.sizeGuide ? { sizeGuide: input.sizeGuide } : {}),
  };
}

/** Create a Medusa product (variants + BDT prices + metadata) from the form. */
export async function createProduct(input: NewProductInput): Promise<{ id: string; handle: string }> {
  const { salesChannelId, shippingProfileId } = await getCreateContext();
  const [tagIds, typeId] = await Promise.all([resolveTagIds(input.tags ?? []), resolveTypeId(input.type)]);
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
    ...(input.collectionId ? { collection_id: input.collectionId } : {}),
    ...(input.categoryIds?.length ? { categories: input.categoryIds.map((id) => ({ id })) } : {}),
    ...(tagIds.length ? { tags: tagIds.map((id) => ({ id })) } : {}),
    ...(typeId ? { type_id: typeId } : {}),
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
  tags?: { value: string }[];
  type?: { value: string } | null;
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
export async function listAdminProducts(
  limit = 24,
  offset = 0,
): Promise<{ products: AdminProductListItem[]; count: number }> {
  const fields = "id,title,handle,status,thumbnail,*variants.prices";
  const data = await adminFetch<{ products?: RawAdminProduct[]; count?: number }>(
    `/admin/products?fields=${encodeURIComponent(fields)}&order=-created_at&limit=${limit}&offset=${offset}`,
  );
  const products = (data?.products ?? []).map((p) => {
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
  return { products, count: data?.count ?? products.length };
}

export interface ProductFormData extends NewProductInput {
  id: string;
  status: string;
}

/** Reconstruct the product-creator form shape from variants (truth) + metadata (enrichment). */
export async function getProductForEdit(id: string): Promise<ProductFormData | null> {
  const fields =
    "id,title,handle,description,status,thumbnail,metadata,*options,*variants,*variants.prices,*variants.options,categories.id,tags.value,type.value";
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
    offer?: { type: "bogo" | "discount" | "custom"; label: string; percent?: number };
    division?: string;
    occasion?: string[];
    style?: string[];
    trend?: string[];
    sleeve?: string[];
    neckline?: string[];
    length?: string[];
    fabric?: string[];
    print?: string[];
    material?: string;
    care?: string;
    sizeGuide?: string;
    freeDelivery?: boolean;
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

  // Metadata comes from an untyped JSON column — coerce, never trust the cast
  // (a malformed value would crash the edit form at render).
  const arr = (v: unknown): string[] | undefined =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
  const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

  return {
    id: p.id,
    status: p.status,
    title: p.title,
    description: p.description ?? "",
    offer: meta.offer,
    colors,
    categoryIds: (p.categories ?? []).map((c) => c.id),
    tags: (p.tags ?? []).map((t) => t.value),
    type: p.type?.value,
    division: str(meta.division),
    occasion: arr(meta.occasion),
    style: arr(meta.style),
    trend: arr(meta.trend),
    sleeve: arr(meta.sleeve),
    neckline: arr(meta.neckline),
    length: arr(meta.length),
    fabric: arr(meta.fabric),
    print: arr(meta.print),
    material: str(meta.material),
    care: str(meta.care),
    sizeGuide: str(meta.sizeGuide),
    freeDelivery: meta.freeDelivery === true,
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

  // 3. Update basics, images, metadata, tags & type.
  const images = [...new Set(input.colors.flatMap((c) => c.images))];
  const [tagIds, typeId] = await Promise.all([resolveTagIds(input.tags ?? []), resolveTypeId(input.type)]);
  await adminPost(`/admin/products/${id}`, {
    title: input.title,
    description: input.description ?? "",
    ...(images[0] ? { thumbnail: images[0] } : {}),
    images: images.map((url) => ({ url })),
    ...(input.categoryIds ? { categories: input.categoryIds.map((cid) => ({ id: cid })) } : {}),
    ...(input.tags ? { tags: tagIds.map((tid) => ({ id: tid })) } : {}),
    ...(input.type !== undefined ? { type_id: typeId } : {}),
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
/** Find a customer's email by phone (for phone+password login). */
export async function findCustomerEmailByPhone(phone: string): Promise<string | null> {
  const norm = (s: string) => s.replace(/\s+/g, "");
  const data = await adminFetch<{ customers?: { email: string; phone?: string | null }[] }>(
    `/admin/customers?q=${encodeURIComponent(phone)}&fields=id,email,phone&limit=10`,
  );
  const match = (data?.customers ?? []).find((c) => c.phone && norm(c.phone) === norm(phone));
  return match?.email ?? null;
}

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

interface RawOrderMetadata {
  payment_method?: string;
  steadfast_consignment_id?: string;
  steadfast_tracking_code?: string;
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
  metadata?: RawOrderMetadata | null;
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
  status?: string;
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
    packed_at?: string | null;
    shipped_at?: string | null;
    delivered_at?: string | null;
    labels?: { tracking_number?: string | null }[];
  }[];
}

export async function getOrderDetail(id: string): Promise<AdminOrderDetail | null> {
  const fields =
    "id,display_id,status,email,currency_code,total,subtotal,shipping_total,payment_status,fulfillment_status,created_at,metadata,*items,*shipping_address,*fulfillments,*fulfillments.labels,fulfillments.delivered_at";
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
    totalAmount: o.total ?? 0,
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
      packedAt: f.packed_at ?? undefined,
      shippedAt: f.shipped_at ?? undefined,
      deliveredAt: f.delivered_at ?? undefined,
      trackingNumbers: (f.labels ?? []).map((l) => l.tracking_number).filter((t): t is string => !!t),
    })),
    fulfilled: o.fulfillment_status !== "not_fulfilled",
    canceled: o.status === "canceled",
    courier:
      o.metadata?.steadfast_consignment_id && o.metadata?.steadfast_tracking_code
        ? {
            consignmentId: o.metadata.steadfast_consignment_id,
            trackingCode: o.metadata.steadfast_tracking_code,
          }
        : undefined,
  };
}

/**
 * Merge keys into an order's metadata (POST /admin/orders/:id). Reads the
 * current blob first so existing keys (e.g. payment_method) survive.
 */
export async function setOrderMetadata(id: string, patch: Record<string, string>): Promise<void> {
  const data = await adminFetch<{ order?: { metadata?: Record<string, unknown> | null } }>(
    `/admin/orders/${id}?fields=metadata`,
  );
  await adminPost(`/admin/orders/${id}`, { metadata: { ...(data?.order?.metadata ?? {}), ...patch } });
}

/** Cancel an order (e.g. customer no-show on COD). Blocked by Medusa once shipped. */
export async function cancelOrder(id: string): Promise<void> {
  await adminPost(`/admin/orders/${id}/cancel`, {});
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

interface RawRuleValue {
  value?: string | null;
}

interface RawTargetRule {
  attribute?: string | null;
  values?: (RawRuleValue | string)[] | null;
}

interface RawPromotion {
  id: string;
  code: string;
  status: string;
  type: string;
  is_automatic?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  application_method?: {
    type?: string; // "percentage" | "fixed"
    value?: number;
    currency_code?: string;
    target_type?: string; // "order" | "items" | "shipping_methods"
    max_quantity?: number | null;
    buy_rules_min_quantity?: number | null;
    target_rules?: RawTargetRule[] | null;
  } | null;
  campaign?: {
    id?: string;
    starts_at?: string | null;
    ends_at?: string | null;
    budget?: {
      type?: string; // "usage" | "use_by_attribute" | "spend"
      limit?: number | null;
      used?: number | null;
    } | null;
  } | null;
}

export interface AdminPromotionUsage {
  kind: "total" | "per_customer";
  limit: number;
  used: number | null; // redemptions so far (total caps only; null when unknown)
}

export interface AdminPromotionRow {
  id: string;
  code: string;
  status: string;
  automatic: boolean;
  kind: string; // human label: "Order", "Items", "Free shipping", "Buy X get Y"
  display: string; // "10%" | "৳100 off" | "Free shipping" | "Buy 1 get 1"
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  usage: AdminPromotionUsage | null;
  /** What the discount applies to — category/collection ids from the target rules. */
  targetKind: "order" | "category" | "collection" | "shipping";
  targetIds: string[];
  /** Editable discount value — null for free-shipping/BOGO where the value is fixed at 100%. */
  valueType: "percentage" | "fixed" | null;
  value: number | null;
  buyQuantity: number | null; // buyget only
  getQuantity: number | null; // buyget only
}

const ruleValues = (rules: RawTargetRule[] | null | undefined, attribute: string): string[] =>
  (rules ?? [])
    .filter((r) => r.attribute === attribute)
    .flatMap((r) => r.values ?? [])
    .map((v) => (typeof v === "string" ? v : (v.value ?? "")))
    .filter(Boolean);

export async function listPromotions(): Promise<AdminPromotionRow[]> {
  // NB: schedule dates + usage budgets live on the promotion's CAMPAIGN in Medusa 2.15.
  const fields =
    "id,code,status,type,is_automatic,created_at," +
    "*application_method,*application_method.target_rules,*application_method.target_rules.values," +
    "*campaign,*campaign.budget";
  const data = await adminFetch<{ promotions?: RawPromotion[] }>(
    `/admin/promotions?fields=${encodeURIComponent(fields)}&limit=100`,
  );
  return (data?.promotions ?? []).map((p) => {
    const am = p.application_method;
    let kind = "Order";
    let display: string;
    if (p.type === "buyget") {
      kind = "Buy X get Y";
      display = `Buy ${am?.buy_rules_min_quantity ?? 1} get ${am?.max_quantity ?? 1} free`;
    } else if (am?.target_type === "shipping_methods") {
      kind = "Free shipping";
      display = "Free shipping";
    } else {
      kind = am?.target_type === "items" ? "Items" : "Order";
      display =
        am?.type === "percentage"
          ? `${am?.value ?? 0}% off`
          : `${money(am?.value, am?.currency_code ?? "bdt")} off`;
    }

    const categoryIds = ruleValues(am?.target_rules, "items.product.categories.id");
    const collectionIds = ruleValues(am?.target_rules, "items.product.collection_id");
    const targetKind =
      am?.target_type === "shipping_methods"
        ? ("shipping" as const)
        : categoryIds.length > 0
          ? ("category" as const)
          : collectionIds.length > 0
            ? ("collection" as const)
            : ("order" as const);

    const budget = p.campaign?.budget;
    const usage: AdminPromotionUsage | null =
      budget?.limit != null && (budget.type === "usage" || budget.type === "use_by_attribute")
        ? {
            kind: budget.type === "usage" ? "total" : "per_customer",
            limit: budget.limit,
            used: budget.type === "usage" ? (budget.used ?? 0) : null,
          }
        : null;

    const isBuyget = p.type === "buyget";
    const isShipping = am?.target_type === "shipping_methods";
    return {
      id: p.id,
      code: p.code,
      status: p.status,
      automatic: Boolean(p.is_automatic),
      kind,
      display,
      startsAt: p.campaign?.starts_at ?? null,
      endsAt: p.campaign?.ends_at ?? null,
      createdAt: p.created_at ?? null,
      usage,
      targetKind,
      targetIds: targetKind === "category" ? categoryIds : collectionIds,
      valueType:
        isBuyget || isShipping ? null : am?.type === "fixed" ? ("fixed" as const) : ("percentage" as const),
      value: isBuyget || isShipping ? null : (am?.value ?? null),
      buyQuantity: isBuyget ? (am?.buy_rules_min_quantity ?? 1) : null,
      getQuantity: isBuyget ? (am?.max_quantity ?? 1) : null,
    };
  });
}

export interface NewPromotionInput {
  code: string;
  automatic?: boolean;
  method: "percentage" | "fixed" | "free_shipping" | "buyget";
  value?: number; // percent or ৳ amount (ignored for free_shipping/buyget)
  appliesTo: "order" | "category" | "collection";
  targetId?: string; // category/collection id when appliesTo != order
  buyQuantity?: number; // buyget
  getQuantity?: number; // buyget
  startsAt?: string; // ISO datetime — promo becomes active
  endsAt?: string; // ISO datetime — promo expires
  /** Usage cap: "total" = N redemptions across all customers; "per_customer" = N per customer. */
  usageLimitType?: "total" | "per_customer";
  usageLimit?: number;
}

const targetAttr = (appliesTo: "category" | "collection") =>
  appliesTo === "category" ? "items.product.categories.id" : "items.product.collection_id";

/** Campaign budget payload for a usage cap: "usage" caps total redemptions;
 *  "use_by_attribute" + customer_id caps per customer. */
const usageBudget = (kind: "total" | "per_customer", limit: number) =>
  kind === "total"
    ? { type: "usage", limit }
    : { type: "use_by_attribute", attribute: "customer_id", limit };

/** Schedule dates and usage budgets live on a CAMPAIGN in Medusa 2.15 (the
 *  promotion itself rejects starts_at/ends_at) — one campaign per promotion. */
const campaignPayload = (opts: {
  code: string;
  startsAt?: string | null;
  endsAt?: string | null;
  usage?: { kind: "total" | "per_customer"; limit: number } | null;
}) => ({
  name: `${opts.code} schedule & cap`,
  campaign_identifier: `${opts.code}-${Date.now().toString(36)}`,
  starts_at: opts.startsAt ?? null,
  ends_at: opts.endsAt ?? null,
  ...(opts.usage ? { budget: usageBudget(opts.usage.kind, opts.usage.limit) } : {}),
});

/** Create a standard / free-shipping / BOGO promotion (enforced at checkout). */
export async function createPromotion(input: NewPromotionInput): Promise<{ id: string }> {
  const usage =
    input.usageLimitType && input.usageLimit ? { kind: input.usageLimitType, limit: input.usageLimit } : null;
  const needsCampaign = Boolean(input.startsAt || input.endsAt || usage);
  const base = {
    code: input.code,
    status: "active",
    is_automatic: Boolean(input.automatic),
    ...(needsCampaign
      ? { campaign: campaignPayload({ code: input.code, startsAt: input.startsAt, endsAt: input.endsAt, usage }) }
      : {}),
  };
  const rules =
    input.appliesTo !== "order" && input.targetId
      ? [{ attribute: targetAttr(input.appliesTo), operator: "in", values: [input.targetId] }]
      : [];

  let body: Record<string, unknown>;
  if (input.method === "free_shipping") {
    body = {
      ...base,
      type: "standard",
      application_method: { type: "percentage", value: 100, target_type: "shipping_methods", allocation: "across" },
    };
  } else if (input.method === "buyget") {
    // BOGO requires a target (category/collection) to define the "buy" and "get" set.
    body = {
      ...base,
      type: "buyget",
      application_method: {
        type: "percentage",
        value: 100,
        target_type: "items",
        allocation: "each",
        max_quantity: input.getQuantity ?? 1,
        apply_to_quantity: input.getQuantity ?? 1,
        buy_rules_min_quantity: input.buyQuantity ?? 1,
        target_rules: rules,
      },
      rules: [],
      buy_rules: rules,
    };
  } else {
    const onOrder = input.appliesTo === "order";
    body = {
      ...base,
      type: "standard",
      application_method: {
        type: input.method,
        value: input.value ?? 0,
        target_type: onOrder ? "order" : "items",
        allocation: "across",
        ...(input.method === "fixed" ? { currency_code: "bdt" } : {}),
        ...(onOrder ? {} : { target_rules: rules }),
      },
    };
  }

  const { promotion } = await adminPost<{ promotion: { id: string } }>("/admin/promotions", body);
  return promotion;
}

export async function setPromotionStatus(id: string, status: "active" | "inactive"): Promise<void> {
  await adminPost(`/admin/promotions/${id}`, { status });
}

export interface EditPromotionInput {
  status?: "active" | "inactive";
  code?: string;
  automatic?: boolean;
  value?: number;
  buyQuantity?: number;
  getQuantity?: number;
  startsAt?: string | null; // null clears the date
  endsAt?: string | null;
  /** Usage cap — null removes it, undefined leaves it unchanged. */
  usage?: { kind: "total" | "per_customer"; limit: number } | null;
}

/** Edit an existing promotion. Type and applies-to target are immutable (recreate instead). */
export async function updatePromotion(id: string, input: EditPromotionInput): Promise<void> {
  // Server-truth validation + campaign lookup off the current promotion.
  const current = await adminFetch<{
    promotion?: {
      code: string;
      application_method?: { type?: string } | null;
      campaign?: {
        id: string;
        starts_at?: string | null;
        ends_at?: string | null;
        budget?: { type?: string; limit?: number | null } | null;
      } | null;
    };
  }>(`/admin/promotions/${id}?fields=${encodeURIComponent("id,code,*application_method,*campaign,*campaign.budget")}`);
  if (!current?.promotion) throw new Error("Promotion not found.");
  if (
    input.value !== undefined &&
    current.promotion.application_method?.type === "percentage" &&
    input.value > 100
  ) {
    throw new Error("Percentage cannot exceed 100.");
  }

  const body: Record<string, unknown> = {};
  if (input.status !== undefined) body.status = input.status;
  if (input.code !== undefined) body.code = input.code;
  if (input.automatic !== undefined) body.is_automatic = input.automatic;

  const am: Record<string, unknown> = {};
  if (input.value !== undefined) am.value = input.value;
  if (input.buyQuantity !== undefined) am.buy_rules_min_quantity = input.buyQuantity;
  if (input.getQuantity !== undefined) {
    am.max_quantity = input.getQuantity;
    am.apply_to_quantity = input.getQuantity;
  }
  if (Object.keys(am).length > 0) body.application_method = am;

  // Schedule + usage cap live on the promo's campaign (see campaignPayload).
  if (input.startsAt !== undefined || input.endsAt !== undefined || input.usage !== undefined) {
    const cur = current.promotion.campaign ?? null;
    const curUsage: EditPromotionInput["usage"] =
      cur?.budget?.limit != null && (cur.budget.type === "usage" || cur.budget.type === "use_by_attribute")
        ? { kind: cur.budget.type === "usage" ? "total" : "per_customer", limit: cur.budget.limit }
        : null;
    // Desired state; anything not sent stays as it is today.
    const startsAt = input.startsAt !== undefined ? input.startsAt : (cur?.starts_at ?? null);
    const endsAt = input.endsAt !== undefined ? input.endsAt : (cur?.ends_at ?? null);
    const usage = input.usage !== undefined ? input.usage : curUsage;
    const wantType = usage ? (usage.kind === "total" ? "usage" : "use_by_attribute") : null;

    if (!startsAt && !endsAt && !usage) {
      if (cur) body.campaign_id = null; // nothing scheduled or capped anymore
    } else if (cur && (usage ? cur.budget?.type === wantType : !cur.budget)) {
      // Reusable in place: dates always updatable; budget limit updatable when the type matches.
      await adminPost(`/admin/campaigns/${cur.id}`, {
        starts_at: startsAt,
        ends_at: endsAt,
        ...(usage ? { budget: { limit: usage.limit } } : {}),
      });
    } else {
      // No campaign yet, budget type changed, or budget removed (budgets can't be
      // detached in place) — link a fresh campaign with the full desired state.
      const code = input.code ?? current.promotion.code;
      const { campaign: created } = await adminPost<{ campaign: { id: string } }>(
        "/admin/campaigns",
        campaignPayload({ code, startsAt, endsAt, usage }),
      );
      body.campaign_id = created.id;
    }
  }

  if (Object.keys(body).length > 0) await adminPost(`/admin/promotions/${id}`, body);
}

export async function deletePromotion(id: string): Promise<void> {
  await adminDelete(`/admin/promotions/${id}`);
}

/** Idempotently create a personal one-time order-level promo (phone rewards).
 *  `limit: 1` is Medusa 2.15's native total-usage cap. */
export async function ensurePersonalPromo(
  code: string,
  kind: "percentage" | "fixed",
  value: number,
): Promise<void> {
  const existing = await adminFetch<{ promotions?: { id: string }[] }>(
    `/admin/promotions?code=${encodeURIComponent(code)}&fields=id`,
  );
  if (existing?.promotions?.length) return;
  await adminPost("/admin/promotions", {
    code,
    status: "active",
    is_automatic: false,
    type: "standard",
    limit: 1,
    application_method: {
      type: kind,
      value,
      target_type: "order",
      allocation: "across",
      ...(kind === "fixed" ? { currency_code: "bdt" } : {}),
    },
  });
}

// --- Price lists (sales / overrides) ----------------------------------------

export interface AdminPriceListRow {
  id: string;
  title: string;
  type: string; // sale | override
  status: string;
  prices: number;
  startsAt?: string;
  endsAt?: string;
}

export async function listPriceLists(): Promise<AdminPriceListRow[]> {
  const data = await adminFetch<{
    price_lists?: { id: string; title: string; type: string; status: string; starts_at?: string | null; ends_at?: string | null; prices?: { id: string }[] }[];
  }>("/admin/price-lists?fields=id,title,type,status,starts_at,ends_at,prices.id&limit=100");
  return (data?.price_lists ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    status: p.status,
    prices: (p.prices ?? []).length,
    startsAt: p.starts_at ?? undefined,
    endsAt: p.ends_at ?? undefined,
  }));
}

export interface NewPriceListInput {
  title: string;
  percentOff: number;
  appliesTo: "all" | "category" | "collection";
  targetId?: string;
  startsAt?: string; // ISO
  endsAt?: string; // ISO
}

/** Create a sale: computes discounted BDT prices for every matching variant. */
export async function createPriceList(input: NewPriceListInput): Promise<{ id: string }> {
  const params = new URLSearchParams({ limit: "200", fields: "id,variants.id,variants.prices.amount,variants.prices.currency_code" });
  if (input.appliesTo === "category" && input.targetId) params.append("category_id[]", input.targetId);
  if (input.appliesTo === "collection" && input.targetId) params.append("collection_id[]", input.targetId);
  const data = await adminFetch<{
    products?: { variants?: { id: string; prices?: { amount: number; currency_code: string }[] }[] }[];
  }>(`/admin/products?${params.toString()}`);

  const factor = 1 - input.percentOff / 100;
  const prices: { amount: number; currency_code: string; variant_id: string }[] = [];
  for (const p of data?.products ?? []) {
    for (const v of p.variants ?? []) {
      const bdt = v.prices?.find((pr) => pr.currency_code === "bdt")?.amount;
      if (typeof bdt === "number") {
        prices.push({ variant_id: v.id, currency_code: "bdt", amount: Math.max(1, Math.round(bdt * factor)) });
      }
    }
  }
  if (!prices.length) throw new Error("No priced products matched this selection.");

  const { price_list } = await adminPost<{ price_list: { id: string } }>("/admin/price-lists", {
    title: input.title,
    description: `${input.percentOff}% off — ${input.appliesTo}`,
    type: "sale",
    status: "active",
    ...(input.startsAt ? { starts_at: input.startsAt } : {}),
    ...(input.endsAt ? { ends_at: input.endsAt } : {}),
    prices,
  });
  return price_list;
}

export async function deletePriceList(id: string): Promise<void> {
  await adminDelete(`/admin/price-lists/${id}`);
}

// --- Shipping rates ---------------------------------------------------------

export interface AdminShippingRate {
  id: string;
  name: string;
  amount: number; // BDT
  /** Cart item-total (৳) at which this option becomes free — null = never. */
  freeOver: number | null;
  /** Service zone the option is scoped to (its delivery zone), best-effort. */
  zone?: string;
  /** Service zone id — used to group options under their zone card. */
  zoneId?: string;
}

interface RawShippingPrice {
  id?: string;
  amount: number;
  currency_code: string;
  price_rules?: { attribute?: string; operator?: string; value?: string | number }[] | null;
}

const isFreeOverPrice = (p: RawShippingPrice): boolean =>
  p.amount === 0 && (p.price_rules ?? []).some((r) => r.attribute === "item_total" && r.operator === "gte");

const freeOverValue = (p: RawShippingPrice): number | null => {
  const rule = (p.price_rules ?? []).find((r) => r.attribute === "item_total" && r.operator === "gte");
  const n = rule ? Number(rule.value) : NaN;
  return Number.isFinite(n) ? n : null;
};

const SHIPPING_RATE_FIELDS =
  "id,name,service_zone_id,*prices,*prices.price_rules,service_zone.name";

export async function listShippingRates(): Promise<AdminShippingRate[]> {
  const data = await adminFetch<{
    shipping_options?: {
      id: string;
      name: string;
      service_zone_id?: string | null;
      prices?: RawShippingPrice[];
      service_zone?: { name?: string } | null;
    }[];
  }>(`/admin/shipping-options?fields=${encodeURIComponent(SHIPPING_RATE_FIELDS)}`);
  return (data?.shipping_options ?? []).map((o) => {
    const bdt = (o.prices ?? []).filter((p) => p.currency_code === "bdt");
    const conditional = bdt.find(isFreeOverPrice);
    return {
      id: o.id,
      name: o.name,
      amount: bdt.find((p) => !isFreeOverPrice(p))?.amount ?? 0,
      freeOver: conditional ? freeOverValue(conditional) : null,
      zone: o.service_zone?.name ?? undefined,
      zoneId: o.service_zone_id ?? undefined,
    };
  });
}

// --- Shipping zones & option management ---------------------------------------
// Medusa v2 has no GET /admin/fulfillment-sets list route; zones are read off the
// stock locations (verified against the local backend). Zone mutations go through
// POST/DELETE /admin/fulfillment-sets/:id/service-zones[/:zoneId].

export interface AdminShippingZone {
  id: string;
  name: string;
  fulfillmentSetId: string;
  /** ISO-2 country codes (lowercase, as Medusa stores them). */
  countries: string[];
}

interface RawStockLocationZones {
  stock_locations?: {
    fulfillment_sets?: {
      id: string;
      type: string;
      service_zones?: {
        id: string;
        name: string;
        geo_zones?: { type: string; country_code?: string | null }[];
      }[];
    }[];
  }[];
}

const ZONE_FIELDS =
  "id,name,*fulfillment_sets,*fulfillment_sets.service_zones,*fulfillment_sets.service_zones.geo_zones";

/** Service zones of every "shipping" fulfillment set (pickup sets are excluded). */
export async function listShippingZones(): Promise<AdminShippingZone[]> {
  const data = await adminFetch<RawStockLocationZones>(
    `/admin/stock-locations?fields=${encodeURIComponent(ZONE_FIELDS)}&limit=50`,
  );
  const zones: AdminShippingZone[] = [];
  for (const loc of data?.stock_locations ?? []) {
    for (const fs of loc.fulfillment_sets ?? []) {
      if (fs.type !== "shipping") continue;
      for (const z of fs.service_zones ?? []) {
        zones.push({
          id: z.id,
          name: z.name,
          fulfillmentSetId: fs.id,
          countries: (z.geo_zones ?? [])
            .filter((g) => g.type === "country" && g.country_code)
            .map((g) => (g.country_code as string).toLowerCase()),
        });
      }
    }
  }
  return zones;
}

/** The shipping fulfillment set new zones are created under (the store has one). */
async function getShippingFulfillmentSetId(): Promise<string> {
  const data = await adminFetch<RawStockLocationZones>(
    `/admin/stock-locations?fields=${encodeURIComponent(ZONE_FIELDS)}&limit=50`,
  );
  for (const loc of data?.stock_locations ?? []) {
    const fs = (loc.fulfillment_sets ?? []).find((f) => f.type === "shipping");
    if (fs) return fs.id;
  }
  throw new Error("No shipping fulfillment set found — set up a stock location first.");
}

const toGeoZones = (countries: string[]) =>
  countries.map((c) => ({ type: "country" as const, country_code: c.toLowerCase() }));

export async function createShippingZone(name: string, countries: string[]): Promise<void> {
  const fulfillmentSetId = await getShippingFulfillmentSetId();
  await adminPost(`/admin/fulfillment-sets/${fulfillmentSetId}/service-zones`, {
    name,
    geo_zones: toGeoZones(countries),
  });
}

/** Rename a zone and/or replace its country list (geo_zones without ids replace). */
export async function updateShippingZone(
  zoneId: string,
  patch: { name?: string; countries?: string[] },
): Promise<void> {
  const zone = (await listShippingZones()).find((z) => z.id === zoneId);
  if (!zone) throw new Error("Zone not found");
  await adminPost(`/admin/fulfillment-sets/${zone.fulfillmentSetId}/service-zones/${zoneId}`, {
    name: patch.name ?? zone.name,
    ...(patch.countries ? { geo_zones: toGeoZones(patch.countries) } : {}),
  });
}

export async function deleteShippingZone(zoneId: string): Promise<void> {
  const zone = (await listShippingZones()).find((z) => z.id === zoneId);
  if (!zone) throw new Error("Zone not found");
  await adminDelete(`/admin/fulfillment-sets/${zone.fulfillmentSetId}/service-zones/${zoneId}`);
}

export interface NewShippingOptionInput {
  name: string;
  amount: number; // BDT, flat
  serviceZoneId: string;
}

/**
 * Create a flat-rate shipping option in a zone. Mirrors the seeded options
 * (verified against the local backend): manual provider, default profile, a
 * BDT currency price plus a BDT-region price, and the storefront rules
 * (enabled_in_store=true, is_return=false) checkout needs to list it.
 */
export async function createShippingOption(input: NewShippingOptionInput): Promise<{ id: string }> {
  const [profiles, regions] = await Promise.all([
    adminFetch<{ shipping_profiles?: { id: string }[] }>("/admin/shipping-profiles?limit=1"),
    adminFetch<{ regions?: { id: string; currency_code: string }[] }>(
      "/admin/regions?fields=id,currency_code&limit=50",
    ),
  ]);
  const shippingProfileId = profiles?.shipping_profiles?.[0]?.id;
  if (!shippingProfileId) throw new Error("No shipping profile found.");
  const bdtRegionId = (regions?.regions ?? []).find((r) => r.currency_code === STORE_CURRENCY)?.id;

  const { shipping_option } = await adminPost<{ shipping_option: { id: string } }>(
    "/admin/shipping-options",
    {
      name: input.name,
      service_zone_id: input.serviceZoneId,
      shipping_profile_id: shippingProfileId,
      provider_id: "manual_manual",
      price_type: "flat",
      type: {
        label: "Standard",
        code: slugify(input.name) || `option-${Date.now()}`,
        description: input.name,
      },
      prices: [
        { currency_code: STORE_CURRENCY, amount: input.amount },
        ...(bdtRegionId ? [{ region_id: bdtRegionId, amount: input.amount }] : []),
      ],
      rules: [
        { attribute: "enabled_in_store", operator: "eq", value: "true" },
        { attribute: "is_return", operator: "eq", value: "false" },
      ],
    },
  );
  return shipping_option;
}

export async function deleteShippingOption(id: string): Promise<void> {
  await adminDelete(`/admin/shipping-options/${id}`);
}

/** Payment providers attached to the selling regions (read-only — enabling new
 *  ones needs infra). Medusa v2 has no top-level /admin/payment-providers route,
 *  so we read them off the regions and de-duplicate (BDT region preferred). */
export interface AdminPaymentProvider {
  id: string;
  enabled: boolean;
}

export async function listPaymentProviders(): Promise<AdminPaymentProvider[]> {
  const data = await adminFetch<{
    regions?: { currency_code: string; payment_providers?: { id: string; is_enabled?: boolean }[] }[];
  }>("/admin/regions?fields=id,currency_code,*payment_providers&limit=50");
  const regions = data?.regions ?? [];
  // Prefer the BDT region's providers; fall back to all regions' union.
  const source = regions.find((r) => r.currency_code === "bdt") ?? regions[0];
  const list = source?.payment_providers ?? regions.flatMap((r) => r.payment_providers ?? []);
  const seen = new Map<string, boolean>();
  for (const p of list) if (!seen.has(p.id)) seen.set(p.id, p.is_enabled ?? true);
  return [...seen.entries()].map(([id, enabled]) => ({ id, enabled }));
}

/** Update a shipping option's BDT price and its optional free-over-৳X threshold.
 *  The threshold is a second conditional price (amount 0, `item_total >= X`
 *  rule) — Medusa picks the rule-matched price when the cart qualifies. */
export async function updateShippingRate(id: string, amount: number, freeOver?: number | null): Promise<void> {
  const data = await adminFetch<{ shipping_option?: { prices?: RawShippingPrice[] } }>(
    `/admin/shipping-options/${id}?fields=id,*prices,*prices.price_rules`,
  );
  const prices = data?.shipping_option?.prices ?? [];
  const base = prices.filter((p) => p.currency_code === "bdt" && !isFreeOverPrice(p));
  const keepFreeOver = freeOver === undefined ? listRateFreeOver(prices) : freeOver;
  await adminPost(`/admin/shipping-options/${id}`, {
    prices: [
      // Non-BDT rows pass through untouched so the update doesn't drop them.
      ...prices.filter((p) => p.currency_code !== "bdt").map((p) => ({ id: p.id, currency_code: p.currency_code, amount: p.amount })),
      ...(base.length > 0
        ? base.map((p) => ({ id: p.id, amount, currency_code: "bdt" }))
        : [{ amount, currency_code: "bdt" }]),
      ...(keepFreeOver != null
        ? [{ amount: 0, currency_code: "bdt", rules: [{ attribute: "item_total", operator: "gte", value: keepFreeOver }] }]
        : []),
    ],
  });
}

const listRateFreeOver = (prices: RawShippingPrice[]): number | null => {
  const row = prices.find((p) => p.currency_code === "bdt" && isFreeOverPrice(p));
  return row ? freeOverValue(row) : null;
};

// --- Customers --------------------------------------------------------------

/** Domain of the synthetic account emails minted for phone-OTP signups (see lib/customer-auth). */
export const PHONE_EMAIL_DOMAIN = "phone.maison.local";
export const isPhoneAccountEmail = (email: string | null | undefined): boolean =>
  !!email && email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);

interface RawCustomer {
  id: string;
  email: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  created_at: string;
  orders?: { id: string }[];
}

export interface AdminCustomerRow {
  id: string;
  /** Null for phone-OTP signups — their synthetic account email is an internal detail. */
  email: string | null;
  name: string;
  phone: string | null;
  orders: number;
  createdAt: string;
}

export async function listCustomers(
  limit = 24,
  offset = 0,
): Promise<{ customers: AdminCustomerRow[]; count: number }> {
  const fields = "id,email,first_name,last_name,phone,created_at,orders.id";
  const data = await adminFetch<{ customers?: RawCustomer[]; count?: number }>(
    `/admin/customers?fields=${encodeURIComponent(fields)}&order=-created_at&limit=${limit}&offset=${offset}`,
  );
  const customers = (data?.customers ?? []).map((c) => ({
    id: c.id,
    email: isPhoneAccountEmail(c.email) ? null : (c.email ?? null),
    name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.phone || "—",
    phone: c.phone ?? null,
    orders: (c.orders ?? []).length,
    createdAt: c.created_at,
  }));
  return { customers, count: data?.count ?? customers.length };
}

/** Hard cap on bulk customer reads (CSV export / SMS audience). */
export const CUSTOMER_BULK_CAP = 10_000;
const CUSTOMER_BULK_PAGE = 500;

/**
 * Iterate ALL customers newest-first in pages of 500, capped at `cap` rows.
 * Used by the CSV export (streams page by page) and the promo-SMS audience.
 */
export async function* iterateCustomerPages(
  cap = CUSTOMER_BULK_CAP,
): AsyncGenerator<AdminCustomerRow[]> {
  let fetched = 0;
  for (let offset = 0; offset < cap; offset += CUSTOMER_BULK_PAGE) {
    const limit = Math.min(CUSTOMER_BULK_PAGE, cap - offset);
    const { customers, count } = await listCustomers(limit, offset);
    if (customers.length === 0) return;
    yield customers;
    fetched += customers.length;
    if (fetched >= Math.min(count, cap) || customers.length < limit) return;
  }
}

/** Every unique phone number across all customers (capped at 10k customers). */
export async function listAllCustomerPhones(): Promise<string[]> {
  const phones = new Set<string>();
  for await (const page of iterateCustomerPages()) {
    for (const c of page) if (c.phone) phones.add(c.phone);
  }
  return [...phones];
}

/** Every customer with a REAL email (synthetic phone-signup addresses are
 *  already surfaced as null), with name for {name} personalisation. Deduped. */
export async function listAllCustomerEmails(): Promise<{ email: string; name: string }[]> {
  const byEmail = new Map<string, string>();
  for await (const page of iterateCustomerPages()) {
    for (const c of page) {
      if (c.email && !byEmail.has(c.email)) byEmail.set(c.email, c.name);
    }
  }
  return [...byEmail.entries()].map(([email, name]) => ({ email, name }));
}

/**
 * Resolve phone numbers for specific customer IDs server-side — the client is
 * never trusted with raw phone lists. Chunked to keep query strings sane.
 */
export async function getCustomerPhonesByIds(ids: string[]): Promise<string[]> {
  const phones = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const params = new URLSearchParams({ fields: "id,phone", limit: String(chunk.length) });
    for (const id of chunk) params.append("id[]", id);
    const data = await adminFetch<{ customers?: { id: string; phone?: string | null }[] }>(
      `/admin/customers?${params.toString()}`,
    );
    for (const c of data?.customers ?? []) if (c.phone) phones.add(c.phone);
  }
  return [...phones];
}

export interface AdminCustomerDetail {
  id: string;
  /** Null for phone-OTP signups — their synthetic account email is an internal detail. */
  email: string | null;
  name: string;
  phone?: string;
  createdAt: string;
  orders: {
    id: string;
    displayId: number;
    total: string;
    createdAt: string;
    fulfillmentStatus: string;
    paymentStatus: string;
  }[];
}

export async function getCustomerDetail(id: string): Promise<AdminCustomerDetail | null> {
  const fields =
    "id,email,first_name,last_name,phone,created_at,orders.id,orders.display_id,orders.total,orders.currency_code,orders.created_at,orders.fulfillment_status,orders.payment_status";
  const data = await adminFetch<{
    customer?: {
      id: string;
      email: string | null;
      first_name?: string | null;
      last_name?: string | null;
      created_at: string;
      phone?: string | null;
      orders?: {
        id: string;
        display_id: number;
        total: number;
        currency_code: string;
        created_at: string;
        // Computed statuses are null (not "not_fulfilled"/"not_paid") when the
        // order is fetched as a customer relation expansion.
        fulfillment_status?: string | null;
        payment_status?: string | null;
      }[];
    };
  }>(`/admin/customers/${id}?fields=${encodeURIComponent(fields)}`);
  const c = data?.customer;
  if (!c) return null;
  return {
    id: c.id,
    email: isPhoneAccountEmail(c.email) ? null : (c.email ?? null),
    name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.phone || "—",
    phone: c.phone ?? undefined,
    createdAt: c.created_at,
    orders: (c.orders ?? [])
      .map((o) => ({
        id: o.id,
        displayId: o.display_id,
        total: money(o.total, o.currency_code),
        createdAt: o.created_at,
        fulfillmentStatus: o.fulfillment_status ?? "not_fulfilled",
        paymentStatus: o.payment_status ?? "not_paid",
      }))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  };
}

/** Permanently delete a customer (their orders survive — Medusa keeps them as guest orders). */
export async function deleteCustomer(id: string): Promise<void> {
  await adminDelete(`/admin/customers/${id}`);
}

// --- Settings viewers (read-only infra surfaced in the dashboard) ------------

export interface SettingsOverview {
  regions: { id: string; name: string; currency: string; countries: string[] }[];
  taxRegions: { id: string; country: string }[];
  salesChannels: { id: string; name: string; enabled: boolean }[];
  users: { id: string; email: string; name: string }[];
  returnReasons: { id: string; label: string; value: string }[];
  refundReasons: { id: string; label: string }[];
}

export async function getSettingsOverview(): Promise<SettingsOverview> {
  const [regions, tax, channels, users, returns, refunds] = await Promise.all([
    adminFetch<{ regions?: { id: string; name: string; currency_code: string; countries?: { iso_2: string }[] }[] }>(
      "/admin/regions?fields=id,name,currency_code,*countries&limit=50",
    ),
    adminFetch<{ tax_regions?: { id: string; country_code: string }[] }>("/admin/tax-regions?fields=id,country_code&limit=50"),
    adminFetch<{ sales_channels?: { id: string; name: string; is_disabled?: boolean }[] }>(
      "/admin/sales-channels?fields=id,name,is_disabled&limit=50",
    ),
    adminFetch<{ users?: { id: string; email: string; first_name?: string | null; last_name?: string | null }[] }>(
      "/admin/users?fields=id,email,first_name,last_name&limit=50",
    ),
    adminFetch<{ return_reasons?: { id: string; label: string; value: string }[] }>(
      "/admin/return-reasons?fields=id,label,value&limit=50",
    ).catch(() => null),
    adminFetch<{ refund_reasons?: { id: string; label: string }[] }>("/admin/refund-reasons?fields=id,label&limit=50").catch(
      () => null,
    ),
  ]);
  return {
    regions: (regions?.regions ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      currency: r.currency_code.toUpperCase(),
      countries: (r.countries ?? []).map((c) => c.iso_2.toUpperCase()),
    })),
    taxRegions: (tax?.tax_regions ?? []).map((t) => ({ id: t.id, country: t.country_code.toUpperCase() })),
    salesChannels: (channels?.sales_channels ?? []).map((c) => ({ id: c.id, name: c.name, enabled: !c.is_disabled })),
    users: (users?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || "—",
    })),
    returnReasons: (returns?.return_reasons ?? []).map((r) => ({ id: r.id, label: r.label, value: r.value })),
    refundReasons: (refunds?.refund_reasons ?? []).map((r) => ({ id: r.id, label: r.label })),
  };
}

// --- Settings mutations (reasons + sales channels) --------------------------

export async function createReturnReason(label: string, description?: string): Promise<void> {
  await adminPost("/admin/return-reasons", { value: slugify(label) || `reason-${label.length}`, label, ...(description ? { description } : {}) });
}
export async function deleteReturnReason(id: string): Promise<void> {
  await adminDelete(`/admin/return-reasons/${id}`);
}

export async function createRefundReason(label: string, description?: string): Promise<void> {
  await adminPost("/admin/refund-reasons", { code: slugify(label) || `reason-${label.length}`, label, ...(description ? { description } : {}) });
}
export async function deleteRefundReason(id: string): Promise<void> {
  await adminDelete(`/admin/refund-reasons/${id}`);
}

export async function updateSalesChannel(id: string, patch: { name?: string; isDisabled?: boolean }): Promise<void> {
  await adminPost(`/admin/sales-channels/${id}`, {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.isDisabled !== undefined ? { is_disabled: patch.isDisabled } : {}),
  });
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

export interface DailyPoint {
  label: string; // e.g. "Jun 3"
  revenue: number; // BDT (raw, for bar height)
  revenueDisplay: string; // "৳1,290"
  orders: number;
}

/** Per-day revenue + order counts for the last `days` days (store currency only). */
export async function getDashboardSeries(days = 14): Promise<DailyPoint[]> {
  const data = await adminFetch<{
    orders?: { total: number; currency_code: string; created_at: string }[];
  }>("/admin/orders?fields=total,currency_code,created_at&limit=1000&order=-created_at");
  const orders = (data?.orders ?? []).filter((o) => o.currency_code === STORE_CURRENCY);

  const buckets: DailyPoint[] = [];
  const byKey = new Map<string, DailyPoint>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const point: DailyPoint = {
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      revenue: 0,
      revenueDisplay: money(0, STORE_CURRENCY),
      orders: 0,
    };
    byKey.set(key, point);
    buckets.push(point);
  }
  for (const o of orders) {
    const key = o.created_at.slice(0, 10);
    const point = byKey.get(key);
    if (point) {
      point.revenue += o.total ?? 0;
      point.orders += 1;
    }
  }
  for (const p of buckets) p.revenueDisplay = money(p.revenue, STORE_CURRENCY);
  return buckets;
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

export interface TopProduct {
  title: string;
  thumbnail?: string;
  units: number;
}

/** Best-selling products by units, aggregated from recent orders' line items. */
export async function getTopProducts(limit = 5): Promise<TopProduct[]> {
  const fields = "items.product_title,items.title,items.quantity,items.thumbnail,created_at";
  const data = await adminFetch<{
    orders?: { items?: { product_title?: string; title?: string; quantity: number; thumbnail?: string | null }[] }[];
  }>(`/admin/orders?fields=${encodeURIComponent(fields)}&order=-created_at&limit=300`);
  const agg = new Map<string, TopProduct>();
  for (const o of data?.orders ?? []) {
    for (const it of o.items ?? []) {
      const title = it.product_title || it.title || "Unknown";
      const prev = agg.get(title) ?? { title, thumbnail: it.thumbnail ?? undefined, units: 0 };
      prev.units += it.quantity ?? 0;
      if (!prev.thumbnail && it.thumbnail) prev.thumbnail = it.thumbnail;
      agg.set(title, prev);
    }
  }
  return [...agg.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

export interface LowStockVariant {
  product: string;
  variant: string;
  thumbnail?: string;
  quantity: number;
}

/**
 * Variants at or below a stock threshold (still in stock). Best-effort: Medusa
 * only exposes `inventory_quantity` when inventory is managed, so this returns
 * [] rather than erroring when the data isn't available.
 */
export async function getLowStock(threshold = 5, limit = 10): Promise<LowStockVariant[]> {
  const fields = "title,thumbnail,variants.title,variants.inventory_quantity";
  const data = await adminFetch<{
    products?: { title: string; thumbnail?: string | null; variants?: { title?: string; inventory_quantity?: number | null }[] }[];
  }>(`/admin/products?fields=${encodeURIComponent(fields)}&limit=200`);
  const low: LowStockVariant[] = [];
  for (const p of data?.products ?? []) {
    for (const v of p.variants ?? []) {
      const q = v.inventory_quantity;
      if (typeof q === "number" && q > 0 && q <= threshold) {
        low.push({ product: p.title, variant: v.title ?? "—", thumbnail: p.thumbnail ?? undefined, quantity: q });
      }
    }
  }
  return low.sort((a, b) => a.quantity - b.quantity).slice(0, limit);
}
