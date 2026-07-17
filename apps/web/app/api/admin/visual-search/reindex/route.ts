import { NextResponse } from "next/server";
import { pruneProductEmbeddings, upsertProductEmbedding } from "@ecom/cms";
import { fetchProductsForIndex } from "@/lib/commerce";
import { EMBED_DIM, embedUrlServer } from "@/lib/embedding-server";
import { INDEX_LIMIT } from "@/lib/visual-search";

export const maxDuration = 120;

/** Rebuild the visual-search index server-side (no browser). Admin-gated by middleware. */
export async function POST() {
  const products = await fetchProductsForIndex(INDEX_LIMIT);
  let indexed = 0;
  let failed = 0;

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
        indexed += 1;
      }),
    );
  }

  // Prune against the CATALOG, not against successful embeds — a transient
  // image failure must never delete a product's existing (still valid) entry.
  // At the cap we can't see the whole catalog, so skip pruning entirely rather
  // than delete valid entries for products beyond it.
  if (products.length > 0 && products.length < INDEX_LIMIT) {
    await pruneProductEmbeddings(products.map((p) => p.productId));
  }

  return NextResponse.json({ ok: true, indexed, failed, total: products.length });
}
