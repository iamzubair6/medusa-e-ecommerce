import Link from "next/link";
import { prisma } from "@ecom/cms";
import { Card, CardContent } from "@ecom/ui";
import { Banknote, Receipt, ShoppingBag, UserRound, Truck } from "lucide-react";
import { getDashboardStats } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";

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

export default async function AdminDashboard() {
  const [commerce, content] = await Promise.all([getDashboardStats(), getContentStats()]);

  const commerceCards = [
    { label: "Revenue", value: commerce.revenue, href: "/admin/orders", icon: Banknote },
    { label: "Orders", value: commerce.orders, href: "/admin/orders", icon: Receipt },
    { label: "To fulfil", value: commerce.pendingFulfilment, href: "/admin/orders", icon: Truck },
    { label: "Products", value: commerce.products, href: "/admin/products", icon: ShoppingBag },
    { label: "Customers", value: commerce.customers, href: "/admin/customers", icon: UserRound },
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
