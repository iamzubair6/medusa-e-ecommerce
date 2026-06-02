import Link from "next/link";
import { Container, Reveal, cn } from "@ecom/ui";
import type { ProductRowConfig } from "@ecom/cms";
import type { StoreProduct } from "@/lib/commerce";
import { ProductCard } from "./product-card";

interface ProductRowProps {
  config: ProductRowConfig;
  products: StoreProduct[];
}

/** Featured / new / best-seller row. Grid or horizontal snap carousel. */
export function ProductRow({ config, products }: ProductRowProps) {
  if (products.length === 0) {
    return (
      <Container className="py-12">
        <p className="text-sm text-muted-foreground">No products to show yet.</p>
      </Container>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <Container>
        <Reveal className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
              {config.heading}
            </h2>
            {config.subheading && (
              <p className="mt-1 text-sm text-muted-foreground">{config.subheading}</p>
            )}
          </div>
          {config.cta && (
            <Link
              href={config.cta.href}
              className="shrink-0 text-xs font-semibold uppercase tracking-wide text-foreground/70 transition-colors hover:text-gold"
            >
              {config.cta.label}
            </Link>
          )}
        </Reveal>
      </Container>

      {config.layout === "carousel" ? (
        <Container>
          <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {products.map((p) => (
              <div key={p.id} className="w-[60%] shrink-0 snap-start sm:w-[40%] md:w-[28%] lg:w-[22%]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </Container>
      ) : (
        <Container>
          <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4")}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </Container>
      )}
    </section>
  );
}
