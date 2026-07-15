import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSiteSetting, setSiteSetting } from "@ecom/cms";
import { DIVISION_HANDLES, fetchDivisionCategories, fetchListing } from "@/lib/commerce";
import {
  navigationSchema,
  parseNavigation,
  type NavCollection,
  type NavColumn,
  type NavLink,
} from "@/lib/navigation";

/** Generation caps — taste, not schema limits (schema allows more). */
const MAX_CATEGORIES = 10;
const MAX_LINKS_PER_COLUMN = 8;

export const maxDuration = 60;

const enc = encodeURIComponent;
const link = (label: string, href: string, extra?: Partial<NavLink>): NavLink => ({
  label: label.slice(0, 60),
  href,
  highlight: false,
  swatch: "",
  ...extra,
});

/** Drop links whose URL exceeds the schema cap so one long handle can't 502 the run. */
const clampColumns = (columns: NavColumn[]): NavColumn[] =>
  columns
    .map((c) => ({ ...c, links: c.links.filter((l) => l.href.length <= 200) }))
    .filter((c) => c.links.length > 0);

function facetColumn(
  heading: string,
  values: string[],
  base: string,
  param: string,
  suffix = "",
): NavColumn {
  return {
    heading,
    links: values.slice(0, MAX_LINKS_PER_COLUMN).map((v) => link(suffix ? `${v} ${suffix}` : v, `${base}&${param}=${enc(v)}`)),
  };
}

/** One mega-menu collection for a content category, Fashion-Nova column pattern. */
async function buildCategoryCollection(division: string, cat: { handle: string; name: string }): Promise<NavCollection> {
  const base = `/collections/${cat.handle}?division=${division}`;
  const { facets, products } = await fetchListing({ division, category: cat.handle }, { limit: 1 });
  const columns: NavColumn[] = [
    {
      // FN's "Featured" lifecycle column renders without a heading.
      heading: "",
      links: [
        link(`Shop All ${cat.name}`, base),
        link(`New In ${cat.name}`, `/collections/new?division=${division}`),
        link(`Sale ${cat.name}`, `/collections/sale?division=${division}`, { highlight: true }),
      ],
    },
    facetColumn("Shop By Style", facets.style, base, "style"),
    facetColumn("Shop By Occasion", facets.occasion, base, "occasion", cat.name),
    facetColumn("Shop By Trend", facets.trend, base, "trend"),
    {
      heading: "Shop By Color",
      links: facets.colors
        .slice(0, MAX_LINKS_PER_COLUMN)
        .map((c) => link(`${c.name} ${cat.name}`, `${base}&color=${enc(c.name)}`, { swatch: c.swatch })),
    },
  ];
  return {
    label: cat.name.slice(0, 40),
    href: base,
    highlight: false,
    image: products[0]?.thumbnail ?? "",
    columns: clampColumns(columns),
  };
}

/** The broad "Clothing" collection: all categories + division-wide facets. */
async function buildClothingCollection(
  division: string,
  cats: { handle: string; name: string }[],
): Promise<NavCollection> {
  const base = `/collections/${division}?division=${division}`;
  const { facets, products } = await fetchListing({ division }, { limit: 1 });
  const columns: NavColumn[] = [
    { heading: "", links: [link("Shop All Clothing", base)] },
    {
      heading: "All Clothing",
      links: cats.slice(0, MAX_LINKS_PER_COLUMN).map((c) => link(c.name, `/collections/${c.handle}?division=${division}`)),
    },
    facetColumn("Shop By Occasion", facets.occasion, base, "occasion"),
    facetColumn("Shop By Trend", facets.trend, base, "trend"),
  ];
  return {
    label: "Clothing",
    href: base,
    highlight: false,
    image: products[0]?.thumbnail ?? "",
    columns: clampColumns(columns),
  };
}

/**
 * Build a Fashion-Nova-pattern menu for every division from the LIVE catalog:
 * New In / Clothing / one item per content category (lifecycle + style +
 * occasion + trend + color columns, each link backed by ≥1 product because the
 * facet values come from that category's own products) / Sale. Divisions
 * without products keep whatever the admin had. Admin-gated by middleware.
 */
export async function POST() {
  try {
    // No .catch() here: a failed CMS read must abort the run, otherwise the
    // write below would replace the admin's saved labels/badges with defaults.
    const current = parseNavigation(await getSiteSetting("navigation"));
    const summary: Record<string, number> = {};
    const byDivision = new Map<string, NavCollection[]>();

    // Divisions run sequentially to keep concurrent Medusa calls bounded
    // (≤ 1 + MAX_CATEGORIES at a time — the catalog fetch itself is cached).
    for (const division of DIVISION_HANDLES) {
      const cats = (await fetchDivisionCategories(division)).filter((c) => c.count > 0).slice(0, MAX_CATEGORIES);
      if (cats.length === 0) continue;
      const clothing = await buildClothingCollection(division, cats);
      const perCategory = await Promise.all(cats.map((c) => buildCategoryCollection(division, c)));
      const collections: NavCollection[] = [
        { label: "New In", href: `/collections/new?division=${division}`, highlight: false, image: "", columns: [] },
        clothing,
        ...perCategory,
        { label: "Sale", href: `/collections/sale?division=${division}`, highlight: true, image: "", columns: [] },
      ];
      summary[division] = collections.length;
      byDivision.set(division, collections);
    }
    const next = navigationSchema.parse({
      divisions: current.divisions.map((d) => ({
        ...d,
        collections: byDivision.get(d.handle) ?? d.collections,
      })),
    });

    await setSiteSetting("navigation", next);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, navigation: next, summary });
  } catch {
    // Deliberately generic — internal Medusa/DB detail stays server-side.
    return NextResponse.json(
      { error: "Could not generate navigation from the catalog. Check that the backend is reachable and try again." },
      { status: 502 },
    );
  }
}
