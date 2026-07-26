import Link from "next/link";
import { Download } from "lucide-react";
import { listGuestLeads, listGuestLeadSources } from "@ecom/cms";
import { Card, cn } from "@ecom/ui";
import { AdminHeader } from "@/components/admin/page-header";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; has?: string; source?: string }>;
}) {
  const { page, has: hasRaw, source } = await searchParams;
  const current = Math.max(1, Number(page) || 1);
  const has = hasRaw === "email" || hasRaw === "phone" ? hasRaw : undefined;
  const [{ items, total, take }, sources] = await Promise.all([
    listGuestLeads({ skip: (current - 1) * PAGE_SIZE, take: PAGE_SIZE, has, source }),
    listGuestLeadSources().catch(() => []),
  ]);
  const pages = Math.max(1, Math.ceil(total / take));

  // Filter-preserving query string (page resets when a filter changes).
  const qs = (patch: { has?: string; source?: string; page?: number }) => {
    const params = new URLSearchParams();
    const nextHas = "has" in patch ? patch.has : has;
    const nextSource = "source" in patch ? patch.source : source;
    if (nextHas) params.set("has", nextHas);
    if (nextSource) params.set("source", nextSource);
    if (patch.page && patch.page > 1) params.set("page", String(patch.page));
    const s = params.toString();
    return s ? `?${s}` : "";
  };
  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-xs transition-colors",
      active ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
    );

  return (
    <>
      <AdminHeader
        title="Guest Leads"
        description="Visitors who shared info but didn't complete checkout — for remarketing."
        action={
          <a
            href={`/api/admin/leads/export${qs({})}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
        }
      />
      <div className="p-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link href={`/admin/leads${qs({ has: undefined })}`} className={chip(!has)}>
            All
          </Link>
          <Link href={`/admin/leads${qs({ has: "email" })}`} className={chip(has === "email")}>
            Has email
          </Link>
          <Link href={`/admin/leads${qs({ has: "phone" })}`} className={chip(has === "phone")}>
            Has phone
          </Link>
          {sources.length > 0 && <span className="mx-1 text-xs text-muted-foreground">·</span>}
          {sources.map((s) => (
            <Link
              key={s}
              href={`/admin/leads${qs({ source: source === s ? undefined : s })}`}
              className={chip(source === s)}
            >
              {s}
            </Link>
          ))}
        </div>
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
                <Link href={`/admin/leads${qs({ page: current - 1 })}`} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
                  Previous
                </Link>
              )}
              {current < pages && (
                <Link href={`/admin/leads${qs({ page: current + 1 })}`} className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
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
