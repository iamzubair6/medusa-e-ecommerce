import { listAbandonedCarts } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { AbandonedCartsClient, type AbandonedRow } from "@/components/admin/abandoned-carts-client";

export const dynamic = "force-dynamic";

export default async function AbandonedCartsPage() {
  const carts = await listAbandonedCarts(30, 100).catch(() => []);
  const rows: AbandonedRow[] = carts.map((c) => ({
    id: c.id,
    email: c.email,
    itemCount: c.itemCount,
    total: c.total,
    reminded: Boolean(c.remindedAt),
    updatedAt: c.updatedAt.toISOString(),
  }));

  return (
    <>
      <AdminHeader
        title="Abandoned carts"
        description="Shoppers who entered their email at checkout but didn't finish. Send a nudge to bring them back."
      />
      <div className="p-8">
        <AbandonedCartsClient rows={rows} />
      </div>
    </>
  );
}
