import "server-only";
import type { OrderTracking, TrackingFulfillment } from "./tracking-types";

export type { OrderTracking } from "./tracking-types";

/**
 * Server-only Medusa Admin API client. Uses a secret API key (Basic auth) and
 * must never be reachable from the browser. Currently used only for order lookup
 * by the parcel tracker.
 */

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const SK = process.env.MEDUSA_ADMIN_API_KEY;

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
}

/** Create a Medusa product (variants + BDT prices + metadata) from the form. */
export async function createProduct(input: NewProductInput): Promise<{ id: string; handle: string }> {
  const { salesChannelId, shippingProfileId } = await getCreateContext();
  const handle = slugify(input.title) || `product-${Date.now()}`;
  const colorNames = input.colors.map((c) => c.name);
  const sizeSet = [...new Set(input.colors.flatMap((c) => c.sizes.map((s) => s.size)))];

  const variants = input.colors.flatMap((c) =>
    c.sizes.map((s) => ({
      title: `${s.size} / ${c.name}`,
      sku: `${handle}-${c.name}-${s.size}`.toUpperCase().replace(/[^A-Z0-9-]/g, ""),
      manage_inventory: false, // always purchasable; stock display comes from metadata
      options: { Size: s.size, Color: c.name },
      prices: [{ amount: c.price, currency_code: "bdt" }],
    })),
  );

  const metadata = {
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

  const { product } = await adminPost<{ product: { id: string; handle: string } }>("/admin/products", {
    title: input.title,
    handle,
    description: input.description ?? "",
    status: "published",
    ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
    images: input.colors.flatMap((c) => c.images).map((url) => ({ url })),
    options: [
      { title: "Size", values: sizeSet },
      { title: "Color", values: colorNames },
    ],
    variants,
    ...(salesChannelId ? { sales_channels: [{ id: salesChannelId }] } : {}),
    metadata,
  });
  return product;
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
