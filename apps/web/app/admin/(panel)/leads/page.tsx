import Link from "next/link";
import { listGuestLeads } from "@ecom/cms";
import { Card } from "@ecom/ui";
import { AdminHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const { items, total, take } = await listGuestLeads({
    skip: (current - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const pages = Math.max(1, Math.ceil(total / take));

  return (
    <>
      <AdminHeader
        title="Guest Leads"
        description="Visitors who shared info but didn't complete checkout — for remarketing."
      />
      <div className="p-8">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Cart</th>
                <th>Captured</th>
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr key={lead.id} className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-medium">{lead.email ?? "—"}</td>
                  <td>{lead.phone ?? "—"}</td>
                  <td>{lead.source ?? "—"}</td>
                  <td className="text-muted-foreground">{lead.cartId ? "yes" : "—"}</td>
                  <td className="text-muted-foreground">{lead.createdAt.toLocaleDateString()}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                    No leads captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {current} of {pages} · {total} total
            </span>
            <div className="flex gap-2">
              {current > 1 && (
                <Link href={`/admin/leads?page=${current - 1}`} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Previous
                </Link>
              )}
              {current < pages && (
                <Link href={`/admin/leads?page=${current + 1}`} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
