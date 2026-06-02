import { getNavMenu } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { NavEditor, type AdminNavItem } from "@/components/admin/editors/nav-editor";

export const dynamic = "force-dynamic";

export default async function NavigationPage() {
  const menu = await getNavMenu("main");
  const items: AdminNavItem[] =
    menu?.items.map((it) => ({
      label: it.label,
      href: it.href,
      megaMenu: it.megaMenu ?? undefined,
    })) ?? [];

  return (
    <>
      <AdminHeader title="Navigation" description="Edit the main menu and mega-menus." />
      <div className="p-8">
        {menu ? (
          <NavEditor menuKey="main" items={items} />
        ) : (
          <p className="text-sm text-muted-foreground">No main menu found. Run the CMS seed.</p>
        )}
      </div>
    </>
  );
}
