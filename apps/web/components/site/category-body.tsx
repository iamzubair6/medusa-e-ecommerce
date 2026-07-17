"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@ecom/ui";
import type { ListingFacets, StoreProduct } from "@/lib/commerce";
import { listingQuery, type ListingParams } from "@/lib/listing-params";
import { FACET_KEYS, type FacetKey } from "@/lib/listing-config";
import { ProductCard } from "./product-card";

export interface CategoryLink {
  label: string;
  href: string;
  active: boolean;
  count?: number;
}
export interface CategoryImageTile {
  label: string;
  image: string;
  href: string;
}

interface Props {
  title: string;
  breadcrumb: { label: string; href?: string }[];
  basePath: string;
  params: ListingParams;
  facets: ListingFacets;
  categoryLinks: CategoryLink[];
  showCategory?: boolean;
  facetOrder?: FacetKey[];
  products: StoreProduct[];
  total: number;
  page: number;
  totalPages: number;
  categoryImageRow?: CategoryImageTile[];
  categoryRowHeading?: string;
}

const DEFAULT_FACET_ORDER: FacetKey[] = [...FACET_KEYS];

const GRID_COLS: Record<number, string> = {
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
};

export function CategoryBody({
  title,
  breadcrumb,
  basePath,
  params,
  facets,
  categoryLinks,
  showCategory = true,
  facetOrder = DEFAULT_FACET_ORDER,
  products,
  total,
  page,
  totalPages,
  categoryImageRow,
  categoryRowHeading,
}: Props) {
  const router = useRouter();
  const [mobileFilters, setMobileFilters] = useState(false);

  const url = (overrides: Partial<ListingParams>) => `${basePath}${listingQuery(params, { page: 1, ...overrides })}`;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const priceActive = params.priceMin !== undefined || params.priceMax !== undefined;
  const activeCount =
    params.colors.length + params.sizes.length + params.occasion.length + params.style.length + params.trend.length +
    params.sleeve.length + params.neckline.length + params.length.length + params.fabric.length + params.print.length +
    (priceActive ? 1 : 0);

  const renderFacet = (k: FacetKey) => {
    switch (k) {
      case "category":
        return showCategory && categoryLinks.length > 0 ? (
          <FilterSection key="category" title="Category">
            <ul className="flex flex-col gap-2">
              {categoryLinks.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    className={cn(
                      "flex items-center justify-between transition-colors hover:text-accent",
                      c.active ? "font-semibold text-foreground" : "text-foreground/75",
                    )}
                  >
                    <span>{c.label}</span>
                    {typeof c.count === "number" && <span className="text-xs text-muted-foreground">{c.count}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </FilterSection>
        ) : null;
      case "size":
        return facets.sizes.length > 0 ? (
          <FilterSection key="size" title="Size">
            <div className="flex flex-wrap gap-1.5">
              {facets.sizes.map((s) => (
                <Link
                  key={s}
                  href={url({ sizes: toggle(params.sizes, s) })}
                  scroll={false}
                  className={cn(
                    "min-w-9 rounded-sm border px-2 py-1.5 text-center text-xs font-medium transition-colors",
                    params.sizes.includes(s) ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                  )}
                >
                  {s}
                </Link>
              ))}
            </div>
          </FilterSection>
        ) : null;
      case "color":
        return facets.colors.length > 0 ? (
          <FilterSection key="color" title="Color">
            <div className="flex flex-wrap gap-2">
              {facets.colors.map((c) => (
                <Link
                  key={c.name}
                  href={url({ colors: toggle(params.colors, c.name) })}
                  scroll={false}
                  title={c.name}
                  className={cn(
                    "h-7 w-7 rounded-full border p-0.5 transition",
                    params.colors.includes(c.name) ? "border-foreground" : "border-border hover:border-foreground/60",
                  )}
                >
                  <span className="block h-full w-full rounded-full" style={{ backgroundColor: c.swatch }} />
                </Link>
              ))}
            </div>
          </FilterSection>
        ) : null;
      case "occasion":
        return <FacetLinks key="occasion" title="Occasion" values={facets.occasion} selected={params.occasion} keyName="occasion" url={url} />;
      case "style":
        return <FacetLinks key="style" title="Style" values={facets.style} selected={params.style} keyName="style" url={url} />;
      case "trend":
        return <FacetLinks key="trend" title="Trend" values={facets.trend} selected={params.trend} keyName="trend" url={url} />;
      case "sleeve":
        return <FacetLinks key="sleeve" title="Sleeve" values={facets.sleeve} selected={params.sleeve} keyName="sleeve" url={url} />;
      case "neckline":
        return <FacetLinks key="neckline" title="Neckline" values={facets.neckline} selected={params.neckline} keyName="neckline" url={url} />;
      case "length":
        return <FacetLinks key="length" title="Length" values={facets.length} selected={params.length} keyName="length" url={url} />;
      case "fabric":
        return <FacetLinks key="fabric" title="Fabric" values={facets.fabric} selected={params.fabric} keyName="fabric" url={url} />;
      case "print":
        return <FacetLinks key="print" title="Print" values={facets.print} selected={params.print} keyName="print" url={url} />;
      case "price":
        return facets.priceMax > facets.priceMin ? (
          <PriceFilter
            // Remount when the URL range changes (e.g. "Clear all") so the inputs never go stale.
            key={`price-${params.priceMin ?? ""}-${params.priceMax ?? ""}`}
            bounds={{ min: facets.priceMin, max: facets.priceMax }}
            value={{ min: params.priceMin, max: params.priceMax }}
            onApply={(min, max) => router.push(url({ priceMin: min, priceMax: max }))}
          />
        ) : null;
    }
  };

  const Rail = (
    <div className="flex flex-col gap-1 text-sm">
      <div className="pb-2">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Filter</p>
        <p className="mt-1 text-xs text-muted-foreground">{total.toLocaleString()} products</p>
      </div>

      {facetOrder.map((k) => renderFacet(k))}

      {activeCount > 0 && (
        <Link
          href={`${basePath}${listingQuery(params, { page: 1, colors: [], sizes: [], occasion: [], style: [], trend: [], sleeve: [], neckline: [], length: [], fabric: [], print: [], priceMin: undefined, priceMax: undefined })}`}
          className="mt-3 flex w-fit items-center gap-1 text-xs text-accent hover:underline"
        >
          <X className="h-3 w-3" /> Clear all filters
        </Link>
      )}
    </div>
  );

  return (
    <div className="py-6">
      {/* breadcrumb */}
      <nav className="mb-3 text-xs text-muted-foreground" aria-label="Breadcrumb">
        {breadcrumb.map((b, i) => (
          <span key={`${b.label}-${i}`}>
            {b.href ? (
              <Link href={b.href} className="hover:text-foreground">{b.label}</Link>
            ) : (
              <span className="text-foreground">{b.label}</span>
            )}
            {i < breadcrumb.length - 1 && <span className="px-1.5">/</span>}
          </span>
        ))}
      </nav>

      {/* title + toolbar */}
      <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">{title}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFilters(true)}
            className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-xs font-semibold uppercase lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </button>

          <span className="hidden text-xs text-muted-foreground sm:inline">{total.toLocaleString()} items</span>

          <label className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Sort</span>
            <select
              value={params.sort}
              onChange={(e) => router.push(url({ sort: e.target.value as ListingParams["sort"] }))}
              className="cursor-pointer rounded-sm border border-border bg-background px-2 py-1.5 text-xs font-medium"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </label>

          <div className="hidden items-center gap-1 xl:flex" aria-label="Grid columns">
            {[3, 4, 5].map((c) => (
              <Link
                key={c}
                href={url({ columns: c as ListingParams["columns"] })}
                scroll={false}
                className={cn(
                  "h-8 w-8 rounded-sm border text-center text-xs leading-7",
                  params.columns === c ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                )}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">{Rail}</aside>

        <div className="flex-1">
          {/* Curated tile row (admin "special" section, e.g. Tops) — above the grid */}
          {categoryImageRow && categoryImageRow.length > 0 && (
            <div className="mb-8">
              {categoryRowHeading && (
                <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{categoryRowHeading}</h2>
              )}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-7">
                {categoryImageRow.map((t) => (
                  <Link key={t.href} href={t.href} className="group flex flex-col items-center gap-2 text-center">
                    <span className="aspect-square w-full overflow-hidden rounded-full bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={t.image} alt={t.label} className="h-full w-full object-cover transition group-hover:scale-105" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide">{t.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {products.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No products match these filters.</p>
          ) : (
            <div className={cn("grid gap-x-4 gap-y-8", GRID_COLS[params.columns])}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav className="mt-12 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
              {page > 1 && (
                <Link href={`${basePath}${listingQuery(params, { page: page - 1 })}`} className="rounded-sm border border-border px-4 py-2 hover:bg-muted">
                  Previous
                </Link>
              )}
              <span className="px-2 text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={`${basePath}${listingQuery(params, { page: page + 1 })}`} className="rounded-sm border border-border px-4 py-2 hover:bg-muted">
                  Next
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>

      {/* mobile filter drawer */}
      {mobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-80 max-w-[85%] overflow-y-auto bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display text-lg font-bold">Filters</span>
              <button type="button" aria-label="Close" onClick={() => setMobileFilters(false)} className="p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            {Rail}
          </div>
        </div>
      )}
    </div>
  );
}

function FacetLinks({
  title,
  values,
  selected,
  keyName,
  url,
}: {
  title: string;
  values: string[];
  selected: string[];
  keyName: "occasion" | "style" | "trend" | "sleeve" | "neckline" | "length" | "fabric" | "print";
  url: (o: Partial<ListingParams>) => string;
}) {
  if (values.length === 0) return null;
  const toggle = (v: string) => (selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  return (
    <FilterSection title={title}>
      <ul className="flex flex-col gap-2">
        {values.map((v) => (
          <li key={v}>
            <Link
              href={url({ [keyName]: toggle(v) } as Partial<ListingParams>)}
              scroll={false}
              className={cn("flex items-center gap-2 transition-colors hover:text-accent", selected.includes(v) ? "font-semibold text-foreground" : "text-foreground/75")}
            >
              <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border", selected.includes(v) ? "border-foreground bg-foreground" : "border-border")}>
                {selected.includes(v) && <span className="h-1.5 w-1.5 rounded-[1px] bg-background" />}
              </span>
              {v}
            </Link>
          </li>
        ))}
      </ul>
    </FilterSection>
  );
}

/** Price-range filter: two number inputs bounded by the facet range, applied on submit. */
function PriceFilter({
  bounds,
  value,
  onApply,
}: {
  bounds: { min: number; max: number };
  value: { min?: number; max?: number };
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [min, setMin] = useState(value.min?.toString() ?? "");
  const [max, setMax] = useState(value.max?.toString() ?? "");

  const apply = () => {
    const lo = min.trim() === "" ? undefined : Math.max(bounds.min, Math.floor(Number(min)));
    const hi = max.trim() === "" ? undefined : Math.min(bounds.max, Math.ceil(Number(max)));
    // Guard against inverted ranges (swap) and non-numeric input (ignore).
    if (lo !== undefined && !Number.isFinite(lo)) return;
    if (hi !== undefined && !Number.isFinite(hi)) return;
    if (lo !== undefined && hi !== undefined && lo > hi) onApply(hi, lo);
    else onApply(lo, hi);
  };

  return (
    <FilterSection title="Price">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-2">
          <label className="flex-1">
            <span className="sr-only">Minimum price</span>
            <input
              type="number"
              inputMode="numeric"
              min={bounds.min}
              max={bounds.max}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder={`৳${bounds.min}`}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground"
            />
          </label>
          <span aria-hidden className="text-muted-foreground">–</span>
          <label className="flex-1">
            <span className="sr-only">Maximum price</span>
            <input
              type="number"
              inputMode="numeric"
              min={bounds.min}
              max={bounds.max}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder={`৳${bounds.max}`}
              className="w-full rounded-sm border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-foreground"
            />
          </label>
        </div>
        <button
          type="submit"
          className="w-fit cursor-pointer text-xs font-semibold uppercase tracking-[0.1em] text-accent hover:underline"
        >
          Apply
        </button>
      </form>
    </FilterSection>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-border py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mb-3 flex w-full items-center justify-between text-xs font-bold uppercase tracking-[0.1em]"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && children}
    </div>
  );
}
