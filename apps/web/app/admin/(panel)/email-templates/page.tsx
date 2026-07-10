import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { EmailTemplatesEditor } from "@/components/admin/email-templates-editor";
import { parseEmailTemplates } from "@/lib/email-templates";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  const [raw, session] = await Promise.all([
    getSiteSetting("emailTemplates").catch(() => null),
    getAdminSession().catch(() => null),
  ]);
  return (
    <>
      <AdminHeader
        title="Email templates"
        description="Every transactional email the store sends — edit the copy, then send yourself a test before saving."
      />
      <div className="p-8">
        <EmailTemplatesEditor initial={parseEmailTemplates(raw)} adminEmail={session?.email ?? ""} />
      </div>
    </>
  );
}
