import type { StoreProduct } from "@/lib/commerce";
import { ProductCard } from "./product-card";

export function ProductGrid({ products }: { products: StoreProduct[] }) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-muted-foreground">No products found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
