import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { PhoneCaptureEditor } from "@/components/admin/phone-capture-editor";
import { parsePhoneCaptureSettings } from "@/lib/phone-capture-settings";

export const dynamic = "force-dynamic";

export default async function AdminPhonePopupPage() {
  const raw = await getSiteSetting("phoneCapture").catch(() => null);
  return (
    <>
      <AdminHeader
        title="Phone popup"
        description="First-visit phone-capture popup — heading, copy, button labels, and whether it shows."
      />
      <div className="p-8">
        <PhoneCaptureEditor initial={parsePhoneCaptureSettings(raw)} />
      </div>
    </>
  );
}
