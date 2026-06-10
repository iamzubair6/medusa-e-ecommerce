import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { NavigationBuilder } from "@/components/admin/navigation-builder";
import { parseNavigation } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function NavigationPage() {
  const raw = await getSiteSetting("navigation").catch(() => null);
  return (
    <>
      <AdminHeader
        title="Navigation"
        description="Divisions → collections → mega-menu popover columns. Empty divisions fall back to the auto menu."
      />
      <div className="p-8">
        <NavigationBuilder initial={parseNavigation(raw)} />
      </div>
    </>
  );
}
