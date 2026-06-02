import "server-only";
import { cache } from "react";
import type { ProductSource } from "@ecom/cms";

/** Normalized product shape the storefront renders in cards/rows. */
export interface StoreProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail: string;
  /** formatted price, e.g. "$48.00" */
  price: string;
  badge?: string;
}

export interface ProductOption {
  title: string;
  values: string[];
}

export interface StoreVariant {
  id: string;
  title: string;
  price: string;
  /** option title -> selected value */
  options: Record<string, string>;
}

/** Full product for the detail page. */
export interface StoreProductDetail extends StoreProduct {
  images: string[];
  description: string;
  options: ProductOption[];
  variants: StoreVariant[];
}

export interface ProductListResult {
  products: StoreProduct[];
  page: number;
  totalPages: number;
  total: number;
}

export type ProductSort = "newest" | "price-asc" | "price-desc";

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
const medusaEnabled = () => Boolean(BACKEND && PUBLISHABLE_KEY);

const PLACEHOLDER_IMAGES = [
  "1483985988355-763728e1935b",
  "1485462537746-965f33f7f6a7",
  "1490481651871-ab68de25d43d",
  "1525507119028-ed4c629a60a3",
  "1551232864-3f0890e580d9",
  "1542272604-787c3835535d",
  "1469334031218-e382a71b716b",
  "1483118714900-540cf339fd46",
];

const NAMES = [
  "Oversized Linen Shirt",
  "High-Rise Wide Jean",
  "Ribbed Knit Tank",
  "Satin Slip Dress",
  "Cropped Bomber",
  "Pleated Midi Skirt",
  "Relaxed Blazer",
  "Cotton Poplin Dress",
];

