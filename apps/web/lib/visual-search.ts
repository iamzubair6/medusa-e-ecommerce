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

/**
 * Relevance cutoff: only results that are genuinely close make the panel.
 * Without this, a query always returned the top `limit` products no matter how
 * poor the match — on a small catalog that meant "most of the store, for any
 * photo". CLIP cosine scores: same garment ≈ 0.8+, related garment ≈ top−0.07,
 * unrelated ≈ 0.5–0.65.
 */
const MIN_SCORE = 0.6;
const TOP_MARGIN = 0.07;
const MAX_RESULTS = 12;

/** Rank all indexed products against a query vector (weak matches dropped). */
export async function rankByVector(
  query: number[],
  limit: number,
  excludeProductId?: string,
): Promise<SimilarResult[]> {
  const all = await listProductEmbeddings();
  const ranked = all
    .filter((e) => e.productId !== excludeProductId && e.vector.length === query.length)
    .map((e) => ({
      productId: e.productId,
      handle: e.handle,
      title: e.title,
      thumbnail: e.thumbnail,
      price: e.price,
      score: cosine(query, e.vector),
    }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  const floor = Math.max(MIN_SCORE, top - TOP_MARGIN);
  return ranked.filter((r) => r.score >= floor).slice(0, Math.min(limit, MAX_RESULTS));
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
