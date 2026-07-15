import Link from "next/link";
import { formatOrderId } from "@/lib/order-id";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card } from "@ecom/ui";
import { getCustomerDetail } from "@/lib/medusa-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { AdminHeader } from "@/components/admin/page-header";
import { CustomerDeleteButton } from "@/components/admin/customer-delete-button";

export const dynamic = "force-dynamic";

function statusVariant(s: string): "gold" | "muted" | "outline" {
  if (["shipped", "delivered", "fulfilled", "captured"].includes(s)) return "gold";
  if (["not_fulfilled", "awaiting", "not_paid"].includes(s)) return "outline";
  return "muted";
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer, session] = await Promise.all([getCustomerDetail(id), getAdminSession()]);
  if (!customer) notFound();

  return (
    <>
      <AdminHeader
        title={customer.name !== "—" ? customer.name : customer.email ?? "Customer"}
        description={`Customer since ${new Date(customer.createdAt).toLocaleDateString()}`}
        action={
          <div className="flex items-center gap-3">
            {session?.role === "ADMIN" && (
              <CustomerDeleteButton
                id={customer.id}
                name={customer.name !== "—" ? customer.name : customer.email ?? "this customer"}
                redirectTo="/admin/customers"
              />
            )}
            <Link href="/admin/customers" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> All customers
            </Link>
          </div>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-[280px_1fr]">
        <Card className="flex h-fit flex-col gap-3 p-5 text-sm">
          {customer.email && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="font-medium">{customer.email}</p>
            </div>
          )}
          {customer.phone && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
              <p className="font-medium">{customer.phone}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total orders</p>
            <p className="font-display text-2xl font-bold">{customer.orders.length}</p>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                <th>Order</th>
                <th>Date</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Fulfilment</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/30 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-semibold">
                    <Link href={`/admin/orders/${o.id}`} className="hover:text-accent">{formatOrderId(o.displayId)}</Link>
                  </td>
                  <td className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</td>
                  <td className="font-semibold">{o.total}</td>
                  <td>
                    <Badge variant={statusVariant(o.paymentStatus)}>{o.paymentStatus}</Badge>
                  </td>
                  <td>
                    <Badge variant={statusVariant(o.fulfillmentStatus)}>{o.fulfillmentStatus.replace(/_/g, " ")}</Badge>
                  </td>
                </tr>
              ))}
              {customer.orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
