import { getSiteSetting } from "@ecom/cms";
import { AdminHeader } from "@/components/admin/page-header";
import { LandingModeEditor } from "@/components/admin/landing-mode-editor";
import { parseLandingMode, LANDING_PAGE_KEYS, type LandingPageKey } from "@/lib/landing-mode";
import { DIVISION_NAMES } from "@/lib/build-listing";

export const dynamic = "force-dynamic";

const LABELS: Record<LandingPageKey, string> = {
  home: "Home",
  ...(DIVISION_NAMES as Record<string, string>),
} as Record<LandingPageKey, string>;

const PAGES = LANDING_PAGE_KEYS.map((key) => ({ key, label: LABELS[key] ?? key }));

export default async function AdminLandingStylePage() {
  const raw = await getSiteSetting("landingMode").catch(() => null);
  return (
    <>
      <AdminHeader
        title="Landing style"
        description="Choose per page whether the home page and each division render the curated Fashion-Nova landing or the CMS section layout."
      />
      <div className="p-8">
        <LandingModeEditor initial={parseLandingMode(raw)} pages={PAGES} />
      </div>
    </>
  );
}
