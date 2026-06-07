import type { ProductSort } from "@/lib/commerce";

const SORTS: ProductSort[] = ["newest", "price-asc", "price-desc"];
const COLUMNS = [3, 4, 5] as const;
export type Columns = (typeof COLUMNS)[number];

export interface ListingParams {
  sort: ProductSort;
  page: number;
  columns: Columns;
  division?: string;
  category?: string; // content-category refinement (?cat=)
  colors: string[];
  sizes: string[];
  occasion: string[];
  style: string[];
  trend: string[];
}

const csv = (v?: string) =>
  v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];

/** Normalize raw search params into typed listing params. */
export function parseListingParams(sp: Record<string, string | string[] | undefined>): ListingParams {
  const get = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const sort = (SORTS.includes(get("sort") as ProductSort) ? get("sort") : "newest") as ProductSort;
  const page = Math.max(1, Number(get("page")) || 1);
  const colN = Number(get("columns"));
  const columns = (COLUMNS.includes(colN as Columns) ? colN : 4) as Columns;
  return {
    sort,
    page,
    columns,
    division: get("division") || undefined,
    category: get("cat") || undefined,
    colors: csv(get("color")),
    sizes: csv(get("size")),
    occasion: csv(get("occasion")),
    style: csv(get("style")),
    trend: csv(get("trend")),
  };
}

/** Serialize listing params back into a query string (omitting defaults). */
export function listingQuery(p: ListingParams, overrides: Partial<ListingParams> = {}): string {
  const m = { ...p, ...overrides };
  const q = new URLSearchParams();
  if (m.sort !== "newest") q.set("sort", m.sort);
  if (m.columns !== 4) q.set("columns", String(m.columns));
  if (m.page > 1) q.set("page", String(m.page));
  if (m.division) q.set("division", m.division);
  if (m.category) q.set("cat", m.category);
  if (m.colors.length) q.set("color", m.colors.join(","));
  if (m.sizes.length) q.set("size", m.sizes.join(","));
  if (m.occasion.length) q.set("occasion", m.occasion.join(","));
  if (m.style.length) q.set("style", m.style.join(","));
  if (m.trend.length) q.set("trend", m.trend.join(","));
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** "summer-edit" -> "Summer Edit" */
export function prettifyHandle(handle: string): string {
  return handle.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
