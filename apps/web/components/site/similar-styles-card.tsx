"use client";

import { useState } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import type { StoreProduct } from "@/lib/commerce";
import { ShopSimilarModal } from "./shop-similar-modal";
import { QuickShopModal } from "./quick-shop-modal";

interface StyleRef {
  handle: string;
  title: string;
  thumbnail: string;
}

/**
 * Fashion Nova's "WE SEE SIMILAR STYLES" PDP module: closest-style thumbnails +
 * a Shop Similar action (opens the visual-search modal in place), and "STYLE IT
 * WITH" pieces from this product's tagged look, each opening a quick-shop modal
 * so the shopper adds them without leaving the PDP.
 */
export function SimilarStylesCard({
  productId,
  productTitle,
  queryImage,
  similar,
  styleWith,
}: {
  productId: string;
  productTitle: string;
  queryImage: string;
  similar: StyleRef[];
  styleWith: StoreProduct[];
}) {
  const [shopSimilarOpen, setShopSimilarOpen] = useState(false);
  const [quickShop, setQuickShop] = useState<StoreProduct | null>(null);

  if (similar.length === 0 && styleWith.length === 0) return null;

  return (
    <>
      <aside className="rounded-md border border-border p-4" aria-label="Similar styles">
        {similar.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShopSimilarOpen(true)}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
              aria-label="Shop similar styles"
            >
              <span className="flex shrink-0 -space-x-2">
                {similar.slice(0, 3).map((s) => (
                  <span key={s.handle} className="relative h-12 w-9 overflow-hidden rounded-[4px] border border-background shadow-sm">
                    <Image src={s.thumbnail} alt="" fill sizes="36px" className="object-cover" />
                  </span>
                ))}
              </span>
              <span className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em]">We see similar styles</span>
            </button>
            <button
              type="button"
              onClick={() => setShopSimilarOpen(true)}
              className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background motion-reduce:transition-none"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Shop Similar
            </button>
          </div>
        )}

        {styleWith.length > 0 && (
          <div className={similar.length > 0 ? "mt-4 border-t border-border pt-4" : ""}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Style it with</p>
            <div className="mt-2.5 flex gap-3">
              {styleWith.map((s) => (
                <button
                  key={s.handle}
                  type="button"
                  onClick={() => setQuickShop(s)}
                  className="group w-16 shrink-0 cursor-pointer text-left"
                  aria-label={`Quick shop ${s.title}`}
                >
                  <span className="relative block aspect-[3/4] overflow-hidden rounded-[4px] bg-muted">
                    <Image
                      src={s.thumbnail}
                      alt={s.title}
                      fill
                      sizes="64px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    />
                  </span>
                  <span className="mt-1 block truncate text-[0.65rem] text-muted-foreground group-hover:text-foreground">
                    {s.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <ShopSimilarModal
        open={shopSimilarOpen}
        onClose={() => setShopSimilarOpen(false)}
        productId={productId}
        productTitle={productTitle}
        queryImage={queryImage}
      />
      <QuickShopModal product={quickShop} onClose={() => setQuickShop(null)} />
    </>
  );
}
