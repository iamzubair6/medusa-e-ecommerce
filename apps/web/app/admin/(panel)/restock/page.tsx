import { restockDemandByVariant } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { RestockClient, type RestockRow } from "@/components/admin/restock-client";

export const dynamic = "force-dynamic";

export default async function RestockPage() {
  const grouped = await restockDemandByVariant().catch(() => []);
  const rows: RestockRow[] = grouped
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
        title="Back in stock"
        description="Shoppers who asked to be emailed when a sold-out size returns. Restock the item, then notify them."
      />
      <div className="p-8">
        <RestockClient rows={rows} />
      </div>
    </>
  );
}
