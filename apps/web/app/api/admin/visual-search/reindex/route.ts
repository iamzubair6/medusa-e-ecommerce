import { NextResponse } from "next/server";
import { pruneProductEmbeddings, upsertProductEmbedding } from "@ecom/cms";
import { fetchProductsForIndex } from "@/lib/commerce";
import { EMBED_DIM, embedUrlServer } from "@/lib/embedding-server";

export const maxDuration = 120;

/** Rebuild the visual-search index server-side (no browser). Admin-gated by middleware. */
export async function POST() {
  const products = await fetchProductsForIndex(200);
  let indexed = 0;
  let failed = 0;
  const keep: string[] = [];

  // Small concurrency to keep memory + sockets sane.
  const BATCH = 5;
  for (let i = 0; i < products.length; i += BATCH) {
    const slice = products.slice(i, i + BATCH);
    await Promise.all(
      slice.map(async (p) => {
        const vector = await embedUrlServer(p.thumbnail);
        if (!vector) {
          failed += 1;
          return;
        }
        await upsertProductEmbedding({
          productId: p.productId,
          handle: p.handle,
          title: p.title,
          thumbnail: p.thumbnail,
          price: p.price,
          dim: EMBED_DIM,
          vector,
        });
        keep.push(p.productId);
        indexed += 1;
      }),
    );
  }

  // Drop embeddings for products no longer indexed (removed / unpriced).
  if (keep.length) await pruneProductEmbeddings(keep);

  return NextResponse.json({ ok: true, indexed, failed, total: products.length });
}
