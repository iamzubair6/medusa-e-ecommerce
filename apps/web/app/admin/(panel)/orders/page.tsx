import Link from "next/link";
import { formatOrderId } from "@/lib/order-id";
import { Badge, Card } from "@ecom/ui";
import { listOrders } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

function statusVariant(s: string): "gold" | "accent" | "muted" | "outline" {
  if (["shipped", "delivered", "fulfilled", "captured"].includes(s)) return "gold";
  if (["not_fulfilled", "awaiting", "not_paid"].includes(s)) return "outline";
  return "muted";
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { orders, count } = await listOrders(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <>
      <AdminHeader title="Orders" description="View, fulfil, and add tracking — no Medusa admin needed." />
      <div className="p-8">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-semibold">
                    <Link href={`/admin/orders/${o.id}`} className="hover:text-accent">{formatOrderId(o.displayId)}</Link>
                  </td>
                  <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td>{o.email}</td>
                  <td className="text-muted-foreground">{o.itemCount}</td>
                  <td className="font-semibold">{o.total}</td>
                  <td>
                    <Badge variant={o.paymentMethod === "cod" ? "outline" : statusVariant(o.paymentStatus)}>
                      {o.paymentMethod === "cod" ? "COD" : o.paymentStatus}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={statusVariant(o.fulfillmentStatus)}>{o.fulfillmentStatus.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} basePath="/admin/orders" />
      </div>
    </>
  );
}
