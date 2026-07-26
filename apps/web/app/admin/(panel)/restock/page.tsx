import { restockDemandByVariant } from "@ecom/cms";
import { getLowStock, type LowStockVariant } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { RestockCentre, type RestockRow } from "@/components/admin/restock-client";

export const dynamic = "force-dynamic";

export default async function RestockPage() {
  const [grouped, lowStock] = await Promise.all([
    restockDemandByVariant().catch(() => []),
    getLowStock(5, 30).catch((): LowStockVariant[] => []),
  ]);

  const waiting: RestockRow[] = grouped
    .map((g) => ({
      variantId: g.variantId,
      productHandle: g.productHandle,
      productTitle: g.productTitle,
      size: g.size,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <AdminHeader
        title="Restock centre"
        description="Sold-out and low sizes across the catalogue, and the shoppers waiting to hear a size is back."
      />
      <div className="p-8">
        <RestockCentre lowStock={lowStock} waiting={waiting} />
      </div>
    </>
  );
}
