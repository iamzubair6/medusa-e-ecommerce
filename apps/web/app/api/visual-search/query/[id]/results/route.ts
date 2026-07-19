import { NextResponse } from "next/server";
import { getSiteSetting, getVisualSearchQuery, parseVisualQueryParts } from "@ecom/cms";
import { similarCardsByVector } from "@/lib/visual-search";
import { listCategories } from "@/lib/commerce";
import { parseVisualSearchSettings } from "@/lib/visual-search-settings";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

/**
 * Similar-product CARDS for a persisted image query, optionally scoped to one
 * detected garment (?part=n). Powers the Shop Similar modal's dot re-scope and
 * "upload a different photo" without a full page navigation.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`vsearch-results:${clientKey(req)}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await ctx.params;
  const record = await getVisualSearchQuery(id).catch(() => null);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parts = parseVisualQueryParts(record.parts);
  const partRaw = new URL(req.url).searchParams.get("part");
  const partIdx =
    partRaw !== null && Number.isInteger(Number(partRaw)) && Number(partRaw) >= 0 && Number(partRaw) < parts.length
      ? Number(partRaw)
      : undefined;
  const vector = partIdx !== undefined ? parts[partIdx]!.vector : record.vector;

  // Scope a garment-part search to its categories (top → tops, etc.), same as
  // the /search page — only handles present in the live catalog apply.
  let categories: string[] | undefined;
  if (partIdx !== undefined) {
    const [settingRaw, cats] = await Promise.all([
      getSiteSetting("visualSearch").catch(() => null),
      listCategories(),
    ]);
    const mapped = parseVisualSearchSettings(settingRaw).partCategories[parts[partIdx]!.label] ?? [];
    const live = new Set(cats.map((c) => c.handle));
    categories = mapped.filter((h) => live.has(h));
  }

  const products = await similarCardsByVector(vector, 24, categories);
  return NextResponse.json({ products });
}
