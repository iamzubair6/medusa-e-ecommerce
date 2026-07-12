import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { SmsTemplatesEditor } from "@/components/admin/sms-templates-editor";
import { parseSmsTemplates } from "@/lib/sms-templates";

export const dynamic = "force-dynamic";

export default async function AdminSmsTemplatesPage() {
  const raw = await getSiteSetting("smsTemplates").catch(() => null);
  return (
    <>
      <AdminHeader
        title="SMS templates"
        description="Every SMS the store sends — OTP codes and order confirmations. Operators require your brand name in each message; the defaults follow MiMSMS's approved format."
      />
      <div className="p-8">
        <SmsTemplatesEditor initial={parseSmsTemplates(raw)} />
      </div>
    </>
  );
}
