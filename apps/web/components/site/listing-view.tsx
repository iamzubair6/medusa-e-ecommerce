import { Container } from "@ecom/ui";
import type { ListingPageProps } from "@/lib/build-listing";
import { SiteNavbar } from "./site-navbar";
import { Footer } from "./footer";
import { CategoryBody } from "./category-body";

/** Server wrapper: site chrome + the filterable category body. */
export async function ListingView(props: ListingPageProps) {
  return (
    <>
      <SiteNavbar />
      <Container>
        <CategoryBody
          title={props.title}
          breadcrumb={props.breadcrumb}
          basePath={props.basePath}
          params={props.params}
          facets={props.facets}
          categoryLinks={props.categoryLinks}
          products={props.products}
          total={props.total}
          page={props.page}
          totalPages={props.totalPages}
          categoryImageRow={props.categoryImageRow}
        />
      </Container>
      <Footer />
    </>
  );
}
