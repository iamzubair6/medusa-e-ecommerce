import "server-only";
import { fetchListing, type StoreProduct } from "@/lib/commerce";

export interface PanelEntry {
  label: string;
  image: string;
  href: string;
}

export interface SearchPanelData {
  hot: { label: string; href: string }[];
  topSearches: PanelEntry[];
  trending: PanelEntry[];
  occasion: PanelEntry[];
}

const COLUMN_SIZE = 4;
const HOT_COUNT = 8;

/** Deterministic-enough shuffle for "random" discovery rows (fresh per cache cycle). */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const listingHref = (division: string, params: Record<string, string>) => {
  const q = new URLSearchParams({ division, ...params });
  return `/collections/${division}?${q.toString()}`;
};

/**
 * Discovery content for the search dropdown (Fashion Nova pattern): hot-search
 * chips plus Top Searches / Trending / Occasion columns with a product photo
 * per row — all derived live from the division's catalog, so every link lands
 * on a non-empty listing.
 */
export async function buildSearchPanel(division: string): Promise<SearchPanelData> {
  const { products, facets } = await fetchListing({ division }, { limit: 60 });

  const imageFor = (match: (p: StoreProduct) => boolean): string =>
    products.find((p) => match(p) && p.thumbnail)?.thumbnail ?? products[0]?.thumbnail ?? "";

  const topSearches: PanelEntry[] = facets.categories.slice(0, COLUMN_SIZE).map((c) => ({
    label: c.name,
    image: imageFor((p) => (p.categoryHandles ?? []).includes(c.handle)),
    href: `/collections/${c.handle}?division=${division}`,
  }));

  const trending: PanelEntry[] = shuffle(facets.trend)
    .slice(0, COLUMN_SIZE)
    .map((t) => ({
      label: t,
      image: imageFor((p) => (p.trend ?? []).includes(t)),
      href: listingHref(division, { trend: t }),
    }));

  const occasion: PanelEntry[] = shuffle(facets.occasion)
    .slice(0, COLUMN_SIZE)
    .map((o) => ({
      label: o,
      image: imageFor((p) => (p.occasion ?? []).includes(o)),
      href: listingHref(division, { occasion: o }),
    }));

  const hot = shuffle([
    ...facets.style.map((s) => ({ label: s, href: listingHref(division, { style: s }) })),
    ...facets.trend.map((t) => ({ label: t, href: listingHref(division, { trend: t }) })),
    ...facets.occasion.map((o) => ({ label: o, href: listingHref(division, { occasion: o }) })),
  ]).slice(0, HOT_COUNT);

  return { hot, topSearches, trending, occasion };
}
