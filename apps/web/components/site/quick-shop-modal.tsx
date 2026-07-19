"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Heart, Loader2, X } from "lucide-react";
import { Button, cn } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";

/**
 * Fashion-Nova "Style it with" / quick-shop modal: pick color + size and add a
 * product to the bag WITHOUT leaving the current page. Works off the card shape
 * (`cardColors[].sizes[].variantId`), so any StoreProduct can be quick-shopped.
 * Reused by the Style-it-with row and the Shop-the-Look hotspots.
 */
export function QuickShopModal({
  product,
  onClose,
}: {
  product: StoreProduct | null;
  onClose: () => void;
}) {
  const reduce = useReducedMotion();
  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const { has, toggle } = useWishlist();
  const [ci, setCi] = useState(0);
  const [size, setSize] = useState<string | null>(null);

  useEffect(() => {
    setCi(0);
    setSize(null);
  }, [product?.handle]);

  const colors = product?.cardColors ?? [];
  const active = colors[ci];
  const sizes = (active?.sizes ?? []).filter((s) => s.variantId);
  const sizeObj = sizes.find((s) => s.size === size);
  const image = active?.thumbnail || product?.thumbnail || "";
  const wished = product ? has(product.handle) : false;

  const add = () => {
    if (!sizeObj?.variantId) return;
    addItem.mutate(
      { variantId: sizeObj.variantId, quantity: 1 },
      {
        onSuccess: () => {
          onClose();
          openCart();
        },
      },
    );
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={`Quick shop ${product.title}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          >
            <div className="relative border-b border-border py-4 text-center">
              <h2 className="font-display text-base font-bold uppercase tracking-wide">Style It With</h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md bg-muted">
                {image && <Image src={image} alt={product.title} fill sizes="320px" className="object-cover" />}
              </div>

              <div className="mt-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <p className="mt-1 text-sm">
                    <span className={cn(product.originalPrice && "text-accent")}>{product.price}</span>
                    {product.originalPrice && (
                      <span className="ml-2 text-muted-foreground line-through">{product.originalPrice}</span>
                    )}
                  </p>
                </div>
                <Link
                  href={`/products/${product.handle}`}
                  onClick={onClose}
                  className="shrink-0 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  See full details
                </Link>
              </div>

              {colors.length > 1 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {active?.name}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {colors.map((c, i) => (
                      <button
                        key={c.name}
                        type="button"
                        aria-label={c.name}
                        aria-pressed={ci === i}
                        onClick={() => {
                          setCi(i);
                          setSize(null);
                        }}
                        className={cn(
                          "h-7 w-7 rounded-full border transition-transform hover:scale-110 motion-reduce:transition-none",
                          ci === i ? "border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border-border",
                        )}
                        style={{ backgroundColor: c.swatch }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {sizes.length > 0 ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Size</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {sizes.map((s) => (
                      <button
                        key={s.size}
                        type="button"
                        aria-pressed={size === s.size}
                        onClick={() => setSize(s.size)}
                        className={cn(
                          "min-w-11 rounded-sm border px-3 py-2 text-sm transition-colors motion-reduce:transition-none",
                          size === s.size ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                        )}
                      >
                        {s.size}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">Currently unavailable.</p>
              )}

              <div className="mt-5 flex items-center gap-3">
                <Button
                  variant="solid"
                  className="flex-1"
                  disabled={!sizeObj?.variantId}
                  loading={addItem.isPending}
                  onClick={add}
                >
                  {size ? "Add to bag" : "Select a size"}
                </Button>
                <button
                  type="button"
                  aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
                  aria-pressed={wished}
                  onClick={() =>
                    toggle({ handle: product.handle, title: product.title, thumbnail: product.thumbnail, price: product.price })
                  }
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:border-foreground motion-reduce:transition-none"
                >
                  <Heart className={cn("h-5 w-5", wished ? "fill-accent text-accent" : "text-foreground")} />
                </button>
              </div>
              {addItem.isError && (
                <p className="mt-2 text-sm text-destructive">{(addItem.error as Error).message}</p>
              )}
            </div>

            {addItem.isPending && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent motion-reduce:animate-none" />
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
