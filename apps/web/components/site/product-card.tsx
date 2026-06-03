"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, Zap } from "lucide-react";
import { Badge, cn } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";

export function ProductCard({ product }: { product: StoreProduct }) {
  const { addItem } = useCart();
  const { openCart } = useCartUI();
  const sizes = (product.quickAdd ?? []).filter((s) => s.variantId);

  const quickAdd = (variantId: string) =>
    addItem.mutate({ variantId, quantity: 1 }, { onSuccess: () => openCart() });

  return (
    <div className="group relative">
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
        <Link href={`/products/${product.handle}`} className="block h-full w-full">
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </Link>
        {product.badge && (
          <Badge variant="accent" className="absolute left-2 top-2">
            {product.badge}
          </Badge>
        )}
        <button
          type="button"
          aria-label="Add to wishlist"
          className="absolute right-2 top-2 cursor-pointer rounded-full bg-background/85 p-1.5 text-foreground opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
        >
          <Heart className="h-4 w-4" />
        </button>

        {/* quick-shop overlay */}
        {sizes.length > 0 && (
          <div className="absolute inset-x-0 bottom-0 translate-y-full bg-background/95 p-2 backdrop-blur-sm transition-transform duration-300 ease-fluid group-hover:translate-y-0">
            <p className="mb-1 text-center text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Quick add
            </p>
            <div className="flex flex-wrap justify-center gap-1">
              {sizes.map((s) => (
                <button
                  key={s.size}
                  type="button"
                  disabled={s.stock <= 0 || addItem.isPending}
                  onClick={() => quickAdd(s.variantId!)}
                  title={s.lowStock ? `Only ${s.stock} left` : undefined}
                  className={cn(
                    "flex h-8 min-w-8 cursor-pointer items-center justify-center gap-0.5 rounded-sm border border-border px-1.5 text-xs font-medium transition-colors hover:border-foreground hover:bg-foreground hover:text-background",
                    s.stock <= 0 && "cursor-not-allowed opacity-40 line-through",
                  )}
                >
                  {s.size}
                  {s.lowStock && s.stock > 0 && <Zap className="h-2.5 w-2.5 text-accent" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-2">
        <Link href={`/products/${product.handle}`} className="line-clamp-1 text-xs text-foreground hover:underline">
          {product.title}
        </Link>
        <div className="mt-0.5 flex items-center gap-2">
          <span className={cn("text-sm font-bold", product.originalPrice && "text-accent")}>{product.price}</span>
          {product.originalPrice && (
            <span className="text-xs text-muted-foreground line-through">{product.originalPrice}</span>
          )}
        </div>
        {product.swatches && product.swatches.length > 0 && (
          <div className="mt-1.5 flex gap-1">
            {product.swatches.slice(0, 5).map((hex, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-full border border-border"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
