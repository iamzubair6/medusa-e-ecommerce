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
