import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { SiteSettingsEditor } from "@/components/admin/site-settings-editor";
import { parseSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function AdminSitePage() {
  const raw = await getSiteSetting("site").catch(() => null);
  return (
    <>
      <AdminHeader title="Storefront content" description="Announcement bar, marquee, brand names, delivery line, size guide — edit without code." />
      <div className="p-8">
        <SiteSettingsEditor initial={parseSiteSettings(raw)} />
      </div>
    </>
  );
}
