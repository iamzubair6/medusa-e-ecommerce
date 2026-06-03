import { listPromotions } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { DiscountManager } from "@/components/admin/discount-manager";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const promotions = await listPromotions();

  return (
    <>
      <AdminHeader title="Discounts" description="Create & manage checkout discount codes." />
      <div className="p-8">
        <DiscountManager promotions={promotions} />
      </div>
    </>
  );
}
