import Link from "next/link";
import { prisma } from "@ecom/cms";
import { Card, CardContent } from "@ecom/ui";
import { AdminHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

async function getStats() {
  const [pages, popups, leads, campaigns] = await Promise.all([
    prisma.pageLayout.count(),
    prisma.popup.count(),
    prisma.guestLead.count(),
    prisma.campaign.count(),
  ]);
  return { pages, popups, leads, campaigns };
}

export default async function AdminDashboard() {
  const stats = await getStats();
  const cards = [
    { label: "Pages", value: stats.pages, href: "/admin/pages" },
    { label: "Campaigns", value: stats.campaigns, href: "/admin/campaigns" },
    { label: "Popups", value: stats.popups, href: "/admin/popups" },
    { label: "Guest leads", value: stats.leads, href: "/admin/leads" },
  ];
  return (
    <>
      <AdminHeader title="Dashboard" description="Control your storefront content." />
      <div className="grid grid-cols-1 gap-4 p-8 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="transition-colors hover:border-gold">
              <CardContent className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </span>
                <span className="font-display text-3xl font-bold">{c.value}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
