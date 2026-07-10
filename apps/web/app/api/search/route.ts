import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRegionId } from "@/lib/commerce";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Public product-search proxy for the navbar autocomplete. Proxies the Medusa
 * Store API `q` search so the publishable key stays server-side and responses
 * are trimmed to what the suggestion list needs.
 */

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;

// Time-boxed like lib/commerce.ts#medusaFetch — a cold Render backend hangs
// the socket instead of erroring, so an un-time-boxed fetch would block the
// suggestion request indefinitely.
const SEARCH_TIMEOUT_MS = 8_000;

const querySchema = z.object({
  q: z.string().trim().min(2).max(100),
  limit: z.coerce.number().int().min(1).max(10).default(6),
  offset: z.coerce.number().int().min(0).max(500).default(0),
});

interface RawVariant {
  calculated_price?: { calculated_amount?: number; currency_code?: string };
}
interface RawProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string | null;
  variants?: RawVariant[];
}

/** Taka (৳) with no decimals; Intl for other currencies (mirrors lib/commerce.ts). */
function money(amount: number, currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "BDT") return `৳${Math.round(amount).toLocaleString("en-US")}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);
}

/** Lowest live variant price for the suggestion row; "—" when unpriced. */
function minPrice(p: RawProduct): string {
  let min: { amount: number; currency: string } | undefined;
  for (const v of p.variants ?? []) {
    const amount = v.calculated_price?.calculated_amount;
    if (typeof amount !== "number") continue;
    if (!min || amount < min.amount) {
      min = { amount, currency: v.calculated_price?.currency_code ?? "bdt" };
    }
  }
  return min ? money(min.amount, min.currency) : "—";
}

export async function GET(req: NextRequest) {
  // Same guard as /api/visual-search — every unique q hits the backend.
  const limited = rateLimit(`search:${clientKey(req)}`, 30, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search query" }, { status: 400 });
  }
  if (!BACKEND || !KEY) {
    return NextResponse.json({ error: "Search is unavailable" }, { status: 503 });
  }

  const { q, limit, offset } = parsed.data;
  try {
    const regionId = await getRegionId();
    const params = new URLSearchParams({
      q,
      limit: String(limit),
      offset: String(offset),
      fields: "id,title,handle,thumbnail,*variants.calculated_price",
    });
    if (regionId) params.set("region_id", regionId);

    const res = await fetch(`${BACKEND}/store/products?${params.toString()}`, {
      headers: { "x-publishable-api-key": KEY },
      next: { revalidate: 30, tags: ["commerce:products"] },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Search failed" }, { status: 502 });
    }

    const data = (await res.json()) as { products?: RawProduct[] };
    const results = (data.products ?? []).map((p) => ({
      id: p.id,
      handle: p.handle,
      title: p.title,
      thumbnail: p.thumbnail ?? "",
      price: minPrice(p),
    }));
    return NextResponse.json({ results });
  } catch {
    // Timeout / network failure — the client hides the dropdown on error.
    return NextResponse.json({ error: "Search failed" }, { status: 502 });
  }
}
