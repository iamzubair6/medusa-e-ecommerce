import { getVisualSearchQuery } from "@ecom/cms";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** The stored (resized) query photo for the floating "Search By Image" panel. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`vsearch-img:${clientKey(req)}`, 120, 60_000);
  if (!limit.ok) return new Response("Too many requests", { status: 429 });
  const { id } = await ctx.params;
  const record = await getVisualSearchQuery(id).catch(() => null);
  if (!record) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(record.image), {
    headers: {
      "Content-Type": "image/jpeg",
      // Matches the 30-day server-side prune — a personal photo must not
      // outlive its record in shared caches.
      "Cache-Control": "public, max-age=2592000",
    },
  });
}
