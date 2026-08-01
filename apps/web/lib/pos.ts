import "server-only";
import { z } from "zod";
import { adminFetch, adminPost } from "./medusa-admin";
import { decrementSizeStock, incrementSizeStock, type StockLine } from "./stock";

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
  PosDayReport,
  PosDayRow,
  PosOrderItem,
  PosOrderView,
  PosPaymentMethod,
  PosProduct,
  PosRefund,
  PosRefundLine,
  PosSaleLine,
  PosSaleSuccess,
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

/** One product in the POS shape (SKUs + per-colour sizes) — barcode labels page. */
export async function posProductById(id: string): Promise<PosProduct | null> {
  const fields = "id,title,handle,status,thumbnail,metadata,*variants,*variants.prices";
  const data = await adminFetch<{ product?: RawPosProduct }>(
    `/admin/products/${id}?fields=${encodeURIComponent(fields)}`,
  );
  return data?.product ? toPosProduct(data.product) : null;
}

// --- Checkout ---------------------------------------------------------------

export interface PosCheckoutInput {
  lines: PosSaleLine[];
  payment: { method: PosPaymentMethod; txnId?: string };
  promoCodes?: string[];
  /** ADMIN-only — the route enforces the role before passing it through. */
  manualDiscountPct?: number;
  customer?: { customerId?: string; email?: string; phone?: string };
  cashier: { email: string; name: string };
  /** Complete even when the oversell check finds shortfalls (staff hold the item). */
  force?: boolean;
}

export type PosCheckoutResult =
  | ({ ok: true } & PosSaleSuccess)
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
  let discountApplied = 0;
  const items = input.lines.map((line) => {
    const base = pricing.get(line.productId)?.colorPrices[line.color];
    // Manual % discount = per-line unit_price override; otherwise Medusa
    // prices the variant itself (single source of truth).
    const discounted =
      pct && base !== undefined ? Math.round((base * (100 - pct)) / 100) : undefined;
    if (discounted !== undefined) discountApplied += 1;
    return {
      variant_id: line.variantId,
      quantity: line.quantity,
      ...(discounted !== undefined ? { unit_price: discounted } : {}),
    };
  });
  // A discount the pricing read couldn't apply to EVERY line would silently
  // charge some items full price while the receipt claims a % off — refuse.
  if (pct && discountApplied < input.lines.length) {
    return {
      ok: false,
      status: 422,
      error: "Manual discount unavailable for an item in this cart (missing colour price).",
    };
  }

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
        ...(pct && discountApplied > 0 ? { pos_manual_discount_pct: String(pct) } : {}),
      },
    });

    const converted = await adminPost<{ order: { id: string } }>(
      `/admin/draft-orders/${created.draft_order.id}/convert-to-order`,
      {},
    );

    // Final numbers come from the created order itself (unit_price overrides
    // and promo codes applied) so the receipt always reconciles line-by-line.
    const detailFields =
      "display_id,total,subtotal,discount_total,currency_code," +
      "items.variant_title,items.product_title,items.title,items.quantity,items.unit_price,items.total";
    const detail = await adminFetch<{
      order?: {
        display_id: number;
        total?: number;
        subtotal?: number;
        discount_total?: number;
        currency_code?: string;
        items?: {
          variant_title?: string | null;
          product_title?: string | null;
          title?: string | null;
          quantity: number;
          unit_price?: number;
          total?: number;
        }[];
      };
    }>(`/admin/orders/${converted.order.id}?fields=${encodeURIComponent(detailFields)}`);

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

    const finalLines = (detail?.order?.items ?? []).map((i) => {
      const parts = splitVariantTitle(i.variant_title ?? "");
      return {
        title: i.product_title ?? i.title ?? "Item",
        size: parts?.[0] ?? "",
        color: parts?.[1] ?? "",
        quantity: i.quantity,
        unitPrice: i.unit_price ?? 0,
        total: i.total ?? (i.unit_price ?? 0) * i.quantity,
      };
    });

    return {
      ok: true,
      orderId: converted.order.id,
      displayId: detail?.order?.display_id ?? 0,
      total: detail?.order?.total ?? 0,
      subtotal: detail?.order?.subtotal ?? 0,
      discountTotal: detail?.order?.discount_total ?? 0,
      currency: detail?.order?.currency_code ?? region.currency,
      lines: finalLines,
      ...(pct && discountApplied > 0 ? { manualDiscountPct: pct } : {}),
    };
  } catch (error) {
    return { ok: false, status: 502, error: error instanceof Error ? error.message : "Checkout failed." };
  }
}

// --- Order lookup, returns & day report -------------------------------------

const refundSchema = z.object({
  at: z.string(),
  by: z.string(),
  amount: z.number(),
  lines: z.array(
    z.object({
      productId: z.string().nullable(),
      title: z.string(),
      color: z.string(),
      size: z.string(),
      quantity: z.number(),
    }),
  ),
});
const refundsSchema = z.array(refundSchema);

