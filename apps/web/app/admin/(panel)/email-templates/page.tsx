import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { EmailTemplatesEditor } from "@/components/admin/email-templates-editor";
import { CustomEmailTemplates } from "@/components/admin/custom-email-templates";
import { parseEmailTemplates, parseCustomEmailTemplates } from "@/lib/email-templates";
import { parseEmailFrame } from "@/lib/email-frame";
import { EmailFrameCard } from "@/components/admin/email-frame-card";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  const [raw, customRaw, frameRaw, session] = await Promise.all([
    getSiteSetting("emailTemplates").catch(() => null),
    getSiteSetting("customEmailTemplates").catch(() => null),
    getSiteSetting("emailFrame").catch(() => null),
    getAdminSession().catch(() => null),
  ]);
  const frame = parseEmailFrame(frameRaw);
  return (
    <>
      <AdminHeader
        title="Email templates"
        description="Every email the store sends — live preview, edit the copy, send yourself a test. Create your own templates for announcements & bulk email."
      />
      <div className="flex flex-col gap-6 p-8">
        <EmailFrameCard initial={frame} />
        <CustomEmailTemplates initial={parseCustomEmailTemplates(customRaw)} adminEmail={session?.email ?? ""} frame={frame} />
        <EmailTemplatesEditor initial={parseEmailTemplates(raw)} adminEmail={session?.email ?? ""} frame={frame} />
      </div>
    </>
  );
}
