import { listAbandonedCarts } from "@ecom/cms";
import { getAbandonedRecovery } from "@/lib/recovery-incentive";
import { AdminHeader } from "@/components/admin/page-header";
import { AbandonedCartsClient, type AbandonedRow } from "@/components/admin/abandoned-carts-client";

export const dynamic = "force-dynamic";

interface RawItem {
  title?: unknown;
  quantity?: unknown;
  thumbnail?: unknown;
}

export default async function AbandonedCartsPage() {
  const [carts, recovery] = await Promise.all([
    listAbandonedCarts(30, 100).catch(() => []),
    getAbandonedRecovery(),
  ]);
  const rows: AbandonedRow[] = carts.map((c) => ({
    id: c.id,
    email: c.email,
    itemCount: c.itemCount,
    total: c.total,
    reminded: Boolean(c.remindedAt),
    updatedAt: c.updatedAt.toISOString(),
    items: (Array.isArray(c.items) ? (c.items as RawItem[]) : []).slice(0, 8).map((i) => ({
      title: String(i.title ?? "Item"),
      quantity: Number(i.quantity) || 1,
      thumbnail: typeof i.thumbnail === "string" ? i.thumbnail : null,
    })),
  }));

  return (
    <>
      <AdminHeader
        title="Abandoned carts"
        description="Shoppers who entered their email at checkout but didn't finish. Send a nudge — optionally sweetened with a one-time discount — to bring them back."
      />
      <div className="p-8">
        <AbandonedCartsClient rows={rows} discountPercent={recovery.discountPercent} />
      </div>
    </>
  );
}
