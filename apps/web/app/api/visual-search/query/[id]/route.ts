import { NextResponse } from "next/server";
import { getVisualSearchQuery, parseVisualQueryParts } from "@ecom/cms";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Query metadata for the persistent Search-By-Image panel (hotspot dots +
 * division) — vectors stay server-side.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`vsearch-meta:${clientKey(req)}`, 120, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { id } = await ctx.params;
  const record = await getVisualSearchQuery(id).catch(() => null);
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    {
      division: record.division,
      parts: parseVisualQueryParts(record.parts).map((p) => ({
        label: p.label,
        cx: p.cx,
        cy: p.cy,
        box: p.box,
      })),
    },
    { headers: { "Cache-Control": "public, max-age=2592000" } },
  );
}
