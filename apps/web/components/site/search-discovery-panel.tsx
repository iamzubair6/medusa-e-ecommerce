"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@ecom/ui";

interface PanelEntry {
  label: string;
  image: string;
  href: string;
}

interface PanelData {
  hot: { label: string; href: string }[];
  topSearches: PanelEntry[];
  trending: PanelEntry[];
  occasion: PanelEntry[];
}

/**
 * Discovery dropdown shown when the search box is focused but empty
 * (Fashion Nova pattern): division tabs → hot-search chips → three numbered
 * thumbnail columns (Top Searches / Trending / Occasion). Every entry links
 * to a live listing, so nothing dead-ends.
 */
export function SearchDiscoveryPanel({
  divisions,
  initialDivision,
  onNavigate,
}: {
  divisions: { handle: string; label: string }[];
  initialDivision: string;
  onNavigate: () => void;
}) {
  const [division, setDivision] = useState(
    divisions.some((d) => d.handle === initialDivision) ? initialDivision : divisions[0]?.handle ?? "women",
  );

  const { data, isPending, isError } = useQuery({
    queryKey: ["search-panel", division],
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<PanelData> => {
      const res = await fetch(`/api/search/panel?division=${encodeURIComponent(division)}`, { signal });
      if (!res.ok) throw new Error("panel failed");
      return (await res.json()) as PanelData;
    },
  });

  const columns: { title: string; entries: PanelEntry[] }[] = data
    ? [
        { title: "Top Searches", entries: data.topSearches },
        { title: "Trending", entries: data.trending },
        { title: "Occasion", entries: data.occasion },
      ].filter((c) => c.entries.length > 0)
    : [];

  return (
    <div className="p-4">
      {/* division tabs (plain toggle buttons — full ARIA tab semantics would
          need roving focus, overkill for a dropdown) */}
      <div aria-label="Division" className="flex gap-5 border-b border-border">
        {divisions.map((d) => (
          <button
            key={d.handle}
            type="button"
            aria-pressed={division === d.handle}
            onClick={() => setDivision(d.handle)}
            className={cn(
              "-mb-px cursor-pointer border-b-2 pb-2 text-xs font-bold uppercase tracking-wide transition-colors motion-reduce:transition-none",
              division === d.handle
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {isError ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          Suggestions unavailable — type to search.
        </p>
      ) : isPending ? (
        <div className="grid grid-cols-3 gap-4 py-4" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-sm bg-muted motion-reduce:animate-none" />
          ))}
        </div>
      ) : (
        <>
          {/* hot searches */}
          {data!.hot.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-bold">Hot Searches</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {data!.hot.map((h) => (
                  <Link
                    key={`${h.label}-${h.href}`}
                    href={h.href}
                    onClick={onNavigate}
                    className="rounded-full border border-border px-3.5 py-1.5 text-xs text-foreground/80 transition-colors hover:border-foreground hover:text-foreground motion-reduce:transition-none"
                  >
                    {h.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* three numbered thumbnail columns */}
          {columns.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {columns.map((col) => (
                <div key={col.title}>
                  <p className="text-sm font-bold">{col.title}</p>
                  <ol className="mt-2 flex flex-col">
                    {col.entries.map((e, i) => (
                      <li key={e.label} className={cn(i > 0 && "border-t border-border/70")}>
                        <Link
                          href={e.href}
                          onClick={onNavigate}
                          className="group flex items-center gap-3 py-2"
                        >
                          <span className="w-3 shrink-0 text-xs text-muted-foreground">{i + 1}</span>
                          {e.image && (
                            <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[3px] bg-muted">
                              <Image src={e.image} alt="" fill sizes="40px" className="object-cover" />
                            </span>
                          )}
                          <span className="text-sm leading-snug group-hover:underline group-hover:underline-offset-2">
                            {e.label}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