function parseRefunds(raw: unknown): PosRefund[] {
  if (typeof raw !== "string" || !raw) return [];
  try {
    const parsed = refundsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

interface RawPosOrderMeta {
  channel?: string;
  payment_method?: string;
  pos_txn_id?: string;
  pos_cashier_name?: string;
  pos_refunds?: string;
}

interface RawPosOrderDetail {
  id: string;
  display_id: number;
  created_at: string;
  total?: number;
  discount_total?: number;
  email?: string | null;
  metadata?: RawPosOrderMeta | null;
  items?: {
    id: string;
    product_id?: string | null;
    variant_title?: string | null;
    product_title?: string | null;
    title?: string | null;
    quantity: number;
    unit_price?: number;
    total?: number;
  }[];
}

const POS_ORDER_FIELDS =
  "id,display_id,created_at,total,discount_total,email,metadata," +
  "items.id,items.product_id,items.variant_title,items.product_title,items.title,items.quantity,items.unit_price,items.total";

function toPosOrderView(o: RawPosOrderDetail): PosOrderView {
  const meta = o.metadata ?? {};
  const refunds = parseRefunds(meta.pos_refunds);
  const items: PosOrderItem[] = (o.items ?? []).map((i) => {
    const parts = splitVariantTitle(i.variant_title ?? "");
    return {
      itemId: i.id,
      productId: i.product_id ?? null,
      title: i.product_title ?? i.title ?? "Item",
      size: parts?.[0] ?? "",
      color: parts?.[1] ?? "",
      quantity: i.quantity,
      unitPrice: i.unit_price ?? 0,
      total: i.total ?? (i.unit_price ?? 0) * i.quantity,
    };
  });
  return {
    orderId: o.id,
    displayId: o.display_id,
    createdAt: o.created_at,
    total: o.total ?? 0,
    discountTotal: o.discount_total ?? 0,
    email: o.email ?? "",
    channel: meta.channel ?? "online",
    paymentMethod: meta.payment_method,
    txnId: meta.pos_txn_id,
    cashierName: meta.pos_cashier_name,
    items,
    refunds,
    refundedTotal: refunds.reduce((sum, r) => sum + r.amount, 0),
  };
}

/**
 * Find an order by its receipt number (MSN- display id). Medusa can't filter
 * on display_id, so scan recent pages (returns are near-always recent).
 */
export async function posFindOrderByNumber(displayId: number): Promise<PosOrderView | null> {
  for (let offset = 0; offset < 1000; offset += 200) {
    const page = await adminFetch<{ orders?: { id: string; display_id: number }[]; count?: number }>(
      `/admin/orders?fields=id,display_id&order=-created_at&limit=200&offset=${offset}`,
    );
    const orders = page?.orders ?? [];
    const hit = orders.find((o) => o.display_id === displayId);
    if (hit) {
      const detail = await adminFetch<{ order?: RawPosOrderDetail }>(
        `/admin/orders/${hit.id}?fields=${encodeURIComponent(POS_ORDER_FIELDS)}`,
      );
      return detail?.order ? toPosOrderView(detail.order) : null;
    }
    if (orders.length < 200) break;
  }
  return null;
}

const lineKey = (l: { productId: string | null; color: string; size: string }) =>
  `${l.productId ?? ""}|${l.color}|${l.size}`;

/**
 * Record a counter refund: append to the order's pos_refunds metadata log and
 * restock the returned lines through the shared stock path. Payment stays a
 * cash-drawer operation (manual methods have no gateway to reverse).
 *
 * Money path — the client is NOT trusted: quantities are validated against
 * what the order actually contains minus what was already returned, and the
 * amount is recomputed here from the order's own paid line totals.
 */
export async function posRefund(input: {
  orderId: string;
  by: string;
  lines: PosRefundLine[];
}): Promise<{ ok: true; amount: number; refunds: PosRefund[] } | { ok: false; error: string }> {
  const data = await adminFetch<{ order?: RawPosOrderDetail & { metadata?: Record<string, unknown> | null } }>(
    `/admin/orders/${input.orderId}?fields=${encodeURIComponent(POS_ORDER_FIELDS)}`,
  );
  if (!data?.order) return { ok: false, error: "Order not found." };
  const order = toPosOrderView(data.order);
  const metadata = data.order.metadata ?? {};
  const existing = parseRefunds(metadata.pos_refunds);

  // Purchased + unit-paid per (product, colour, size); already-returned per key.
  const purchased = new Map<string, { quantity: number; totalPaid: number }>();
  for (const item of order.items) {
    const key = lineKey(item);
    const prev = purchased.get(key) ?? { quantity: 0, totalPaid: 0 };
    purchased.set(key, { quantity: prev.quantity + item.quantity, totalPaid: prev.totalPaid + item.total });
  }
  const returned = new Map<string, number>();
  for (const refund of existing) {
    for (const l of refund.lines) {
      const key = lineKey(l);
      returned.set(key, (returned.get(key) ?? 0) + l.quantity);
    }
  }

  let amount = 0;
  for (const line of input.lines) {
    const key = lineKey(line);
    const bought = purchased.get(key);
    if (!bought) return { ok: false, error: `${line.title} (${line.color}/${line.size}) is not on this order.` };
    const remaining = bought.quantity - (returned.get(key) ?? 0);
    if (line.quantity > remaining) {
      return {
        ok: false,
        error: `${line.title} (${line.color}/${line.size}): only ${remaining} left to return.`,
      };
    }
    amount += Math.round((bought.totalPaid / bought.quantity) * line.quantity);
  }
  // Never refund past what the order took in.
  amount = Math.min(amount, Math.max(0, order.total - order.refundedTotal));
  if (amount <= 0) return { ok: false, error: "Nothing left to refund on this order." };

  const entry: PosRefund = {
    at: new Date().toISOString(),
    by: input.by,
    amount,
    lines: input.lines,
  };
  const refunds = [...existing, entry];
  try {
    await adminPost(`/admin/orders/${input.orderId}`, {
      metadata: { ...metadata, pos_refunds: JSON.stringify(refunds) },
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Refund failed." };
  }
  await incrementSizeStock(
    input.lines
      .filter((l): l is PosRefundLine & { productId: string } => l.productId !== null)
      .map((l) => ({ productId: l.productId, color: l.color, size: l.size, quantity: l.quantity })),
  );
  return { ok: true, amount, refunds };
}

/** YYYY-MM-DD of an ISO timestamp in shop-local time (Asia/Dhaka). */
export function dhakaDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
}

/** Z-report: every counter sale + refund on a shop-local day. */
export async function posDayReport(date: string): Promise<PosDayReport> {
  const fields = "id,display_id,total,currency_code,created_at,metadata";
  type ReportOrder = {
    id: string;
    display_id: number;
    total?: number;
    currency_code?: string;
    created_at: string;
    metadata?: RawPosOrderMeta | null;
  };

  // Paginate newest-first until orders predate the refund horizon: a refund
  // recorded TODAY can sit on a weeks-old sale, so a single fixed-size page
  // would silently drop it from the drawer count (90 days covers any sane
  // exchange window; page cap is a runaway guard).
  const horizon = new Date(`${date}T00:00:00+06:00`);
  horizon.setDate(horizon.getDate() - 90);
  const posOrders: ReportOrder[] = [];
  for (let offset = 0; offset < 5000; offset += 500) {
    const page = await adminFetch<{ orders?: ReportOrder[] }>(
      `/admin/orders?fields=${encodeURIComponent(fields)}&order=-created_at&limit=500&offset=${offset}`,
    );
    const orders = page?.orders ?? [];
    posOrders.push(...orders.filter((o) => o.metadata?.channel === "pos"));
    const oldest = orders[orders.length - 1];
    if (orders.length < 500 || (oldest && new Date(oldest.created_at) < horizon)) break;
  }

  const rows: PosDayRow[] = posOrders
    .filter((o) => dhakaDate(o.created_at) === date)
    .map((o) => ({
      displayId: o.display_id,
      createdAt: o.created_at,
      total: o.total ?? 0,
      method: (o.metadata?.payment_method ?? "pos_cash").replace(/^pos_/, ""),
      txnId: o.metadata?.pos_txn_id,
      cashier: o.metadata?.pos_cashier_name ?? "—",
    }));

  // Refunds count on the day they were processed, whatever day the sale was.
  const refunds = posOrders.flatMap((o) =>
    parseRefunds(o.metadata?.pos_refunds)
      .filter((r) => dhakaDate(r.at) === date)
      .map((r) => ({ ...r, displayId: o.display_id })),
  );

  const sum = (method?: string) =>
    rows.filter((r) => !method || r.method === method).reduce((s, r) => s + r.total, 0);
  const refunded = refunds.reduce((s, r) => s + r.amount, 0);
  const gross = sum();

  const byCashier = [...new Set(rows.map((r) => r.cashier))].map((name) => ({
    name,
    count: rows.filter((r) => r.cashier === name).length,
    total: rows.filter((r) => r.cashier === name).reduce((s, r) => s + r.total, 0),
  }));

  return {
    date,
    rows,
    refunds,
    totals: {
      gross,
      cash: sum("cash"),
      bkash: sum("bkash"),
      nagad: sum("nagad"),
      card: sum("card"),
      refunded,
      net: gross - refunded,
      count: rows.length,
    },
    byCashier,
  };
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
