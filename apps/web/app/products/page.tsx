import type { Metadata } from "next";
import { fetchProductList } from "@/lib/commerce";
import { parseListingParams } from "@/lib/listing-params";
import { ListingView } from "@/components/site/listing-view";

export const revalidate = 300;

export const metadata: Metadata = { title: "All Products" };

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const { sort, page } = parseListingParams(await searchParams);
  const result = await fetchProductList({ page, sort });
  return (
    <main>
      <ListingView title="All Products" basePath="/products" sort={sort} result={result} />
    </main>
  );
}
