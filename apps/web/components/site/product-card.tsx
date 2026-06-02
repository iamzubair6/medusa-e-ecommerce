import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";
import { Badge } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <div className="group relative">
      <Link href={`/products/${product.handle}`} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {product.badge && (
            <Badge variant="accent" className="absolute left-2 top-2">
              {product.badge}
            </Badge>
          )}
        </div>
      </Link>
      <button
        type="button"
        aria-label="Add to wishlist"
        className="absolute right-2 top-2 cursor-pointer rounded-full bg-white/85 p-1.5 text-foreground opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
      >
        <Heart className="h-4 w-4" />
      </button>
      <div className="mt-2">
        <Link href={`/products/${product.handle}`} className="line-clamp-1 text-xs text-foreground hover:underline">
          {product.title}
        </Link>
        <p className="mt-0.5 text-sm font-bold">{product.price}</p>
      </div>
    </div>
  );
}
