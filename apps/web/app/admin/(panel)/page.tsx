import Link from "next/link";
import { prisma, pendingRestockCount } from "@ecom/cms";
import { Card, CardContent } from "@ecom/ui";
import { Banknote, Bell, Receipt, ShoppingBag, UserRound, Truck } from "lucide-react";
import {
  getDashboardStats,
  getDashboardSeries,
  getTopProducts,
  getLowStock,
  listOrders,
} from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { BarChart } from "@/components/admin/bar-chart";

export const dynamic = "force-dynamic";

async function getContentStats() {
  const [pages, popups, leads, campaigns] = await Promise.all([
    prisma.pageLayout.count(),
    prisma.popup.count(),
    prisma.guestLead.count(),
    prisma.campaign.count(),
  ]);
  return { pages, popups, leads, campaigns };
}

const statusLabel = (s: string) => s.replace(/_/g, " ");

export default async function AdminDashboard() {
  const [commerce, content, series, topProducts, lowStock, recent, restockWaiting] = await Promise.all([
    getDashboardStats(),
    getContentStats(),
    getDashboardSeries(14),
    getTopProducts(5).catch(() => []),
    getLowStock(5, 12).catch(() => []),
    listOrders(6).then((r) => r.orders).catch(() => []),
    pendingRestockCount().catch(() => 0),
  ]);
  const revenueTotal = series.reduce((s, p) => s + p.revenue, 0);
  const ordersTotal = series.reduce((s, p) => s + p.orders, 0);

  const commerceCards = [
    { label: "Revenue", value: commerce.revenue, href: "/admin/orders", icon: Banknote },
    { label: "Orders", value: commerce.orders, href: "/admin/orders", icon: Receipt },
    { label: "To fulfil", value: commerce.pendingFulfilment, href: "/admin/orders", icon: Truck },
    { label: "Products", value: commerce.products, href: "/admin/products", icon: ShoppingBag },
    { label: "Customers", value: commerce.customers, href: "/admin/customers", icon: UserRound },
    { label: "Restock waiting", value: restockWaiting, href: "/admin/restock", icon: Bell },
  ];
  const contentCards = [
    { label: "Pages", value: content.pages, href: "/admin/pages" },
    { label: "Campaigns", value: content.campaigns, href: "/admin/campaigns" },
    { label: "Popups", value: content.popups, href: "/admin/popups" },
    { label: "Guest leads", value: content.leads, href: "/admin/leads" },
  ];

  return (
    <>
      <AdminHeader title="Dashboard" description="Your store at a glance." />
      <div className="flex flex-col gap-8 p-8">
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Commerce</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {commerceCards.map((c) => {
              const Icon = c.icon;
              return (
                <Link key={c.label} href={c.href}>
                  <Card className="transition-colors hover:border-gold">
                    <CardContent className="flex flex-col gap-1">
                      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" /> {c.label}
                      </span>
                      <span className="font-display text-3xl font-bold">{c.value}</span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Last 14 days</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <BarChart
              title="Revenue"
              total={`৳${revenueTotal.toLocaleString("en-US")}`}
              bars={series.map((p) => ({ label: p.label, value: p.revenue, display: p.revenueDisplay }))}
              accent="bg-accent"
            />
            <BarChart
              title="Orders"
              total={String(ordersTotal)}
              bars={series.map((p) => ({ label: p.label, value: p.orders, display: `${p.orders} orders` }))}
              accent="bg-gold"
            />
          </div>
        </section>

        {/* Top products + recent orders */}
        <section className="grid gap-4 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top sellers</h2>
            <Card>
              <CardContent className="p-0">
                {topProducts.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">No sales yet.</p>
                ) : (
                  <ol className="divide-y divide-border">
                    {topProducts.map((p, i) => (
                      <li key={p.title} className="flex items-center gap-3 p-3">
                        <span className="w-4 text-sm font-bold text-muted-foreground">{i + 1}</span>
                        {p.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.thumbnail} alt="" className="h-10 w-8 shrink-0 rounded-sm object-cover" />
                        ) : (
                          <span className="h-10 w-8 shrink-0 rounded-sm bg-muted" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
                        <span className="shrink-0 text-sm font-semibold">{p.units} sold</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent orders</h2>
            <Card>
              <CardContent className="p-0">
                {recent.length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">No orders yet.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {recent.map((o) => (
                      <li key={o.id}>
                        <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40">
                          <span className="shrink-0 text-sm font-semibold">MSN-{String(o.displayId).padStart(5, "0")}</span>
                          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{o.email}</span>
                          <span className="shrink-0 text-xs capitalize text-muted-foreground">{statusLabel(o.fulfillmentStatus)}</span>
                          <span className="shrink-0 text-sm font-semibold">{o.total}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Stock alerts — sold-out first (#144: sourced from metadata sizeStock) */}
        {lowStock.length > 0 && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Stock alerts
              {lowStock.some((v) => v.quantity === 0) && (
                <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-[0.65rem] font-bold text-destructive">
                  {lowStock.filter((v) => v.quantity === 0).length} sold out
                </span>
              )}
            </h2>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {lowStock.map((v, i) => (
                    <li key={`${v.productId}-${v.variant}-${i}`} className="flex items-center gap-3 p-3">
                      {v.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={v.thumbnail} alt="" className="h-10 w-8 shrink-0 rounded-sm object-cover" />
                      ) : (
                        <span className="h-10 w-8 shrink-0 rounded-sm bg-muted" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">
                        <Link href={`/admin/products/${v.productId}/edit`} className="hover:underline">
                          {v.product}
                        </Link>{" "}
                        <span className="text-muted-foreground">· {v.variant}</span>
                      </span>
                      {v.quantity === 0 ? (
                        <span className="shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive">
                          Sold out
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                          {v.quantity} left
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {contentCards.map((c) => (
              <Link key={c.label} href={c.href}>
                <Card className="transition-colors hover:border-gold">
                  <CardContent className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</span>
                    <span className="font-display text-3xl font-bold">{c.value}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
