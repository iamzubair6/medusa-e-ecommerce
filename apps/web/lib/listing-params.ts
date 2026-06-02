import type { ProductSort } from "@/lib/commerce";

const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc"];

/** Normalize raw search params into a typed sort + page. */
export function parseListingParams(sp: { sort?: string; page?: string }) {
  const sort: ProductSort = SORTS.includes(sp.sort as ProductSort) ? (sp.sort as ProductSort) : "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  return { sort, page };
}

/** "summer-edit" -> "Summer Edit" */
export function prettifyHandle(handle: string): string {
  return handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
