import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@ecom/ui";
import { getSiteSetting, getVisualSearchQuery, parseVisualQueryParts } from "@ecom/cms";
import { fetchListing, listCategories } from "@/lib/commerce";
import { parseVisualSearchSettings } from "@/lib/visual-search-settings";
import { parseListingParams } from "@/lib/listing-params";
import { FACET_KEYS } from "@/lib/listing-config";
import { rankByVector } from "@/lib/visual-search";
import type { ListingPageProps } from "@/lib/build-listing";
import { ListingView } from "@/components/site/listing-view";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { ImageQueryPanel } from "@/components/site/image-query-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Image Results" };

const PAGE_RESULTS = 48;

type Search = Promise<Record<string, string | string[] | undefined>>;

/**
 * Image-search results as a full listing page (Fashion Nova pattern):
 * /search?division=women&resourceId=… — the standard filter rail + grid over
 * the products that matched the uploaded photo, with the query image floating
 * in a panel. `part=<n>` re-scopes to one detected garment's crop vector.
 */
export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const sp = await searchParams;
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const resourceId = one("resourceId");
  const record = resourceId ? await getVisualSearchQuery(resourceId).catch(() => null) : null;

  if (!record) {
    return (
      <main>
        <SiteNavbar />
        <Container className="py-24 text-center">
          <h1 className="font-serif text-3xl">Search by image</h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            This image search has expired or the link is incomplete. Use the camera icon in the
            search bar to upload a photo.
          </p>
          <Link href="/products" className="mt-6 inline-block text-sm underline underline-offset-4">
            Browse all products
          </Link>
        </Container>
        <Footer />
      </main>
    );
  }

  const parts = parseVisualQueryParts(record.parts);
  const partParam = one("part");
  const partRaw = partParam?.length ? Number(partParam) : NaN;
  // FN behavior: the most prominent garment starts selected (parts arrive
  // score-sorted); `part=all` searches the whole photo.
  const partIdx =
    Number.isInteger(partRaw) && partRaw >= 0 && partRaw < parts.length
      ? partRaw
      : partParam === "all" || parts.length === 0
        ? undefined
        : 0;
  const selectedPart = partIdx !== undefined ? parts[partIdx]! : undefined;
  const vector = selectedPart?.vector ?? record.vector;

  // Garment→category scoping comes from the admin-editable "visualSearch"
  // setting and only handles that EXIST in this catalog count — so the feature
  // adapts to any store (a beauty-only catalog simply gets vector-only
  // ranking) instead of assuming this taxonomy.
  let partCategories: string[] | undefined;
  if (selectedPart) {
    const [settings, cats] = await Promise.all([
      getSiteSetting("visualSearch").catch(() => null),
      listCategories(),
    ]);
    const mapped = parseVisualSearchSettings(settings).partCategories[selectedPart.label] ?? [];
    const live = new Set(cats.map((c) => c.handle));
    const present = mapped.filter((h) => live.has(h));
    partCategories = present.length > 0 ? present : undefined;
  }

  const params = parseListingParams(sp);
  // First landing scopes to the auto-detected division; `division=all` (the ✕
  // on the panel chip) explicitly clears it.
  let division =
    one("division") === "all" ? undefined : (params.division ?? record.division ?? undefined);

  // Part searches skip the relevance floor — the category allowlist scopes,
  // the crop vector orders (a garment crop scores low vs full-body shots).
  const ranked = await rankByVector(vector, PAGE_RESULTS, {
    cap: PAGE_RESULTS,
    floor: !selectedPart,
  });
  let ids = ranked.map((r) => r.productId);
  const refinements = {
    category: params.category,
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
  };
  const explicitPart = partIdx !== undefined && partParam !== undefined;
  const listingOpts = { sort: params.sort, page: params.page };
  let effectivePartIdx = partIdx;
  let listing = await fetchListing(
    { ids, division, categories: partCategories, ...refinements },
    listingOpts,
  );
  // Fallbacks, but honest ones. An AUTO-selected garment with no catalog
  // coverage is deselected — back to the whole-photo search — so the panel
  // never highlights a part the grid isn't showing. An explicitly tapped dot
  // keeps its category scope: an empty "no matches" beats category-wrong
  // results. A wrong division guess is always dropped rather than blanking a
  // page that has matches.
  if (listing.total === 0 && selectedPart && !explicitPart) {
    effectivePartIdx = undefined;
    const whole = await rankByVector(record.vector, PAGE_RESULTS, { cap: PAGE_RESULTS });
    ids = whole.map((r) => r.productId);
    listing = await fetchListing({ ids, division, ...refinements }, listingOpts);
  }
  if (listing.total === 0 && division && ids.length > 0) {
    division = undefined;
    listing = await fetchListing(
      {
        ids,
        categories: effectivePartIdx !== undefined ? partCategories : undefined,
        ...refinements,
      },
      listingOpts,
    );
  }

  params.division = division;
  params.extra = {
    resourceId: record.id,
    ...(division === undefined ? { division: "all" } : {}),
    ...(effectivePartIdx !== undefined ? { part: String(effectivePartIdx) } : {}),
  };

  const props: ListingPageProps = {
    title: "Your Image Results",
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Search by image" }],
    basePath: "/search",
    params,
    facets: listing.facets,
    categoryLinks: [],
    showCategory: true,
    facetOrder: [...FACET_KEYS],
    products: listing.products,
    total: listing.total,
    page: listing.page,
    totalPages: listing.totalPages,
  };

  return (
    <main>
      <ListingView {...props} />
      <ImageQueryPanel
        resourceId={record.id}
        parts={parts.map((p) => ({ label: p.label, cx: p.cx, cy: p.cy, box: p.box }))}
        selectedPart={effectivePartIdx}
        division={division}
      />
    </main>
  );
}
