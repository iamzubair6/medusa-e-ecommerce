import { Suspense } from "react";
import { getNavData } from "@/lib/nav-data";
import { Navbar } from "./navbar";

/** Server component that loads division-aware nav data and renders the navbar. */
export async function SiteNavbar() {
  const navData = await getNavData();
  // Navbar reads useSearchParams (active division) — statically prerendered
  // pages need a Suspense boundary around it.
  return (
    <Suspense fallback={null}>
      <Navbar navData={navData} />
    </Suspense>
  );
}
