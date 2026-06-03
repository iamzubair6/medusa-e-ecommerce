import { NextResponse } from "next/server";
import { z } from "zod";
import { pruneProductEmbeddings, upsertProductEmbedding } from "@ecom/cms";
import { EMBED_DIM } from "@/lib/embedding-client";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        handle: z.string().min(1),
        title: z.string().min(1),
        thumbnail: z.string().min(1),
        price: z.string(),
        vector: z.array(z.number()).length(EMBED_DIM),
      }),
    )
    .min(1)
    .max(200),
});

/** Store client-computed product image embeddings. Admin-gated by middleware. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  let count = 0;
  for (const item of parsed.data.items) {
    await upsertProductEmbedding({ ...item, dim: EMBED_DIM });
    count += 1;
  }
  // Drop embeddings for products that are no longer indexed (removed/unpriced).
  await pruneProductEmbeddings(parsed.data.items.map((i) => i.productId));
  return NextResponse.json({ ok: true, indexed: count });
}
