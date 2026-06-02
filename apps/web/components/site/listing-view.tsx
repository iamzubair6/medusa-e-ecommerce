import Link from "next/link";
import { Container } from "@ecom/ui";
import type { ProductListResult, ProductSort } from "@/lib/commerce";
import { SiteNavbar } from "./site-navbar";
import { Footer } from "./footer";
import { ProductGrid } from "./product-grid";
import { SortSelect } from "./sort-select";

interface ListingViewProps {
  title: string;
  subtitle?: string;
  basePath: string;
  sort: ProductSort;
  result: ProductListResult;
}

function pageHref(basePath: string, page: number, sort: ProductSort) {
  const params = new URLSearchParams({ sort });
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export async function ListingView({ title, subtitle, basePath, sort, result }: ListingViewProps) {
  const { page, totalPages, total } = result;
  return (
    <>
      <SiteNavbar />
      <Container className="py-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold capitalize tracking-tight md:text-4xl">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {subtitle ?? `${total} ${total === 1 ? "item" : "items"}`}
            </p>
          </div>
          <SortSelect value={sort} />
        </div>

        <ProductGrid products={result.products} />

        {totalPages > 1 && (
          <nav className="mt-12 flex items-center justify-center gap-2" aria-label="Pagination">
            {page > 1 && (
              <Link
                href={pageHref(basePath, page - 1, sort)}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Previous
              </Link>
            )}
            <span className="px-3 text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageHref(basePath, page + 1, sort)}
                className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
              >
                Next
              </Link>
            )}
          </nav>
        )}
      </Container>
      <Footer />
    </>
  );
}
