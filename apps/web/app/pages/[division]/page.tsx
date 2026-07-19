import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedPage, getSiteSetting } from "@ecom/cms";
import { getLandingData, DIVISION_HANDLES } from "@/lib/commerce";
import { parseSiteSettings, accentStyleFor, landingContentFor } from "@/lib/site-settings";
import { parseLandingMode, landingModeFor } from "@/lib/landing-mode";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { Landing } from "@/components/site/landing";
import { SectionRenderer } from "@/components/site/section-renderer";

export const revalidate = 600;

// Fashion-Nova-style division landing page. Route handle "curve" maps to "plus".
const ALIAS: Record<string, string> = { curve: "plus" };

/**
 * A published PageLayout whose slug matches the division handle (e.g. "women")
 * overrides the curated <Landing> — same CMS-section model as the home page
 * (#40). Falls back to the curated landing when no such page is published.
 */
async function loadCmsDivision(handle: string) {
  try {
    const page = await getPublishedPage(handle);
    return page && page.sections.length > 0 ? page : null;
  } catch {
    return null;
  }
}

type DivisionHandle = (typeof DIVISION_HANDLES)[number];

function resolve(raw: string): DivisionHandle | null {
  const handle = ALIAS[raw] ?? raw;
  return DIVISION_HANDLES.find((h) => h === handle) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ division: string }> }): Promise<Metadata> {
  const { division } = await params;
  const handle = resolve(division);
  if (!handle) return { title: "Not found" };
  return { title: handle.charAt(0).toUpperCase() + handle.slice(1) };
}

export default async function DivisionPage({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  const handle = resolve(division);
  if (!handle) notFound();

  const [landing, site, landingMode, cmsPage] = await Promise.all([
    getLandingData(handle),
    getSiteSetting("site").then(parseSiteSettings).catch(() => parseSiteSettings(null)),
    getSiteSetting("landingMode").then(parseLandingMode).catch(() => parseLandingMode(null)),
    loadCmsDivision(handle),
  ]);

  // Per-page render mode (admin → /admin/landing-style). "curated" always renders
  // the Fashion-Nova <Landing>; "sections" (the default) renders the published
  // division PageLayout when present, else falls back to <Landing> (#40).
  const sectionPage = landingModeFor(landingMode, handle) === "sections" ? cmsPage : null;

  return (
    <main style={accentStyleFor(site, handle)}>
      <SiteNavbar />
      {sectionPage ? (
        sectionPage.sections.map((section) => <SectionRenderer key={section.id} section={section} />)
      ) : (
        <Landing data={landing} site={site} content={landingContentFor(site, handle)} />
      )}
      <Footer />
    </main>
  );
}
