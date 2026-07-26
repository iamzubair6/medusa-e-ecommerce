import { listPromotions, listCategories, listCollections } from "@/lib/medusa-admin";
import { getPhoneReward } from "@/lib/phone-reward";
import { AdminHeader } from "@/components/admin/page-header";
import { DiscountManager } from "@/components/admin/discount-manager";
import { PhoneRewardCard } from "@/components/admin/phone-reward-card";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const [promotions, categories, collections, phoneReward] = await Promise.all([
    listPromotions(),
    listCategories(),
    listCollections(),
    getPhoneReward(),
  ]);

  return (
    <>
      <AdminHeader title="Discounts & Promotions" description="Codes, automatic deals, free shipping & BOGO — enforced at checkout." />
      <div className="flex flex-col gap-6 p-8">
        <PhoneRewardCard initial={phoneReward} />
        <DiscountManager promotions={promotions} categories={categories} collections={collections} />
      </div>
    </>
  );
}
