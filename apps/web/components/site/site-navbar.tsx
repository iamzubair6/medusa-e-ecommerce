import { getNavData } from "@/lib/nav-data";
import { Navbar } from "./navbar";

/** Server component that loads division-aware nav data and renders the navbar. */
export async function SiteNavbar() {
  const navData = await getNavData();
  return <Navbar navData={navData} />;
}
