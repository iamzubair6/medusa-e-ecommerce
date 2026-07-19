"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button, cn } from "@ecom/ui";
import type { Look } from "@/lib/shop-the-look";
import type { StoreProduct } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";
import { QuickShopModal } from "./quick-shop-modal";

/**
 * PDP "Shop the Look": the tagged outfit photo with numbered dots that open a
 * quick-shop modal (add each piece without leaving), a strip of the tagged
 * products, and "Add the whole look" — every piece's first in-stock variant
 * added in one click.
 */
export function ShopTheLook({
  look,
  products,
  bundlePercent = 0,
  bundleCode = "",
}: {
  look: Look;
  products: StoreProduct[];
  bundlePercent?: number;
  bundleCode?: string;
}) {
  const { addItem, applyPromo } = useCart();
  const { openCart } = useCartUI();
  const [quickShop, setQuickShop] = useState<StoreProduct | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addAllError, setAddAllError] = useState<string | null>(null);

  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const priceNum = (p: StoreProduct) => Number(p.price.replace(/[^0-9.]/g, "")) || 0;
  const lookTotal = products.reduce((n, p) => n + priceNum(p), 0);
  const bundleActive = bundlePercent > 0 && products.length > 1;
  const saved = Math.round((lookTotal * bundlePercent) / 100);

  // First available variant — prefer one that's in stock, else any real variant.
  const firstVariant = (p: StoreProduct): string | undefined => {
    const all = (p.cardColors ?? []).flatMap((c) => c.sizes).filter((s) => s.variantId);
    return (all.find((s) => s.stock > 0) ?? all[0])?.variantId;
  };

  const addWholeLook = async () => {
    const variantIds = products.map(firstVariant).filter((v): v is string => Boolean(v));
    if (variantIds.length === 0) return;
    setAddingAll(true);
    setAddAllError(null);
    let added = 0;
    // Sequential so the cart totals settle cleanly; one failure must not abort
    // the rest or leave an unhandled rejection.
    for (const variantId of variantIds) {
      try {
        await addItem.mutateAsync({ variantId, quantity: 1 });
        added += 1;
      } catch {
        /* keep going — report the shortfall below */
      }
    }
    // Apply the bundle promo once the full look is in the cart.
    if (added > 0 && bundleActive && bundleCode) {
      try {
        await applyPromo.mutateAsync(bundleCode);
      } catch {
        /* promo optional — cart still has the items */
      }
    }
    setAddingAll(false);
    if (added > 0) openCart();
    if (added < variantIds.length) {
      setAddAllError(
        added === 0
          ? "Couldn't add these items — please try each piece individually."
          : `Added ${added} of ${variantIds.length} — some pieces are unavailable.`,
      );
    }
  };

  const openHotspot = (handle: string) => {
    const p = byHandle.get(handle);
    if (p) setQuickShop(p);
  };

  return (
    <section aria-label="Shop the look" className="mt-16">
      <h2 className="font-display text-xl font-bold uppercase tracking-tight">Shop the Look</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tap a dot to shop each piece.</p>

      <div className="mt-4 grid gap-6 md:grid-cols-[minmax(0,22rem)_1fr]">
        {/* tagged photo */}
        <div className="relative self-start overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={look.imageUrl} alt="Model wearing the full look" className="w-full" />
          {look.hotspots.map((h, i) => (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => openHotspot(h.productHandle)}
              aria-label={h.label || `Shop tagged item ${i + 1}`}
              className="group absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
            >
              <span className="relative flex h-7 w-7 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 motion-safe:animate-ping motion-safe:[animation-duration:2s]" />
                <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 bg-white text-[11px] font-bold text-ink shadow-sm transition-transform group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-accent">
                  {i + 1}
                </span>
              </span>
              {h.label && (
                <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-xs text-white group-hover:block group-focus-visible:block">
                  {h.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* product strip + add-all */}
        <div className="flex flex-col">
          <ul className="flex flex-col divide-y divide-border">
            {look.hotspots.map((h, i) => {
              const p = byHandle.get(h.productHandle);
              if (!p) return null;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setQuickShop(p)}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "flex w-full items-center gap-4 py-3 text-left transition-colors motion-reduce:transition-none",
                      hovered === i && "bg-muted/40",
                    )}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-[11px] font-bold">
                      {i + 1}
                    </span>
                    <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-muted">
                      <Image src={p.thumbnail} alt="" fill sizes="48px" className="object-cover" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block text-sm text-muted-foreground">{p.price}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-accent">
                      Quick add
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {products.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              <Button variant="solid" className="self-start" onClick={addWholeLook} loading={addingAll}>
                {addingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <ShoppingBag className="mr-2 h-4 w-4" />
                )}
                Add the whole look{bundleActive ? ` · save ${bundlePercent}%` : ""}
              </Button>
              {bundleActive && (
                <p className="text-sm text-accent">
                  Buy all {products.length} together and save {bundlePercent}%
                  {saved > 0 ? ` (৳${saved.toLocaleString("en-US")})` : ""}
                  {bundleCode ? " — applied at checkout." : "."}
                </p>
              )}
              {addAllError && <p className="text-sm text-destructive">{addAllError}</p>}
            </div>
          )}
        </div>
      </div>

      <QuickShopModal product={quickShop} onClose={() => setQuickShop(null)} />
    </section>
  );
}
