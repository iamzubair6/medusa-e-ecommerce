import "server-only";
import { z } from "zod";
import { adminFetch, adminPost } from "./medusa-admin";
import { revalidateCommerce } from "./revalidate-commerce";

/**
 * The ONE shared stock path. Stock lives in product `metadata.sizeStock`
 * ({color: {size: qty}}) — Medusa inventory is unmanaged, so this blob is the
 * only truth the storefront, admin, restock centre and POS all read. Every
 * sale (online OR counter) decrements here; returns/exchanges increment here.
 *
 * All functions are best-effort and never throw: an order must never fail
 * because a stock write did.
 */

export interface StockLine {
  productId: string;
  color: string;
  size: string;
  quantity: number;
}

const sizeStockSchema = z.record(z.string(), z.record(z.string(), z.number()));
type SizeStock = z.infer<typeof sizeStockSchema>;

/**
 * Per-product write queue. sizeStock updates are read-modify-write on a JSON
 * blob; serializing per product id inside this server instance keeps two
 * simultaneous sales of the same product from dropping an update (acceptable
 * single-region mitigation — see docs/POS_PLAN.md §4).
 */
const queues = new Map<string, Promise<void>>();

function enqueue(productId: string, job: () => Promise<void>): Promise<void> {
  const run = (queues.get(productId) ?? Promise.resolve()).then(job, job);
  queues.set(
    productId,
    run.finally(() => {
      if (queues.get(productId) === run) queues.delete(productId);
    }),
  );
  return run;
}

/** The current sizeStock blob for a product, or null when unreachable. */
export async function readSizeStock(productId: string): Promise<SizeStock | null> {
  const data = await adminFetch<{ product?: { metadata?: Record<string, unknown> | null } }>(
    `/admin/products/${productId}?fields=metadata`,
  );
  if (!data?.product) return null;
  const parsed = sizeStockSchema.safeParse(data.product.metadata?.sizeStock);
  return parsed.success ? parsed.data : {};
}

async function applyToProduct(
  productId: string,
  deltas: { color: string; size: string; delta: number }[],
): Promise<boolean> {
  const data = await adminFetch<{ product?: { metadata?: Record<string, unknown> | null } }>(
    `/admin/products/${productId}?fields=metadata`,
  );
  if (!data?.product) return false;
  const metadata = data.product.metadata ?? {};
  const parsed = sizeStockSchema.safeParse(metadata.sizeStock);
  if (!parsed.success) return false; // no tracked stock on this product — nothing to adjust

  const sizeStock: SizeStock = structuredClone(parsed.data);
  let touched = false;
  for (const { color, size, delta } of deltas) {
    const current = sizeStock[color]?.[size];
    // Only adjust combinations the admin actually tracks; an absent key means
    // "untracked" (storefront shows a default), and inventing it would create
    // phantom stock records.
    if (current === undefined) continue;
    sizeStock[color]![size] = Math.max(0, current + delta);
    touched = true;
  }
  if (!touched) return false;

  await adminPost(`/admin/products/${productId}`, { metadata: { ...metadata, sizeStock } });
  return true;
}

/** Adjust tracked stock for a set of sold/returned lines. sign −1 = sale, +1 = restock. */
export async function adjustSizeStock(lines: StockLine[], sign: 1 | -1): Promise<void> {
  const byProduct = new Map<string, { color: string; size: string; delta: number }[]>();
  for (const line of lines) {
    if (!line.productId || line.quantity <= 0) continue;
    const list = byProduct.get(line.productId) ?? [];
    list.push({ color: line.color, size: line.size, delta: sign * line.quantity });
    byProduct.set(line.productId, list);
  }
  if (byProduct.size === 0) return;

  let wrote = false;
  await Promise.all(
    [...byProduct.entries()].map(([productId, deltas]) =>
      enqueue(productId, async () => {
        const ok = await applyToProduct(productId, deltas).catch(() => false);
        wrote = wrote || ok;
      }),
    ),
  );
  // The storefront caches catalog reads for 5 minutes — revalidate so sold-out
  // sizes disappear immediately on PDPs and listings.
  if (wrote) revalidateCommerce();
}

export async function decrementSizeStock(lines: StockLine[]): Promise<void> {
  return adjustSizeStock(lines, -1);
}

export async function incrementSizeStock(lines: StockLine[]): Promise<void> {
  return adjustSizeStock(lines, 1);
}

interface RawStockItem {
  product_id?: string | null;
  variant_title?: string | null;
  quantity: number;
}

/**
 * An order's items as stock lines. Variant titles are built as
 * "{size} / {color}" at product creation (sizes never contain " / "), so the
 * first separator splits reliably.
 */
export async function orderStockLines(orderId: string): Promise<StockLine[]> {
  // *items (wildcard), NOT item subfields — a partial item selection makes
  // Medusa return quantity: undefined, which would poison sizeStock with NaN.
  const data = await adminFetch<{ order?: { items?: RawStockItem[] } }>(
    `/admin/orders/${orderId}?fields=id,*items`,
  );
  const lines: StockLine[] = [];
  for (const item of data?.order?.items ?? []) {
    const title = item.variant_title ?? "";
    const sep = title.indexOf(" / ");
    if (!item.product_id || sep === -1 || !Number.isFinite(item.quantity)) continue;
    lines.push({
      productId: item.product_id,
      size: title.slice(0, sep),
      color: title.slice(sep + 3),
      quantity: item.quantity,
    });
  }
  return lines;
}

/** Decrement tracked stock for every line of a just-completed order. Best-effort. */
export async function decrementStockForOrder(orderId: string): Promise<void> {
  const lines = await orderStockLines(orderId).catch(() => []);
  if (lines.length) await decrementSizeStock(lines);
}
