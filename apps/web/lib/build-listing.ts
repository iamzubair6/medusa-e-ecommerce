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
  /** Whether to show the "Category" facet group (broad collections only). */
  showCategory: boolean;
  /** Single-type collection → lead the rail with Style instead of Category. */
  leadStyle: boolean;
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
  categoryImageRow?: CategoryImageTile[];
}

export async function buildListing(opts: {
  handle?: string;
  searchParams: Record<string, string | string[] | undefined>;
}): Promise<ListingPageProps> {
  const params = parseListingParams(opts.searchParams);
  const cats = await listCategories();
  const catHandles = new Set(cats.map((c) => c.handle));
  const nameOf = (h: string) => cats.find((c) => c.handle === h)?.name ?? prettifyHandle(h);

  const handle = opts.handle;
  const isAll = !handle;
  const isDivision = !!handle && (DIVISION_HANDLES as readonly string[]).includes(handle);
  const isContentCat = !!handle && catHandles.has(handle) && !isDivision;
  const isCollection = !!handle && !catHandles.has(handle) && !isDivision;

  // scope
  let division = params.division;
  let category = params.category;
  let collection: string | undefined;
  if (isDivision) division = handle;
  else if (isContentCat) category = handle;
  else if (isCollection) collection = handle;

  const basePath = isAll ? "/products" : `/collections/${handle}`;

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

  // Broad collections (division / marketing collection / all) span many product
  // types → show a Category facet. Single-type collections hide it & lead w/ Style.
  const broad = isDivision || isCollection || isAll;
  const hasMultipleTypes = result.facets.categories.length > 1;
  const showCategory = broad && hasMultipleTypes;
  const leadStyle = isContentCat;

  // ---- sidebar Category links ----
  let categoryLinks: CategoryLink[] = [];
  if (isDivision && handle) {
    const divCats = await fetchDivisionCategories(handle);
    categoryLinks = divCats.map((dc) => ({
      label: dc.name,
      href: `/collections/${dc.handle}?division=${handle}`,
      active: false,
      count: dc.count,
    }));
  } else if (broad) {
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
  const breadcrumb: { label: string; href?: string }[] = [{ label: "Home", href: "/" }];
  let title: string;
  if (isDivision) {
    title = `All ${divName ?? ""}'s Clothing`.trim();
    breadcrumb.push({ label: divName ?? "" });
    breadcrumb.push({ label: title });
  } else if (isContentCat) {
    const typeName = nameOf(handle!);
    title = divName ? `${divName}'s ${typeName}` : `All ${typeName}`;
    if (divName) breadcrumb.push({ label: divName, href: `/collections/${division}?division=${division}` });
    breadcrumb.push({ label: "Clothing" });
    breadcrumb.push({ label: typeName });
  } else if (isCollection) {
    const colName = prettifyHandle(handle!);
    title = divName ? `${divName} ${colName}` : colName;
    if (divName) breadcrumb.push({ label: divName, href: `/collections/${division}?division=${division}` });
    breadcrumb.push({ label: colName });
  } else {
    title = "Shop All";
    breadcrumb.push({ label: "Shop All" });
  }

  // ---- Tops special: curated tile row (style shortcuts) before the grid ----
  let categoryImageRow: CategoryImageTile[] | undefined;
  if (isContentCat && handle === "tops" && result.facets.style.length > 0 && result.products.length > 0) {
    categoryImageRow = result.facets.style.slice(0, 7).map((s, i) => ({
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
    showCategory,
    leadStyle,
    products: result.products,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    categoryImageRow,
  };
}
