import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge, Card } from "@ecom/ui";
import { getOrderDetail } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { OrderActions } from "@/components/admin/order-actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetail(id);
  if (!order) notFound();

  return (
    <>
      <AdminHeader
        title={`Order #${order.displayId}`}
        description={`${order.email} · ${new Date(order.createdAt).toLocaleString()}`}
        action={
          <Link href="/admin/orders" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> All orders
          </Link>
        }
      />
      <div className="grid gap-6 p-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="mb-4 flex gap-2">
              <Badge variant={order.paymentMethod === "cod" ? "outline" : "muted"}>
                {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentStatus}
              </Badge>
              <Badge variant={order.fulfilled ? "gold" : "outline"}>
                {order.fulfillmentStatus.replace(/_/g, " ")}
              </Badge>
              {order.canceled && <Badge variant="accent">Canceled</Badge>}
            </div>
            <ul className="flex flex-col divide-y divide-border">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded bg-muted">
                    {it.thumbnail && <Image src={it.thumbnail} alt={it.title} fill sizes="44px" className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.title}</p>
                    {it.variant && <p className="text-xs text-muted-foreground">{it.variant}</p>}
                  </div>
                  <span className="text-sm text-muted-foreground">×{it.quantity}</span>
                  <span className="w-20 text-right text-sm font-semibold">{it.total}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-1 border-t border-border pt-4 text-sm">
              <Row label="Subtotal" value={order.subtotal} />
              <Row label="Shipping" value={order.shippingTotal} />
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Total</span>
                <span>{order.total}</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fulfilment</h3>
            <OrderActions order={order} />
          </Card>

          {order.address && (
            <Card className="p-5 text-sm">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Shipping address</h3>
              <p className="font-medium">{order.address.name}</p>
              <p className="text-muted-foreground">{order.address.line1}</p>
              <p className="text-muted-foreground">
                {[order.address.city, order.address.postalCode, order.address.country].filter(Boolean).join(", ")}
              </p>
              {order.address.phone && <p className="text-muted-foreground">{order.address.phone}</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
