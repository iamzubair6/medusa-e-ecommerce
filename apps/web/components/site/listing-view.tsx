import { Container } from "@ecom/ui";
import type { ProductListResult, ProductSort } from "@/lib/commerce";
import { SiteNavbar } from "./site-navbar";
import { Footer } from "./footer";
import { CategoryBody } from "./category-body";

interface ListingViewProps {
  title: string;
  subtitle?: string;
  basePath: string;
  sort: ProductSort;
  result: ProductListResult;
}

/** Server wrapper: site chrome + the filterable category body. */
export async function ListingView({ title, subtitle, basePath, sort, result }: ListingViewProps) {
  return (
    <>
      <SiteNavbar />
      <Container>
        <CategoryBody
          title={title}
          subtitle={subtitle}
          basePath={basePath}
          sort={sort}
          products={result.products}
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
        />
      </Container>
      <Footer />
    </>
  );
}
