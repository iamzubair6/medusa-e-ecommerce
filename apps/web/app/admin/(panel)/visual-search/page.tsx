import { getSiteSetting } from "@ecom/cms";
import { listCategories } from "@/lib/commerce";
import { parseVisualSearchSettings } from "@/lib/visual-search-settings";
import { AdminHeader } from "@/components/admin/page-header";
import { VisualSearchClient } from "@/components/admin/visual-search-client";

export const dynamic = "force-dynamic";

export default async function VisualSearchPage() {
  const [raw, categories] = await Promise.all([
    getSiteSetting("visualSearch").catch(() => null),
    listCategories().catch(() => []),
  ]);
  return (
    <>
      <AdminHeader
        title="Visual Search"
        description="Shoppers upload a photo (camera icon in the search bar) and get matching products."
      />
      <div className="p-8">
        <VisualSearchClient
          settings={parseVisualSearchSettings(raw)}
          categoryHandles={categories.map((c) => c.handle)}
        />
      </div>
    </>
  );
}
