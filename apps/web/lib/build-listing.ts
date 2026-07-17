import "server-only";
import { getSiteSetting } from "@ecom/cms";
import {
  fetchListing,
  fetchDivisionCategories,
  listCategories,
  DIVISION_HANDLES,
  type ListingFacets,
  type StoreProduct,
} from "@/lib/commerce";
import { parseListingParams, prettifyHandle, listingQuery, type ListingParams } from "@/lib/listing-params";
import { parseListingConfig, listingEntryFor, type FacetKey } from "@/lib/listing-config";
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
  /** Order the filter groups render in the rail (admin-config, else derived). */
  facetOrder: FacetKey[];
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
  categoryImageRow?: CategoryImageTile[];
  /** Optional heading above the curated tile row. */
  categoryRowHeading?: string;
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
      sleeve: params.sleeve,
      neckline: params.neckline,
      length: params.length,
      fabric: params.fabric,
      print: params.print,
      priceMin: params.priceMin,
      priceMax: params.priceMax,
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

  // ---- admin-managed per-listing config (facet visibility/order + special row) ----
  const config = await getSiteSetting("listingConfig")
    .then(parseListingConfig)
    .catch(() => parseListingConfig(null));
  const entry = listingEntryFor(config, handle);

  // Category facet visibility — admin override of the derived default.
  let effShowCategory = showCategory;
  if (entry.categoryFacet === "show") effShowCategory = categoryLinks.length > 0;
  else if (entry.categoryFacet === "hide") effShowCategory = false;

  // Filter-group order — admin override, else derived default (Style leads on a
  // single-type content category; Category leads on broad listings).
  const defaultOrder: FacetKey[] = leadStyle
    ? ["style", "size", "color", "occasion", "trend", "sleeve", "neckline", "length", "fabric", "print", "price"]
    : ["category", "size", "color", "occasion", "style", "trend", "sleeve", "neckline", "length", "fabric", "print", "price"];
  let facetOrder = entry.facetOrder.length > 0 ? [...entry.facetOrder] : defaultOrder;
  // Backfill facets that didn't exist when an admin order was saved (price +
  // the #92b apparel facets) — otherwise old configs silently hide them forever.
  const LATE_FACETS: FacetKey[] = ["sleeve", "neckline", "length", "fabric", "print", "price"];
  for (const k of LATE_FACETS) if (!facetOrder.includes(k)) facetOrder = [...facetOrder, k];
  if (!effShowCategory) facetOrder = facetOrder.filter((k) => k !== "category");

  // ---- curated tile row before the grid ----
  // Admin "special" config generalises the legacy Tops row to any listing; when
  // unset, the Tops content category keeps its original derived row.
  let categoryImageRow: CategoryImageTile[] | undefined;
  let categoryRowHeading: string | undefined;
  if (entry.special.enabled && result.products.length > 0) {
    const src = entry.special.source;
    const values: { label: string; value: string }[] =
      src === "category"
        ? result.facets.categories.map((c) => ({ label: c.name, value: c.handle }))
        : result.facets[src].map((v) => ({ label: v, value: v }));
    const tiles = values.slice(0, entry.special.limit).map((v, i) => ({
      label: v.label,
      image: result.products[i % result.products.length]!.thumbnail,
      href:
        src === "category"
          ? `${basePath}${listingQuery(params, { category: v.value, page: 1 })}`
          : `${basePath}${listingQuery(params, { [src]: [v.value], page: 1 } as Partial<ListingParams>)}`,
    }));
    const withImage = tiles.filter((t) => t.image);
    if (withImage.length > 0) {
      categoryImageRow = withImage;
      categoryRowHeading = entry.special.heading || undefined;
    }
  } else if (isContentCat && handle === "tops" && result.facets.style.length > 0 && result.products.length > 0) {
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
    showCategory: effShowCategory,
    facetOrder,
    products: result.products,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    categoryImageRow,
    categoryRowHeading,
  };
}
