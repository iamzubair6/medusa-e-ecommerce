import "server-only";
import { cache } from "react";
import type { ProductSource } from "@ecom/cms";

const LOW_STOCK = 5;

/** Money formatter — Taka (৳) with no decimals; Intl for other currencies. */
function money(amount: number, currency = "BDT"): string {
  const cur = currency.toUpperCase();
  if (cur === "BDT") return `৳${Math.round(amount).toLocaleString("en-US")}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(amount);
}

export interface StoreOffer {
  type: "bogo" | "discount" | "custom";
  label: string;
  percent?: number;
}

/** Normalized product for cards/rows. */
export interface StoreProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail: string;
  price: string;
  originalPrice?: string;
  /** % off when on sale (price < original), for an auto "-X%" pill */
  discountPercent?: number;
  offer?: StoreOffer;
  badge?: string;
  /** selectable colors for the card (swatch, image, quick-add sizes) */
  cardColors?: CardColor[];
  // --- merchandising facets (from metadata / taxonomy) ---
  division?: string;
  categoryHandles?: string[];
  collectionHandle?: string;
  occasion?: string[];
  style?: string[];
  trend?: string[];
}

export interface CardColor {
  name: string;
  swatch: string;
  thumbnail: string;
  sizes: StoreSizeOption[];
}

export interface StoreSizeOption {
  size: string;
  stock: number;
  lowStock: boolean;
  variantId?: string;
}

export interface StoreColor {
  name: string;
  swatch: string;
  price: string;
  originalPrice?: string;
  images: string[];
  sizes: StoreSizeOption[];
}

/** Full product for the detail page (variant/color aware). */
export interface StoreProductDetail extends StoreProduct {
  description: string;
  images: string[];
  colors: StoreColor[];
  material?: string;
  care?: string;
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

const priceOf = (i: number) => 800 + ((i * 130) % 1600); // BDT-ish placeholder prices

function placeholderProduct(i: number, seed: string): StoreProduct {
  return {
    id: `${seed}-${i}`,
    title: NAMES[i % NAMES.length]!,
    handle: `${seed}-${i}`,
    thumbnail: img(i),
    price: money(priceOf(i)),
    badge: i % 5 === 0 ? "New" : undefined,
  };
}

function placeholderProducts(limit: number, seed = "p", offset = 0): StoreProduct[] {
  return Array.from({ length: limit }, (_, k) => placeholderProduct(offset + k, seed));
}

// --- Medusa types -----------------------------------------------------------

interface MedusaVariant {
  id: string;
  title: string;
  options?: { value: string; option?: { title?: string } }[];
  calculated_price?: { calculated_amount?: number; original_amount?: number; currency_code?: string };
}
interface ProductMeta {
  swatches?: Record<string, string>;
  colorImages?: Record<string, string[]>;
  colorPrices?: Record<string, number>;
  colorOriginalPrices?: Record<string, number>;
  sizeStock?: Record<string, Record<string, number>>;
  offer?: StoreOffer;
  division?: string;
  occasion?: string[];
  style?: string[];
  trend?: string[];
  material?: string;
  care?: string;
}
interface MedusaProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string | null;
  description?: string | null;
  images?: { url: string }[];
  options?: { title: string; values?: { value: string }[] }[];
  variants?: MedusaVariant[];
  metadata?: ProductMeta | null;
  categories?: { handle: string; name?: string }[];
  collection?: { handle: string; title?: string } | null;
}

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

function currencyOf(p: MedusaProduct): string {
  return (p.variants?.[0]?.calculated_price?.currency_code ?? "bdt").toUpperCase();
}

/**
 * Live per-color pricing from the variants' calculated_price — this is the
 * source of truth because it reflects active sales / price lists. Each color
 * maps to its lowest variant price (amount) + the list price (original).
 */
function variantColorPricing(p: MedusaProduct): Map<string, { amount: number; original?: number }> {
  const map = new Map<string, { amount: number; original?: number }>();
  for (const v of p.variants ?? []) {
    const opts: Record<string, string> = {};
    for (const o of v.options ?? []) if (o.option?.title) opts[o.option.title] = o.value;
    const color = opts.Color ?? "Default";
    const amount = v.calculated_price?.calculated_amount;
    if (typeof amount !== "number") continue;
    const original = v.calculated_price?.original_amount;
    const cur = map.get(color);
    if (!cur || amount < cur.amount) map.set(color, { amount, original });
  }
  return map;
}

/** Per-color price string + compare-at + discount %, preferring live price over metadata. */
function colorPrice(
  p: MedusaProduct,
  color: string,
  live: Map<string, { amount: number; original?: number }>,
  cur: string,
): { price: string; original?: string; discountPercent?: number } {
  const l = live.get(color);
  const metaPrice = p.metadata?.colorPrices?.[color];
  const metaOriginal = p.metadata?.colorOriginalPrices?.[color];
  const amount = l?.amount ?? metaPrice;
  if (typeof amount !== "number") return { price: "—" };
  // On-sale (price list) wins; else fall back to the manual compare-at price.
  const onSale = typeof l?.original === "number" && l.original > l.amount;
  const originalNum = onSale ? l!.original! : metaOriginal;
  const discountPercent =
    typeof originalNum === "number" && originalNum > amount
      ? Math.round(((originalNum - amount) / originalNum) * 100)
      : undefined;
  return {
    price: money(amount, cur),
    original: originalNum ? money(originalNum, cur) : undefined,
    discountPercent,
  };
}

/** Lowest-priced color for card display, with its original price + discount %. */
function cardPricing(p: MedusaProduct): { price: string; original?: string; discountPercent?: number } {
  const cur = currencyOf(p);
  const live = variantColorPricing(p);
  if (live.size) {
    const minColor = [...live.entries()].reduce((a, b) => (b[1].amount < a[1].amount ? b : a))[0];
    return colorPrice(p, minColor, live, cur);
  }
  // No live prices — fall back to metadata, then dash.
  const colorPrices = p.metadata?.colorPrices;
  if (colorPrices && Object.keys(colorPrices).length) {
    const [minColor, minPrice] = Object.entries(colorPrices).reduce((a, b) => (b[1] < a[1] ? b : a));
    const orig = p.metadata?.colorOriginalPrices?.[minColor];
    const discountPercent = orig && orig > minPrice ? Math.round(((orig - minPrice) / orig) * 100) : undefined;
    return { price: money(minPrice, cur), original: orig ? money(orig, cur) : undefined, discountPercent };
  }
  return { price: "—" };
}

/**
 * Build per-color cards from the ACTUAL variants (source of truth for which
 * color/size combos exist), enriched with metadata (swatch, images, stock).
 * Deleting a variant in Medusa removes that size/color from the storefront.
 */
function buildCardColors(p: MedusaProduct): CardColor[] {
  const meta = p.metadata ?? {};
  const allImages = (p.images ?? []).map((im) => im.url);
  const byColor = variantsByColor(p);

  return [...byColor.keys()].map((name) => {
    const stockMap = meta.sizeStock?.[name] ?? {};
    const sizes: StoreSizeOption[] = (byColor.get(name) ?? []).map((v) => {
      const stock = stockMap[v.size] ?? 50;
      return { size: v.size, stock, lowStock: stock > 0 && stock <= LOW_STOCK, variantId: v.variantId };
    });
    const imgs = meta.colorImages?.[name] ?? [];
    return {
      name,
      swatch: meta.swatches?.[name] ?? (name === "Default" ? "#1b1b1b" : "#cccccc"),
      thumbnail: imgs[0] ?? allImages[0] ?? p.thumbnail ?? "",
      sizes,
    };
  });
}

function mapCard(p: MedusaProduct, i: number): StoreProduct {
  const { price, original, discountPercent } = cardPricing(p);
  const cardColors = buildCardColors(p);
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    thumbnail: p.thumbnail || cardColors[0]?.thumbnail || p.images?.[0]?.url || img(i),
    price,
    originalPrice: original,
    discountPercent,
    offer: p.metadata?.offer,
    // Prefer an explicit offer label; otherwise auto "-X%" when on sale.
    badge: p.metadata?.offer?.label ?? (discountPercent ? `-${discountPercent}%` : undefined),
    cardColors,
    division: p.metadata?.division,
    categoryHandles: (p.categories ?? []).map((c) => c.handle),
    collectionHandle: p.collection?.handle,
    occasion: strArr(p.metadata?.occasion),
    style: strArr(p.metadata?.style),
    trend: strArr(p.metadata?.trend),
  };
}

function variantsByColor(p: MedusaProduct): Map<string, { size: string; variantId: string }[]> {
  const map = new Map<string, { size: string; variantId: string }[]>();
  for (const v of p.variants ?? []) {
    const opts: Record<string, string> = {};
    for (const o of v.options ?? []) if (o.option?.title) opts[o.option.title] = o.value;
    const color = opts.Color ?? "Default";
    const size = opts.Size ?? v.title;
    if (!map.has(color)) map.set(color, []);
    map.get(color)!.push({ size, variantId: v.id });
  }
  return map;
}

function mapDetail(p: MedusaProduct): StoreProductDetail {
  const card = mapCard(p, 0);
  const cur = currencyOf(p);
  const meta = p.metadata ?? {};
  const allImages = (p.images ?? []).map((im) => im.url);

  const live = variantColorPricing(p);
  const colors: StoreColor[] = buildCardColors(p).map((cc) => {
    const { price, original } = colorPrice(p, cc.name, live, cur);
    const colorImgs = meta.colorImages?.[cc.name];
    return {
      name: cc.name,
      swatch: cc.swatch,
      price: price !== "—" ? price : card.price,
      originalPrice: original ?? (price === "—" ? card.originalPrice : undefined),
      images: colorImgs?.length ? colorImgs : allImages.length ? allImages : [card.thumbnail],
      sizes: cc.sizes,
    };
  });

  return {
    ...card,
    description: p.description ?? "",
    material: p.metadata?.material,
    care: p.metadata?.care,
    images: allImages.length ? allImages : [card.thumbnail],
    colors: colors.length
      ? colors
      : [{ name: "Default", swatch: "#1b1b1b", price: card.price, images: allImages.length ? allImages : [card.thumbnail], sizes: [] }],
  };
}

async function medusaFetch(path: string, tags: string[]): Promise<unknown | null> {
  if (!medusaEnabled()) return null;
  try {
    const res = await fetch(`${BACKEND}${path}`, {
      headers: { "x-publishable-api-key": PUBLISHABLE_KEY as string },
      next: { revalidate: 15, tags },
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** Resolve a category handle → id (cached). Returns undefined when not found. */
export const getCategoryId = cache(async (handle: string): Promise<string | undefined> => {
  const data = (await medusaFetch(
    `/store/product-categories?handle=${encodeURIComponent(handle)}&fields=id,handle`,
    [`commerce:category:${handle}`],
  )) as { product_categories?: { id: string }[] } | null;
  return data?.product_categories?.[0]?.id;
});

/** Resolve a collection handle → id (cached). Returns undefined when not found. */
export const getCollectionId = cache(async (handle: string): Promise<string | undefined> => {
  const data = (await medusaFetch(
    `/store/collections?handle=${encodeURIComponent(handle)}&fields=id,handle`,
    [`commerce:collection:${handle}`],
  )) as { collections?: { id: string }[] } | null;
  return data?.collections?.[0]?.id;
});

/** Store region — prefers the BDT (Bangladesh) region. */
export const getRegionId = cache(async (): Promise<string | undefined> => {
  const data = (await medusaFetch("/store/regions", ["commerce:regions"])) as
    | { regions?: { id: string; currency_code?: string }[] }
    | null;
  const regions = data?.regions ?? [];
  return (regions.find((r) => r.currency_code === "bdt") ?? regions[0])?.id;
});

const CARD_FIELDS =
  "fields=title,handle,thumbnail,metadata,categories.handle,categories.name,collection.handle,collection.title,*images,*variants.calculated_price,*variants.options,*variants.options.option";
const DETAIL_FIELDS =
  "fields=title,handle,description,thumbnail,metadata,categories.handle,categories.name,collection.handle,collection.title,*images,*options,*variants.calculated_price,*variants.options,*variants.options.option";

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

export async function fetchProducts(source: ProductSource, limit: number): Promise<StoreProduct[]> {
  const regionId = await getRegionId();
  const region = regionId ? `&region_id=${regionId}` : "";
  const data = (await medusaFetch(
    `/store/products?${sourceToQuery(source, limit)}&${CARD_FIELDS}${region}`,
    ["commerce:products"],
  )) as { products?: MedusaProduct[] } | null;
  const products = data?.products ?? [];
  if (products.length === 0) return placeholderProducts(limit, source.kind);
  return products.map(mapCard).filter(hasPrice);
}

/** Hide products with no price in the active currency (e.g. legacy demo items). */
const hasPrice = (p: StoreProduct) => p.price !== "—";

const PLACEHOLDER_PAGES = 3;

export async function fetchProductList(opts: {
  handle?: string;
  /** "category" or "collection" filters by that taxonomy; omitted = all products. */
  kind?: "category" | "collection";
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
      opts.sort === "price-asc"
        ? "variants.calculated_price"
        : opts.sort === "price-desc"
          ? "-variants.calculated_price"
          : "-created_at",
    );
    const regionId = await getRegionId();
    if (regionId) params.set("region_id", regionId);
    // Scope to a category/collection when requested (handle resolved to an id).
    if (opts.kind && opts.handle) {
      const id =
        opts.kind === "category"
          ? await getCategoryId(opts.handle)
          : await getCollectionId(opts.handle);
      if (id) params.append(opts.kind === "category" ? "category_id[]" : "collection_id[]", id);
      else return { products: [], page, total: 0, totalPages: 1 }; // unknown taxonomy → empty
    }
    const data = (await medusaFetch(`/store/products?${params.toString()}&${CARD_FIELDS}`, [
      "commerce:products",
      `commerce:list:${seed}`,
    ])) as { products?: MedusaProduct[]; count?: number } | null;
    if (data?.products?.length) {
      const mapped = data.products.map(mapCard).filter(hasPrice);
      const total = data.count ?? mapped.length;
      return {
        products: mapped,
        page,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    }
    // A real (filtered) category/collection with no products shows empty — not demo fillers.
    if (opts.kind) return { products: [], page, total: 0, totalPages: 1 };
  }

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

export async function fetchProductByHandle(handle: string): Promise<StoreProductDetail | null> {
  if (medusaEnabled()) {
    const regionId = await getRegionId();
    const region = regionId ? `&region_id=${regionId}` : "";
    const data = (await medusaFetch(
      `/store/products?handle=${encodeURIComponent(handle)}&${DETAIL_FIELDS}${region}`,
      [`commerce:product:${handle}`],
    )) as { products?: MedusaProduct[] } | null;
    const p = data?.products?.[0];
    if (p) return mapDetail(p);
  }
  return placeholderDetail(handle);
}

function placeholderDetail(handle: string): StoreProductDetail {
  const m = handle.match(/(\d+)$/);
  const i = m ? Number(m[1]) : Math.abs(hash(handle)) % NAMES.length;
  const base = priceOf(i);
  const images = [img(i, 900, 1125), img(i + 1, 900, 1125), img(i + 2, 900, 1125)];
  const sizes: StoreSizeOption[] = ["XS", "S", "M", "L", "XL"].map((size, k) => ({
    size,
    stock: k === 1 ? 3 : 30,
    lowStock: k === 1,
    variantId: `${handle}-${size}`,
  }));
  return {
    id: handle,
    title: NAMES[i % NAMES.length]!,
    handle,
    thumbnail: img(i),
    price: money(base),
    description:
      "Cut from premium fabric with a considered, relaxed fit. A versatile piece designed to move with you from day to night.",
    images,
    colors: [{ name: "Default", swatch: "#1b1b1b", price: money(base), images, sizes }],
  };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

/** Minimal product records for building the visual-search index. */
export async function fetchProductsForIndex(
  limit = 100,
): Promise<{ productId: string; handle: string; title: string; thumbnail: string; price: string }[]> {
  const regionId = await getRegionId();
  const region = regionId ? `&region_id=${regionId}` : "";
  const data = (await medusaFetch(`/store/products?limit=${limit}&${CARD_FIELDS}${region}`, [
    "commerce:products",
  ])) as { products?: MedusaProduct[] } | null;
  return (data?.products ?? [])
    .map((p, i) => mapCard(p, i))
    .filter(hasPrice)
    .map((c) => ({ productId: c.id, handle: c.handle, title: c.title, thumbnail: c.thumbnail, price: c.price }));
}

// ===========================================================================
// Faceted catalog — divisions + attribute filtering. The catalog is small, so
// we fetch it once (cached per request) and filter/sort/paginate in-app. This
// supports filters Medusa can't do natively (division/occasion/style/trend).
// ===========================================================================

export const DIVISION_HANDLES = ["women", "plus", "men", "sport", "kids", "beauty"] as const;
const DIVISION_SET = new Set<string>(DIVISION_HANDLES);

export interface ListingFilters {
  division?: string;
  category?: string;
  collection?: string;
  occasion?: string[];
  style?: string[];
  trend?: string[];
  colors?: string[];
  sizes?: string[];
}

export interface ListingFacets {
  categories: { handle: string; name: string; count: number }[];
  colors: { name: string; swatch: string }[];
  sizes: string[];
  occasion: string[];
  style: string[];
  trend: string[];
}

export interface ListingResult {
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
  facets: ListingFacets;
}

const prettify = (h: string) =>
  h.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "1X", "2X", "3X", "One Size"];
const sortSizes = (a: string, b: string) => {
  const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
};

/** Whole catalog, mapped + cached per request (newest first). */
const getCatalog = cache(async (): Promise<StoreProduct[]> => {
  if (!medusaEnabled()) return placeholderProducts(24, "all");
  const regionId = await getRegionId();
  const region = regionId ? `&region_id=${regionId}` : "";
  const data = (await medusaFetch(
    `/store/products?limit=200&order=-created_at&${CARD_FIELDS}${region}`,
    ["commerce:products", "commerce:catalog"],
  )) as { products?: MedusaProduct[] } | null;
  return (data?.products ?? []).map(mapCard).filter(hasPrice);
});

/** All categories (handle → name), cached. */
export const listCategories = cache(async (): Promise<{ handle: string; name: string }[]> => {
  const data = (await medusaFetch(
    "/store/product-categories?limit=100&fields=handle,name",
    ["commerce:categories"],
  )) as { product_categories?: { handle: string; name: string }[] } | null;
  return data?.product_categories ?? [];
});

function buildFacets(products: StoreProduct[], nameByHandle: Map<string, string>): ListingFacets {
  const catCount = new Map<string, number>();
  const colors = new Map<string, string>();
  const sizes = new Set<string>();
  const occ = new Set<string>(), sty = new Set<string>(), trd = new Set<string>();
  for (const p of products) {
    for (const h of p.categoryHandles ?? []) if (!DIVISION_SET.has(h)) catCount.set(h, (catCount.get(h) ?? 0) + 1);
    for (const c of p.cardColors ?? []) {
      if (c.name !== "Default") colors.set(c.name, c.swatch);
      for (const s of c.sizes) sizes.add(s.size);
    }
    (p.occasion ?? []).forEach((o) => occ.add(o));
    (p.style ?? []).forEach((s) => sty.add(s));
    (p.trend ?? []).forEach((t) => trd.add(t));
  }
  return {
    categories: [...catCount.entries()]
      .map(([handle, count]) => ({ handle, name: nameByHandle.get(handle) ?? prettify(handle), count }))
      .sort((a, b) => b.count - a.count),
    colors: [...colors.entries()].map(([name, swatch]) => ({ name, swatch })),
    sizes: [...sizes].sort(sortSizes),
    occasion: [...occ].sort(),
    style: [...sty].sort(),
    trend: [...trd].sort(),
  };
}

/** Faceted, division-aware product listing. */
export async function fetchListing(
  filters: ListingFilters,
  opts: { sort?: ProductSort; page?: number; limit?: number } = {},
): Promise<ListingResult> {
  const [all, cats] = await Promise.all([getCatalog(), listCategories()]);
  const nameByHandle = new Map(cats.map((c) => [c.handle, c.name]));

  // base scope (division + category + collection) — facets computed from here
  const scoped = all.filter((p) => {
    if (filters.division && p.division !== filters.division) return false;
    if (filters.category && !(p.categoryHandles ?? []).includes(filters.category)) return false;
    if (filters.collection && p.collectionHandle !== filters.collection) return false;
    return true;
  });
  const facets = buildFacets(scoped, nameByHandle);

  // refinement filters
  const filtered = scoped.filter((p) => {
    if (filters.occasion?.length && !filters.occasion.some((o) => (p.occasion ?? []).includes(o))) return false;
    if (filters.style?.length && !filters.style.some((s) => (p.style ?? []).includes(s))) return false;
    if (filters.trend?.length && !filters.trend.some((t) => (p.trend ?? []).includes(t))) return false;
    if (filters.colors?.length && !(p.cardColors ?? []).some((c) => filters.colors!.includes(c.name))) return false;
    if (filters.sizes?.length && !(p.cardColors ?? []).some((c) => c.sizes.some((s) => filters.sizes!.includes(s.size)))) return false;
    return true;
  });

  if (opts.sort === "price-asc") filtered.sort((a, b) => parsePrice(a.price) - parsePrice(b.price));
  else if (opts.sort === "price-desc") filtered.sort((a, b) => parsePrice(b.price) - parsePrice(a.price));

  const limit = opts.limit ?? 24;
  const page = Math.max(1, opts.page ?? 1);
  const total = filtered.length;
  const start = (page - 1) * limit;
  return {
    products: filtered.slice(start, start + limit),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    facets,
  };
}

/** Content categories present within a division (for nav/sidebar), with counts. */
export async function fetchDivisionCategories(
  division: string,
): Promise<{ handle: string; name: string; count: number }[]> {
  const [all, cats] = await Promise.all([getCatalog(), listCategories()]);
  const nameByHandle = new Map(cats.map((c) => [c.handle, c.name]));
  const count = new Map<string, number>();
  for (const p of all) {
    if (p.division !== division) continue;
    for (const h of p.categoryHandles ?? []) {
      if (DIVISION_SET.has(h)) continue;
      count.set(h, (count.get(h) ?? 0) + 1);
    }
  }
  return [...count.entries()]
    .map(([handle, c]) => ({ handle, name: nameByHandle.get(handle) ?? prettify(handle), count: c }))
    .sort((a, b) => b.count - a.count);
}

/** Similar products for the PDP (placeholder until image search lands). */
export async function fetchSimilarProducts(handle: string, limit = 4): Promise<StoreProduct[]> {
  if (medusaEnabled()) {
    const regionId = await getRegionId();
    const region = regionId ? `&region_id=${regionId}` : "";
    const data = (await medusaFetch(
      `/store/products?limit=${limit + 1}&${CARD_FIELDS}${region}`,
      ["commerce:products"],
    )) as { products?: MedusaProduct[] } | null;
    const products = (data?.products ?? []).filter((p) => p.handle !== handle);
    const mapped = products.map(mapCard).filter(hasPrice).slice(0, limit);
    if (mapped.length) return mapped;
  }
  const m = handle.match(/(\d+)$/);
  const base = m ? Number(m[1]) : Math.abs(hash(handle));
  return Array.from({ length: limit }, (_, k) => placeholderProduct(base + k + 1, "sim"));
}
