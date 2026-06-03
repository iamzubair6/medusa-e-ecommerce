import { listPromotions, listCategories, listCollections } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { DiscountManager } from "@/components/admin/discount-manager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const [promotions, categories, collections] = await Promise.all([
    listPromotions(),
    listCategories(),
    listCollections(),
  ]);

  return (
    <>
      <AdminHeader title="Discounts & Promotions" description="Codes, automatic deals, free shipping & BOGO — enforced at checkout." />
      <div className="p-8">
        <DiscountManager promotions={promotions} categories={categories} collections={collections} />
      </div>
    </>
  );
}
