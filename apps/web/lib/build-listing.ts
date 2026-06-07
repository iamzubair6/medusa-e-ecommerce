import "server-only";
import {
  fetchListing,
  fetchDivisionCategories,
  listCategories,
  DIVISION_HANDLES,
  type ListingFacets,
  type StoreProduct,
} from "@/lib/commerce";
import { parseListingParams, prettifyHandle, listingQuery, type ListingParams } from "@/lib/listing-params";
import type { CategoryImageTile, CategoryLink } from "@/components/site/category-body";

export const DIVISION_NAMES: Record<string, string> = {
  women: "Women",
  plus: "Plus+Curve",
  men: "Men",
  sport: "Sport",
  kids: "Kids",
  beauty: "Beauty",
};

export interface ListingPageProps {
  title: string;
  breadcrumb: { label: string; href?: string }[];
  basePath: string;
  params: ListingParams;
  facets: ListingFacets;
  categoryLinks: CategoryLink[];
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
  categoryImageRow?: CategoryImageTile[];
}

const isDivisionHandle = (h?: string): boolean => !!h && (DIVISION_HANDLES as readonly string[]).includes(h);

export async function buildListing(opts: {
  kind: "category" | "collection" | "all";
  handle?: string;
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<ListingPageProps> {
  const params = parseListingParams(opts.searchParams);
  const isDivision = opts.kind === "category" && isDivisionHandle(opts.handle);

  let division = params.division;
  let category = params.category;
  let collection: string | undefined;
  let basePath: string;

  if (opts.kind === "category") {
    basePath = `/c/${opts.handle}`;
    if (isDivision) division = opts.handle;
    else category = opts.handle;
  } else if (opts.kind === "collection") {
    basePath = `/collections/${opts.handle}`;
    collection = opts.handle;
  } else {
    basePath = "/products";
  }

  const result = await fetchListing(
    {
      division,
      category,
      collection,
      colors: params.colors,
      sizes: params.sizes,
      occasion: params.occasion,
      style: params.style,
      trend: params.trend,
    },
    { sort: params.sort, page: params.page, limit: params.columns >= 5 ? 30 : 24 },
  );

  const cats = await listCategories();
  const nameOf = (h: string) => cats.find((c) => c.handle === h)?.name ?? prettifyHandle(h);

  // ---- sidebar category links ----
  let categoryLinks: CategoryLink[] = [];
  if (isDivision && opts.handle) {
    const divCats = await fetchDivisionCategories(opts.handle);
    categoryLinks = [
      { label: `All ${DIVISION_NAMES[opts.handle] ?? prettifyHandle(opts.handle)}`, href: `${basePath}${listingQuery(params, { category: undefined, page: 1 })}`, active: !category },
      ...divCats.map((dc) => ({
        label: dc.name,
        href: `${basePath}${listingQuery(params, { category: dc.handle, page: 1 })}`,
        active: category === dc.handle,
        count: dc.count,
      })),
    ];
  } else if (opts.kind === "category") {
    // content-category page → refine by division
    categoryLinks = [
      { label: "All", href: `${basePath}${listingQuery(params, { division: undefined, page: 1 })}`, active: !division },
      ...DIVISION_HANDLES.map((d) => ({
        label: DIVISION_NAMES[d]!,
        href: `${basePath}${listingQuery(params, { division: d, page: 1 })}`,
        active: division === d,
      })),
    ];
  } else {
    // collection / all → refine by content category (from facets)
    categoryLinks = [
      { label: "All", href: `${basePath}${listingQuery(params, { category: undefined, page: 1 })}`, active: !category },
      ...result.facets.categories.map((fc) => ({
        label: fc.name,
        href: `${basePath}${listingQuery(params, { category: fc.handle, page: 1 })}`,
        active: category === fc.handle,
        count: fc.count,
      })),
    ];
  }

  // ---- title + breadcrumb ----
  const divName = division ? DIVISION_NAMES[division] ?? prettifyHandle(division) : undefined;
  let title: string;
  const breadcrumb: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
  if (opts.kind === "category" && isDivision) {
    title = category ? `All ${divName} ${nameOf(category)}` : (divName ?? prettifyHandle(opts.handle!));
    breadcrumb.push({ label: divName ?? "", href: category ? basePath : undefined });
    if (category) breadcrumb.push({ label: nameOf(category) });
  } else if (opts.kind === "category") {
    const catName = nameOf(opts.handle!);
    title = divName ? `${divName} ${catName}` : `All ${catName}`;
    if (divName) breadcrumb.push({ label: divName });
    breadcrumb.push({ label: catName });
  } else if (opts.kind === "collection") {
    const colName = prettifyHandle(opts.handle!);
    title = divName ? `${divName} ${colName}` : colName;
    if (divName) breadcrumb.push({ label: divName });
    breadcrumb.push({ label: colName });
  } else {
    title = "Shop All";
    breadcrumb.push({ label: "Shop All" });
  }

  // ---- Tops special: a row of style image tiles before the grid ----
  let categoryImageRow: CategoryImageTile[] | undefined;
  const effectiveCategory = isDivision ? category : opts.kind === "category" ? opts.handle : category;
  if (effectiveCategory === "tops" && result.facets.style.length > 0 && result.products.length > 0) {
    categoryImageRow = result.facets.style.slice(0, 6).map((s, i) => ({
      label: s,
      image: result.products[i % result.products.length]!.thumbnail,
      href: `${basePath}${listingQuery(params, { style: [s], page: 1 })}`,
    }));
  }

  return {
    title,
    breadcrumb,
    basePath,
    params,
    facets: result.facets,
    categoryLinks,
    products: result.products,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    categoryImageRow,
  };
}
