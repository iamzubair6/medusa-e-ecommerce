import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@ecom/ui";
import { getVisualSearchQuery, parseVisualQueryParts } from "@ecom/cms";
import { fetchListing } from "@/lib/commerce";
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
  const partIdx =
    Number.isInteger(partRaw) && partRaw >= 0 && partRaw < parts.length ? partRaw : undefined;
  const vector = partIdx !== undefined ? parts[partIdx]!.vector : record.vector;

  const params = parseListingParams(sp);
  // First landing scopes to the auto-detected division; `division=all` (the ✕
  // on the panel chip) explicitly clears it.
  let division =
    one("division") === "all" ? undefined : (params.division ?? record.division ?? undefined);

  const ranked = await rankByVector(vector, PAGE_RESULTS, { cap: PAGE_RESULTS });
  const ids = ranked.map((r) => r.productId);
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
  let listing = await fetchListing({ ids, division, ...refinements }, { sort: params.sort, page: params.page });
  // A wrong division guess must not blank a page that HAS visual matches.
  if (listing.total === 0 && division && ids.length > 0) {
    division = undefined;
    listing = await fetchListing({ ids, ...refinements }, { sort: params.sort, page: params.page });
  }

  params.division = division;
  params.extra = {
    resourceId: record.id,
    ...(division === undefined ? { division: "all" } : {}),
    ...(partIdx !== undefined ? { part: String(partIdx) } : {}),
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
        parts={parts.map((p) => ({ label: p.label, cx: p.cx, cy: p.cy }))}
        selectedPart={partIdx}
        division={division}
      />
    </main>
  );
}
