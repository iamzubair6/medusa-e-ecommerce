import "server-only";
import { getProductEmbedding, listProductEmbeddings, upsertProductEmbedding } from "@ecom/cms";
import { EMBED_DIM, embedUrlServer } from "@/lib/embedding-server";
import { fetchProductsForIndex, getCatalogCardsByHandle, type StoreProduct } from "@/lib/commerce";

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

/**
 * Rank all indexed products against a query vector (weak matches dropped).
 * `floor: false` skips the relevance cutoff — used by garment-part searches,
 * where a category allowlist does the scoping and the vector only orders
 * (a crop of shorts scores low against full-body thumbnails across the board).
 */
export async function rankByVector(
  query: number[],
  limit: number,
  opts: { exclude?: string; cap?: number; floor?: boolean } = {},
): Promise<SimilarResult[]> {
  const all = await listProductEmbeddings();
  const ranked = all
    .filter((e) => e.productId !== opts.exclude && e.vector.length === query.length)
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
  const floor = opts.floor === false ? -1 : Math.max(MIN_SCORE, top - TOP_MARGIN);
  return ranked.filter((r) => r.score >= floor).slice(0, Math.min(limit, opts.cap ?? MAX_RESULTS));
}

/** Products visually similar to an already-indexed product. */
export async function similarToProduct(productId: string, limit: number): Promise<SimilarResult[]> {
  const e = await getProductEmbedding(productId);
  if (!e) return [];
  return rankByVector(e.vector, limit, { exclude: productId });
}

/**
 * Ranked similar products AS CARDS (with colors/sizes/variants) in similarity
 * order — powers the Shop Similar modal grid (size facets + quick-add). Ranks
 * without the relevance floor so the modal always has a full grid to sort/filter.
 */
export async function similarCards(
  ranked: SimilarResult[],
): Promise<StoreProduct[]> {
  const byHandle = await getCatalogCardsByHandle();
  return ranked.map((r) => byHandle.get(r.handle)).filter((p): p is StoreProduct => Boolean(p));
}

/** Cards similar to an indexed product (Shop Similar initial load). */
export async function similarProductCards(productId: string, limit: number): Promise<StoreProduct[]> {
  const e = await getProductEmbedding(productId);
  if (!e) return [];
  const ranked = await rankByVector(e.vector, limit, { exclude: productId, cap: limit, floor: false });
  return similarCards(ranked);
}

/**
 * Cards ranked by an arbitrary query/part vector (Shop Similar dot / upload).
 * An optional category allowlist keeps a garment-part search on-category
 * (top → tops, not visually-similar leggings) — matching the /search behavior.
 */
export async function similarCardsByVector(
  vector: number[],
  limit: number,
  categories?: string[],
): Promise<StoreProduct[]> {
  const ranked = await rankByVector(vector, limit, { cap: limit, floor: false });
  const cards = await similarCards(ranked);
  if (!categories?.length) return cards;
  const allow = new Set(categories);
  const scoped = cards.filter((p) => (p.categoryHandles ?? []).some((h) => allow.has(h)));
  // If the allowlist over-filters (catalog gap), fall back to the unscoped ranking.
  return scoped.length > 0 ? scoped : cards;
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
