import { listPromotions, listCategories, listCollections } from "@/lib/medusa-admin";
import { getPhoneReward } from "@/lib/phone-reward";
import { getPublicPromoCodes, getBatchPrefixes } from "@/lib/public-promos";
import { AdminHeader } from "@/components/admin/page-header";
import { DiscountManager } from "@/components/admin/discount-manager";
import { PhoneRewardCard } from "@/components/admin/phone-reward-card";
import { PromoBatchCard } from "@/components/admin/promo-batch-card";

export const dynamic = "force-dynamic";

export default async function AdminDiscountsPage() {
  const [allPromotions, categories, collections, phoneReward, publicCodes, batchPrefixes] = await Promise.all([
    listPromotions(),
    listCategories(),
    listCollections(),
    getPhoneReward(),
    getPublicPromoCodes(),
    getBatchPrefixes(),
  ]);
  // Fold machine-made codes (card batches, personal PH-/AB-, storefront
  // free-delivery) out of the table — they'd drown the real promotions.
  const machinePrefixes = [...batchPrefixes.map((p) => `${p}-`), "PH-", "AB-"];
  const promotions = allPromotions.filter(
    (p) =>
      p.code !== "FREESHIP-ITEMS" &&
      !machinePrefixes.some((prefix) => p.code.toUpperCase().startsWith(prefix)),
  );
  const foldedCount = allPromotions.length - promotions.length;

  return (
    <>
      <AdminHeader title="Discounts & Promotions" description="Codes, automatic deals, free shipping & BOGO — enforced at checkout." />
      <div className="flex flex-col gap-6 p-8">
        <PhoneRewardCard initial={phoneReward} />
        <PromoBatchCard />
        <DiscountManager
          promotions={promotions}
          categories={categories}
          collections={collections}
          publicCodes={[...publicCodes]}
        />
        {foldedCount > 0 && (
          <p className="max-w-3xl text-xs text-muted-foreground">
            {foldedCount} machine-generated code{foldedCount === 1 ? "" : "s"} (card batches, personal
            rewards, free-delivery) are managed automatically and hidden from this list.
          </p>
        )}
      </div>
    </>
  );
}
