import "server-only";
import { getProductEmbedding, listProductEmbeddings } from "@ecom/cms";

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
