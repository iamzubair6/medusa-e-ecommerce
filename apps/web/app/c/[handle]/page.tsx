import type { Metadata } from "next";
import { buildListing } from "@/lib/build-listing";
import { prettifyHandle } from "@/lib/listing-params";
import { ListingView } from "@/components/site/listing-view";

export const revalidate = 300;

type Params = Promise<{ handle: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  return { title: prettifyHandle(handle) };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { handle } = await params;
  const props = await buildListing({ kind: "category", handle, searchParams: await searchParams });
  return (
    <main>
      <ListingView {...props} />
    </main>
  );
}
