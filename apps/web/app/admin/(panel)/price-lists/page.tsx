import { listPriceLists, listCategories, listCollections } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { PriceListManager } from "@/components/admin/price-list-manager";

export const dynamic = "force-dynamic";

export default async function AdminPriceListsPage() {
  const [priceLists, categories, collections] = await Promise.all([
    listPriceLists(),
    listCategories(),
    listCollections(),
  ]);

  return (
    <>
      <AdminHeader title="Sales & Price Lists" description="Run timed sales or price overrides by product, category, or collection." />
      <div className="p-8">
        <PriceListManager priceLists={priceLists} categories={categories} collections={collections} />
      </div>
    </>
  );
}
