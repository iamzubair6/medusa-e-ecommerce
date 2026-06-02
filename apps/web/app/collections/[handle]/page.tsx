import type { Metadata } from "next";
import { fetchProductList } from "@/lib/commerce";
import { parseListingParams, prettifyHandle } from "@/lib/listing-params";
import { ListingView } from "@/components/site/listing-view";

export const revalidate = 300;

type Params = Promise<{ handle: string }>;
type Search = Promise<{ sort?: string; page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  return { title: prettifyHandle(handle) };
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { handle } = await params;
  const { sort, page } = parseListingParams(await searchParams);
  const result = await fetchProductList({ handle, page, sort });
  return (
    <main>
      <ListingView
        title={prettifyHandle(handle)}
        basePath={`/collections/${handle}`}
        sort={sort}
        result={result}
      />
    </main>
  );
}
