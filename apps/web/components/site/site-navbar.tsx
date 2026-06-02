import { getNavMenu, megaMenuSchema } from "@ecom/cms";
import { Navbar, type NavLink } from "./navbar";

/** Server component that loads the main menu from the CMS and renders the navbar. */
export async function SiteNavbar() {
  let links: NavLink[] = [];
  try {
    const menu = await getNavMenu("main");
    links =
      menu?.items.map((item) => {
        const mega = item.megaMenu ? megaMenuSchema.safeParse(item.megaMenu) : null;
        return { label: item.label, href: item.href, mega: mega?.success ? mega.data : undefined };
      }) ?? [];
  } catch {
    links = [];
  }
  return <Navbar links={links} />;
}
