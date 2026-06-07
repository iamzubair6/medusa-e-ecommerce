import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Reveal } from "@ecom/ui";
import { getReviewSummary, listReviews } from "@ecom/cms";
import { fetchProductByHandle, fetchRelatedProducts, fetchListing, DIVISION_HANDLES } from "@/lib/commerce";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { PdpClient } from "@/components/site/pdp-client";
import { ProductReviews } from "@/components/site/product-reviews";
import { ProductGrid } from "@/components/site/product-grid";

export const revalidate = 300;

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  const product = await fetchProductByHandle(handle);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description: product.description || undefined,
    openGraph: { images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { handle } = await params;
  const product = await fetchProductByHandle(handle);
  if (!product) notFound();

  const divSet = new Set<string>(DIVISION_HANDLES);
  const primaryCat = (product.categoryHandles ?? []).find((h) => !divSet.has(h));
  const [related, trendingResult, reviewSummary, reviewsData] = await Promise.all([
    fetchRelatedProducts(handle, { category: primaryCat, division: product.division, limit: 4 }),
    fetchListing({ collection: "trending" }, { limit: 5 }),
    getReviewSummary(handle),
    listReviews(handle, { take: 20 }),
  ]);
  const trending = trendingResult.products.filter((p) => p.handle !== handle).slice(0, 4);
  const reviews = reviewsData.items.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
  const priceNumber = Number(product.price.replace(/[^0-9.]/g, "")) || undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image: product.images,
    description: product.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: priceNumber,
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <main>
      <SiteNavbar />
      <Container className="py-8">
        <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-foreground">
            Products
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.title}</span>
        </nav>

        <PdpClient product={product} reviewSummary={reviewSummary} />

        <ProductReviews handle={handle} summary={reviewSummary} initialReviews={reviews} />

        {related.length > 0 && (
          <section className="mt-20">
            <Reveal>
              <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">You may also like</h2>
            </Reveal>
            <ProductGrid products={related} />
          </section>
        )}

        {trending.length > 0 && (
          <section className="mt-16">
            <Reveal>
              <h2 className="mb-6 font-display text-2xl font-bold tracking-tight">Trending now</h2>
            </Reveal>
            <ProductGrid products={trending} />
          </section>
        )}
      </Container>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
