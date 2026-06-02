import Link from "next/link";
import Image from "next/image";
import { Badge } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";

export function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted">
        <Image
          src={product.thumbnail}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-[900ms] ease-fluid group-hover:scale-[1.06]"
        />
        {product.badge && (
          <Badge variant="accent" className="absolute left-3 top-3">
            {product.badge}
          </Badge>
        )}
        {/* hover reveal: view affordance */}
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-background/90 px-4 py-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] backdrop-blur-sm transition-transform duration-500 ease-fluid group-hover:translate-y-0">
          View product
        </div>
      </div>
      <div className="mt-3.5 flex items-start justify-between gap-3">
        <h3 className="text-sm leading-snug text-foreground transition-colors group-hover:text-accent">
          {product.title}
        </h3>
        <span className="shrink-0 font-display text-sm">{product.price}</span>
      </div>
    </Link>
  );
}
