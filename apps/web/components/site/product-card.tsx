"use client";

import Link from "next/link";
import Image from "next/image";
import { Zap } from "lucide-react";
import { cn } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";

/** Fashion-Nova-style card: image + BOGO pill, hover quick-add size panel, then
 *  title, sale price, and swatch dots. */
export function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const sizes = (product.quickAdd ?? []).filter((s) => s.variantId);

  const quickAdd = (variantId: string) =>
    addItem.mutate({ variantId, quantity: 1 }, { onSuccess: () => openCart() });

  return (
    <div className="group">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Link href={`/products/${product.handle}`} className="block h-full w-full">
          <Image
            src={product.thumbnail}
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

        {/* hover quick-add panel (solid, slides over image bottom) */}
        {sizes.length > 0 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-background p-3 opacity-0 shadow-[0_-8px_20px_rgba(0,0,0,0.08)] transition-all duration-300 ease-fluid group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
            <p className="mb-2 text-[0.65rem] font-bold uppercase tracking-[0.14em]">Add to Bag</p>
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
        {product.swatches && product.swatches.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {product.swatches.slice(0, 5).map((hex, i) => (
              <span key={i} className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: hex }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
