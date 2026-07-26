import { getSiteSetting } from "@ecom/cms";
import { listCustomers } from "@/lib/medusa-admin";
import { getAdminSession } from "@/lib/admin-auth";
import { parseCustomEmailTemplates } from "@/lib/email-templates";
import { AdminHeader } from "@/components/admin/page-header";
import { CustomersTable } from "@/components/admin/customers-table";
import { CustomersEmailComposer } from "@/components/admin/customers-email-composer";
import { Pagination } from "@/components/admin/pagination";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 24;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const [{ customers, count }, session, customRaw] = await Promise.all([
    listCustomers(PAGE_SIZE, (page - 1) * PAGE_SIZE),
    getAdminSession(),
    getSiteSetting("customEmailTemplates").catch(() => null),
  ]);
  const emailTemplates = parseCustomEmailTemplates(customRaw).map((t) => ({
    id: t.id,
    name: t.name,
    subject: t.subject,
  }));

  return (
    <>
      <AdminHeader title="Customers" description="Everyone who has shopped or signed up." />
      <div className="p-8">
        <CustomersEmailComposer templates={emailTemplates} />
        <CustomersTable customers={customers} canDelete={session?.role === "ADMIN"} />
        <Pagination page={page} pageSize={PAGE_SIZE} total={count} basePath="/admin/customers" />
      </div>
    </>
  );
}
