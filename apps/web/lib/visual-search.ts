import "server-only";
import { getProductEmbedding, listProductEmbeddings, upsertProductEmbedding } from "@ecom/cms";
import { EMBED_DIM, embedUrlServer } from "@/lib/embedding-server";
import { fetchProductsForIndex } from "@/lib/commerce";

/** Shared cap for index reads — the reindex prune and admin stats must agree. */
export const INDEX_LIMIT = 500;

export interface SimilarResult {
  productId: string;
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
  score: number;
}

/** Cosine similarity of two equal-length vectors (assumed L2-normalized). */
function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return -1;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i]! * b[i]!;
  return dot;
}

/** Rank all indexed products against a query vector. */
export async function rankByVector(
  query: number[],
  limit: number,
  excludeProductId?: string,
): Promise<SimilarResult[]> {
  const all = await listProductEmbeddings();
  return all
    .filter((e) => e.productId !== excludeProductId && e.vector.length === query.length)
    .map((e) => ({
      productId: e.productId,
      handle: e.handle,
      title: e.title,
      thumbnail: e.thumbnail,
      price: e.price,
      score: cosine(query, e.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Products visually similar to an already-indexed product. */
export async function similarToProduct(productId: string, limit: number): Promise<SimilarResult[]> {
  const e = await getProductEmbedding(productId);
  if (!e) return [];
  return rankByVector(e.vector, limit, productId);
}

/**
 * (Re)index one product right after an admin mutation — keeps the visual-search
 * index current without waiting for a manual full reindex. Best-effort: a
 * failure never breaks the mutation that triggered it.
 */
export async function indexProductById(productId: string): Promise<boolean> {
  try {
    const products = await fetchProductsForIndex(INDEX_LIMIT);
    const p = products.find((x) => x.productId === productId);
    if (!p?.thumbnail) return false;
    const vector = await embedUrlServer(p.thumbnail);
    if (!vector) return false;
    await upsertProductEmbedding({ ...p, dim: EMBED_DIM, vector });
    return true;
  } catch {
    return false;
  }
}
