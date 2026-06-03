import Link from "next/link";
import { Card } from "@ecom/ui";
import { listCustomers } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const { customers, count } = await listCustomers(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <>
      <AdminHeader title="Customers" description="Everyone who has shopped or signed up." />
      <div className="p-8">
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50 text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                <th>Name</th>
                <th>Email</th>
                <th>Orders</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-medium">
                    <Link href={`/admin/customers/${c.id}`} className="hover:text-accent">{c.name}</Link>
                  </td>
                  <td className="text-muted-foreground">{c.email}</td>
                  <td>{c.orders}</td>
                  <td className="text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No customers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} basePath="/admin/customers" />
      </div>
    </>
  );
}
