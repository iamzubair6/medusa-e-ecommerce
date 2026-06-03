"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Zap } from "lucide-react";
import { cn } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";

/** Fashion-Nova-style card: image + BOGO pill, hover quick-add panel, sale price,
 *  and selectable color swatches that swap the image + sizes. */
export function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const colors = product.cardColors ?? [];
  const [ci, setCi] = useState(0);
  const active = colors[ci];
  const thumbnail = active?.thumbnail || product.thumbnail;
  const sizes = (active?.sizes ?? []).filter((s) => s.variantId);

  const quickAdd = (variantId: string) =>
    addItem.mutate({ variantId, quantity: 1 }, { onSuccess: () => openCart() });

  return (
    <div className="group">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Link href={`/products/${product.handle}`} className="block h-full w-full">
          <Image
            src={thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </Link>

        {product.badge && (
          <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wide text-accent-foreground">
            {product.badge}
          </span>
        )}

        {sizes.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-background p-3 opacity-0 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-fluid group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.14em]">
              Add to Bag{active && colors.length > 1 ? ` · ${active.name}` : ""}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={s.stock <= 0 || addItem.isPending}
                  onClick={() => quickAdd(s.variantId!)}
                  title={s.lowStock ? `Only ${s.stock} left` : undefined}
                  className={cn(
                    "relative flex h-8 items-center justify-center rounded-sm border border-border text-xs font-medium transition-colors hover:border-foreground hover:bg-foreground hover:text-background",
                    s.stock <= 0 && "cursor-not-allowed opacity-40 line-through",
                  )}
                >
                  {s.size}
                  {s.lowStock && s.stock > 0 && (
                    <Zap className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2">
        <Link href={`/products/${product.handle}`} className="line-clamp-2 text-xs leading-snug text-foreground hover:underline">
          {product.title}
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <span className={cn("text-sm font-bold", product.originalPrice && "text-accent")}>{product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">{product.originalPrice}</span>
          )}
        </div>
        {product.offer && (
          <p className="mt-0.5 line-clamp-1 text-[0.65rem] font-semibold uppercase tracking-wide text-accent">
            {product.offer.label}
          </p>
        )}

        {/* selectable color swatches */}
        {colors.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {colors.map((c, i) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                title={c.name}
                aria-pressed={i === ci}
                onMouseEnter={() => setCi(i)}
                onClick={() => setCi(i)}
                className={cn(
                  "h-4 w-4 cursor-pointer rounded-full border p-px transition",
                  i === ci ? "border-foreground" : "border-border hover:border-foreground/60",
                )}
              >
                <span className="block h-full w-full rounded-full" style={{ backgroundColor: c.swatch }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
