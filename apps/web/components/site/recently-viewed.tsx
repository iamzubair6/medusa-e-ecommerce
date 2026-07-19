"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { readRecentlyViewed, recordView, type ViewedProduct } from "@/lib/recently-viewed";

/**
 * Records the current product as viewed, then shows a "Recently viewed" rail of
 * the shopper's other recent products (localStorage, no account needed). Hidden
 * until there's at least one other product to show.
 */
export function RecentlyViewed({ current }: { current: ViewedProduct }) {
  const [items, setItems] = useState<ViewedProduct[]>([]);

  useEffect(() => {
    recordView(current);
    setItems(readRecentlyViewed().filter((p) => p.handle !== current.handle));
  }, [current]);

  if (items.length === 0) return null;

  return (
    <section aria-label="Recently viewed" className="mt-16">
      <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">Recently viewed</h2>
      <div className="-mx-2 flex snap-x gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <Link key={p.handle} href={`/products/${p.handle}`} className="group w-40 shrink-0 snap-start px-2">
            <span className="relative block aspect-[3/4] overflow-hidden rounded-sm bg-muted">
              <Image
                src={p.thumbnail}
                alt={p.title}
                fill
                sizes="160px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </span>
            <span className="mt-2 block truncate text-sm">{p.title}</span>
            <span className="block text-sm text-muted-foreground">{p.price}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