const img = (i: number, w = 600, h = 750) =>
  `https://images.unsplash.com/photo-${PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length]!}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const priceOf = (i: number) => 38 + ((i * 13) % 80);
const fmt = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

/** A single deterministic placeholder product by global index + seed. */
function placeholderProduct(i: number, seed: string): StoreProduct {
  return {
    id: `${seed}-${i}`,
    title: NAMES[i % NAMES.length]!,
    handle: `${seed}-${i}`,
    thumbnail: img(i),
    price: fmt(priceOf(i)),
    badge: i % 5 === 0 ? "New" : undefined,
  };
}

function placeholderProducts(limit: number, seed = "p", offset = 0): StoreProduct[] {
  return Array.from({ length: limit }, (_, k) => placeholderProduct(offset + k, seed));
}

// --- Medusa mapping ---------------------------------------------------------

interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string | null;
  description?: string | null;
  images?: { url: string }[];
  options?: { title: string; values?: { value: string }[] }[];
  variants?: {
    id: string;
    title: string;
    options?: { option?: { title?: string }; value: string }[];
    calculated_price?: { calculated_amount?: number; currency_code?: string };
  }[];
}

function mapCard(p: MedusaProduct, i: number): StoreProduct {
  const price = p.variants?.[0]?.calculated_price;
  const amount = price?.calculated_amount;
  const currency = (price?.currency_code ?? "usd").toUpperCase();
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail || p.images?.[0]?.url || img(i),
    price:
      typeof amount === "number"
        ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)
        : "—",
  };
}

async function medusaFetch(path: string, tags: string[]): Promise<unknown | null> {
  if (!medusaEnabled()) return null;
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY as string },
      next: { revalidate: 60, tags },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/**
 * The store's default region id — required for Medusa to compute prices.
 * Cached per request; the underlying fetch is also cache-tagged.
 */
export const getRegionId = cache(async (): Promise<string | undefined> => {
  const data = (await medusaFetch("/store/regions", ["commerce:regions"])) as
    | { regions?: { id: string }[] }
    | null;
  return data?.regions?.[0]?.id;
});

function sourceToQuery(source: ProductSource, limit: number): string {
  const params = new URLSearchParams({ limit: String(limit) });
  switch (source.kind) {
    case "newest":
    case "bestsellers":
      params.set("order", "-created_at");
      break;
    case "collection":
      params.append("collection_id[]", source.handle);
      break;
    case "ids":
      source.ids.forEach((id) => params.append("id[]", id));
      break;
  }
  return params.toString();
}

// --- Public API -------------------------------------------------------------

/** Products for a CMS product row. Placeholder fallback keeps rows populated. */
export async function fetchProducts(source: ProductSource, limit: number): Promise<StoreProduct[]> {
  const regionId = await getRegionId();
  const region = regionId ? `&region_id=${regionId}` : "";
  const data = (await medusaFetch(
    `/store/products?${sourceToQuery(source, limit)}${region}`,
    ["commerce:products"],
  )) as { products?: MedusaProduct[] } | null;
  const products = data?.products ?? [];
  if (products.length === 0) return placeholderProducts(limit, source.kind);
  return products.map(mapCard);
}

const PLACEHOLDER_PAGES = 3; // pretend the catalog has 3 pages of placeholders

/** Paginated listing for a collection/category handle. */
export async function fetchProductList(opts: {
  handle?: string;
  page?: number;
  limit?: number;
  sort?: ProductSort;
}): Promise<ProductListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = opts.limit ?? 12;
  const seed = opts.handle ?? "all";

  if (medusaEnabled()) {
    const params = new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) });
    params.set(
      "order",
      opts.sort === "price-asc" ? "variants.calculated_price" : opts.sort === "price-desc" ? "-variants.calculated_price" : "-created_at",
    );
    const regionId = await getRegionId();
    if (regionId) params.set("region_id", regionId);
    const data = (await medusaFetch(`/store/products?${params.toString()}`, [
      "commerce:products",
      `commerce:list:${seed}`,
    ])) as { products?: MedusaProduct[]; count?: number } | null;
    if (data?.products?.length) {
      const total = data.count ?? data.products.length;
      return {
        products: data.products.map(mapCard),
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }
  }

  // Placeholder fallback
  const total = limit * PLACEHOLDER_PAGES;
  const offset = (page - 1) * limit;
  let products = placeholderProducts(Math.min(limit, Math.max(0, total - offset)), seed, offset);
  if (opts.sort === "price-asc") {
    products = [...products].sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  } else if (opts.sort === "price-desc") {
    products = [...products].sort((a, b) => parsePrice(b.price) - parsePrice(a.price));
  }
  return { products, page, total, totalPages: PLACEHOLDER_PAGES };
}

const parsePrice = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

/** Full product detail by handle, or null if not found. */
export async function fetchProductByHandle(handle: string): Promise<StoreProductDetail | null> {
  if (medusaEnabled()) {
    const regionId = await getRegionId();
    const region = regionId ? `&region_id=${regionId}` : "";
    const data = (await medusaFetch(
      `/store/products?handle=${encodeURIComponent(handle)}&fields=*variants.calculated_price,*options,*images${region}`,
      [`commerce:product:${handle}`],
    )) as { products?: MedusaProduct[] } | null;
    const p = data?.products?.[0];
    if (p) return mapDetail(p);
  }
  return placeholderDetail(handle);
}

function mapDetail(p: MedusaProduct): StoreProductDetail {
  const card = mapCard(p, 0);
  return {
    ...card,
    images: (p.images?.map((im) => im.url) ?? [card.thumbnail]).slice(0, 6),
    description: p.description ?? "",
    options: (p.options ?? []).map((o) => ({
      title: o.title,
      values: [...new Set((o.values ?? []).map((v) => v.value))],
    })),
    variants: (p.variants ?? []).map((v) => ({
      id: v.id,
      title: v.title,
      price:
        typeof v.calculated_price?.calculated_amount === "number"
          ? fmt(v.calculated_price.calculated_amount)
          : card.price,
      options: Object.fromEntries((v.options ?? []).map((o) => [o.option?.title ?? "Option", o.value])),
    })),
  };
}

function placeholderDetail(handle: string): StoreProductDetail {
  // derive a stable index from the handle suffix when present
  const m = handle.match(/(\d+)$/);
  const i = m ? Number(m[1]) : Math.abs(hash(handle)) % NAMES.length;
  const sizes = ["XS", "S", "M", "L", "XL"];
  const base = priceOf(i);
  return {
    id: handle,
    title: NAMES[i % NAMES.length]!,
    handle,
    thumbnail: img(i),
    price: fmt(base),
    images: [img(i, 900, 1125), img(i + 1, 900, 1125), img(i + 2, 900, 1125)],
    description:
      "Cut from premium fabric with a considered, relaxed fit. A versatile piece designed to move with you from day to night.",
    options: [{ title: "Size", values: sizes }],
    variants: sizes.map((s) => ({ id: `${handle}-${s}`, title: s, price: fmt(base), options: { Size: s } })),
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/** Visually/categorically similar products for the PDP. */
export async function fetchSimilarProducts(handle: string, limit = 4): Promise<StoreProduct[]> {
  const m = handle.match(/(\d+)$/);
  const base = m ? Number(m[1]) : Math.abs(hash(handle));
  return Array.from({ length: limit }, (_, k) => placeholderProduct(base + k + 1, "sim"));
}
