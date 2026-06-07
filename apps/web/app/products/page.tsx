import type { Metadata } from "next";
import { buildListing } from "@/lib/build-listing";
import { ListingView } from "@/components/site/listing-view";

export const revalidate = 300;

export const metadata: Metadata = { title: "Shop All" };

type Search = Promise<Record<string, string | string[] | undefined>>;

export default async function AllProductsPage({ searchParams }: { searchParams: Search }) {
  const props = await buildListing({ kind: "all", searchParams: await searchParams });
  return (
    <main>
      <ListingView {...props} />
    </main>
  );
}
