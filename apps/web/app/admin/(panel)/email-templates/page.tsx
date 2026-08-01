import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { EmailFramesCard } from "@/components/admin/email-frames-card";
import { EmailBodyTemplatesCard } from "@/components/admin/email-body-templates-card";
import { EmailPurposesEditor } from "@/components/admin/email-purposes-editor";
import { CampaignPresets } from "@/components/admin/campaign-presets";
import { parseCampaignPresets } from "@/lib/email-campaigns";
import { getEmailConfig } from "@/lib/email-settings";
import { getAdminSession } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminEmailTemplatesPage() {
  const [config, presetsRaw, session] = await Promise.all([
    getEmailConfig(),
    getSiteSetting("customEmailTemplates").catch(() => null),
    getAdminSession().catch(() => null),
  ]);
  const adminEmail = session?.email ?? "";
  return (
    <>
      <AdminHeader
        title="Email templates"
        description="Frames, body designs and the words for every email the store sends — live preview, edit, send yourself a test."
      />
      <div className="flex flex-col gap-6 p-8">
        <EmailFramesCard initial={config.frames} />
        <EmailBodyTemplatesCard initial={config.bodyTemplates} frames={config.frames} />
        <EmailPurposesEditor
          initial={config.purposes}
          adminEmail={adminEmail}
          frames={config.frames}
          bodyTemplates={config.bodyTemplates}
        />
        <CampaignPresets initial={parseCampaignPresets(presetsRaw)} adminEmail={adminEmail} frames={config.frames} />
      </div>
    </>
  );
}
