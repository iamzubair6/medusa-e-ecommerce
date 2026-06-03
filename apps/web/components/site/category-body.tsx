"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@ecom/ui";
import type { ProductSort, StoreProduct } from "@/lib/commerce";
import { ProductCard } from "./product-card";
import { SortSelect } from "./sort-select";

const SIZE_ORDER = ["XXS", "XS", "S", "S/M", "M", "M/L", "L", "XL", "XXL", "1X", "2X", "3X"];

const CATEGORY_LINKS = [
  ["Dresses", "/c/dresses"],
  ["Tops", "/c/tops"],
  ["Bodysuits", "/c/bodysuits"],
  ["Bottoms", "/c/bottoms"],
  ["Matching Sets", "/c/sets"],
  ["Swim", "/c/swim"],
] as const;

interface Props {
  title: string;
  subtitle?: string;
  basePath: string;
  sort: ProductSort;
  products: StoreProduct[];
  page: number;
  totalPages: number;
  total: number;
}

export function CategoryBody({ title, subtitle, basePath, sort, products, page, totalPages, total }: Props) {
  const [selSizes, setSelSizes] = useState<Set<string>>(new Set());
  const [selColors, setSelColors] = useState<Set<string>>(new Set());
  const [mobileFilters, setMobileFilters] = useState(false);

  const facets = useMemo(() => {
    const sizes = new Set<string>();
    const colors = new Map<string, string>(); // name -> swatch
    for (const p of products)
      for (const c of p.cardColors ?? []) {
        if (c.name !== "Default") colors.set(c.name, c.swatch);
        for (const s of c.sizes) sizes.add(s.size);
      }
    const orderedSizes = [...sizes].sort(
      (a, b) => (SIZE_ORDER.indexOf(a) + 1 || 99) - (SIZE_ORDER.indexOf(b) + 1 || 99),
    );
    return { sizes: orderedSizes, colors: [...colors.entries()] };
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        const cols = p.cardColors ?? [];
        const sizeOk =
          selSizes.size === 0 || cols.some((c) => c.sizes.some((s) => selSizes.has(s.size)));
        const colorOk = selColors.size === 0 || cols.some((c) => selColors.has(c.name));
        return sizeOk && colorOk;
      }),
    [products, selSizes, selColors],
  );

  const toggle = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  };

  const Rail = (
    <div className="flex flex-col gap-6 text-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Refine By</p>
        <p className="mt-1 text-xs text-muted-foreground">{total.toLocaleString()} products</p>
      </div>

      <FilterSection title="Category">
        <ul className="flex flex-col gap-2">
          {CATEGORY_LINKS.map(([label, href]) => (
            <li key={href}>
              <Link href={href} className="text-foreground/75 transition-colors hover:text-accent">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </FilterSection>

      {facets.sizes.length > 0 && (
        <FilterSection title="Size">
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={selSizes.has(s)}
                onClick={() => toggle(selSizes, s, setSelSizes)}
                className={cn(
                  "min-w-9 rounded-sm border px-2 py-1.5 text-xs font-medium transition-colors",
                  selSizes.has(s) ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {facets.colors.length > 0 && (
        <FilterSection title="Colors">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map(([name, swatch]) => (
              <button
                key={name}
                type="button"
                title={name}
                aria-pressed={selColors.has(name)}
                onClick={() => toggle(selColors, name, setSelColors)}
                className={cn(
                  "h-7 w-7 rounded-full border p-0.5 transition",
                  selColors.has(name) ? "border-foreground" : "border-border hover:border-foreground/60",
                )}
              >
                <span className="block h-full w-full rounded-full" style={{ backgroundColor: swatch }} />
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      {(selSizes.size > 0 || selColors.size > 0) && (
        <button
          type="button"
          onClick={() => { setSelSizes(new Set()); setSelColors(new Set()); }}
          className="flex w-fit items-center gap-1 text-xs text-accent hover:underline"
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="py-6">
      {/* header */}
      <div className="mb-6 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Home / {title}</p>
          <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-tight md:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle ?? `${filtered.length} items`}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFilters(true)}
            className="flex items-center gap-1.5 rounded-sm border border-border px-3 py-2 text-xs font-semibold uppercase lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </button>
          <SortSelect value={sort} />
        </div>
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-56 shrink-0 lg:block">{Rail}</aside>

        <div className="flex-1">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-muted-foreground">No products match these filters.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          {totalPages > 1 && selSizes.size === 0 && selColors.size === 0 && (
            <nav className="mt-12 flex items-center justify-center gap-3 text-sm" aria-label="Pagination">
              {page > 1 && (
                <Link href={`${basePath}?sort=${sort}${page - 1 > 1 ? `&page=${page - 1}` : ""}`} className="rounded-sm border border-border px-4 py-2 hover:bg-muted">
                  Previous
                </Link>
              )}
              <span className="px-2 text-muted-foreground">Page {page} of {totalPages}</span>
              {page < totalPages && (
                <Link href={`${basePath}?sort=${sort}&page=${page + 1}`} className="rounded-sm border border-border px-4 py-2 hover:bg-muted">
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

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-t border-border pt-4">
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
