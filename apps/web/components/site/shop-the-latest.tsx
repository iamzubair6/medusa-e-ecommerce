"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@ecom/ui";
import type { LatestTab } from "@/lib/commerce";
import { ProductCard } from "./product-card";

export function ShopTheLatest({ tabs }: { tabs: LatestTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!current) return null;
  return (
    <section className="py-8">
      <h2 className="mb-5 text-center font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">Shop the Latest</h2>
      <div className="mb-7 flex flex-wrap justify-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
              active === t.key ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
        {current.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Link
          href={current.href}
          className="inline-block rounded-full border border-foreground px-8 py-3 text-xs font-bold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background"
        >
          Shop All {current.label}
        </Link>
      </div>
    </section>
  );
}
