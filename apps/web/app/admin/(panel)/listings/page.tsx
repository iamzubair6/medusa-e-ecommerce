import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { ListingConfigBuilder, type ListingTarget } from "@/components/admin/listing-config-builder";
import { parseListingConfig } from "@/lib/listing-config";
import { listCategories, DIVISION_HANDLES } from "@/lib/commerce";
import { DIVISION_NAMES } from "@/lib/build-listing";

export const dynamic = "force-dynamic";

export default async function ListingsPage() {
  const [raw, cats] = await Promise.all([
    getSiteSetting("listingConfig").catch(() => null),
    listCategories().catch(() => []),
  ]);

  // Division handles can collide with same-named category handles (e.g. "women"
  // is both a division and a category), so dedupe by handle keeping the first
  // occurrence — division entries win over same-handle categories.
  const seen = new Set<string>();
  const targets: ListingTarget[] = [
    { handle: "all", label: "All products" },
    ...DIVISION_HANDLES.map((h) => ({ handle: h, label: `${DIVISION_NAMES[h] ?? h} · division` })),
    ...cats.map((c) => ({ handle: c.handle, label: `${c.name} · category` })),
  ].filter((t) => {
    if (seen.has(t.handle)) return false;
    seen.add(t.handle);
    return true;
  });

  return (
    <>
      <AdminHeader
        title="Listings"
        description="Per-listing filter rail (Category visibility + group order) and an optional curated tile row above the grid. Pick a listing; defaults keep the derived behaviour."
      />
      <div className="p-8">
        <ListingConfigBuilder initial={parseListingConfig(raw)} targets={targets} />
      </div>
    </>
  );
}
