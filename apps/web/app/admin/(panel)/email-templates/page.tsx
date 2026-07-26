import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { EmailTemplatesEditor } from "@/components/admin/email-templates-editor";
import { CustomEmailTemplates } from "@/components/admin/custom-email-templates";
import { parseEmailTemplates, parseCustomEmailTemplates } from "@/lib/email-templates";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  const [raw, customRaw, session] = await Promise.all([
    getSiteSetting("emailTemplates").catch(() => null),
    getSiteSetting("customEmailTemplates").catch(() => null),
    getAdminSession().catch(() => null),
  ]);
  return (
    <>
      <AdminHeader
        title="Email templates"
        description="Every email the store sends — live preview, edit the copy, send yourself a test. Create your own templates for announcements & bulk email."
      />
      <div className="flex flex-col gap-6 p-8">
        <CustomEmailTemplates initial={parseCustomEmailTemplates(customRaw)} adminEmail={session?.email ?? ""} />
        <EmailTemplatesEditor initial={parseEmailTemplates(raw)} adminEmail={session?.email ?? ""} />
      </div>
    </>
  );
}
