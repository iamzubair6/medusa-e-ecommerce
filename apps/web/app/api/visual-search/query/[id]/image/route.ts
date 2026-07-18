import { getVisualSearchQuery } from "@ecom/cms";

/** The stored (resized) query photo for the floating "Search By Image" panel. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const record = await getVisualSearchQuery(id).catch(() => null);
  if (!record) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(record.image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
