import { getActivePopup, getPublishedPage, getSiteSetting, popupConfigSchema } from "@ecom/cms";
import { getLandingData } from "@/lib/commerce";
import { parseSiteSettings } from "@/lib/site-settings";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { Landing } from "@/components/site/landing";
import { SectionRenderer } from "@/components/site/section-renderer";
import { PromoPopup } from "@/components/site/promo-popup";
import { PhoneCapturePopup } from "@/components/site/phone-capture-popup";

type CmsHome = Awaited<ReturnType<typeof getPublishedPage>>;

/**
 * A published `home` PageLayout overrides the curated <Landing> only when it
 * actually has sections — never prefer a stale/empty CMS home (#19 behavior).
 */
async function loadCmsHome(): Promise<CmsHome> {
  try {
    const page = await getPublishedPage("home");
    return page && page.sections.length > 0 ? page : null;
  } catch {
    return null;
  }
}

export const revalidate = 600;

type Popup = { id: string; trigger: "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE"; config: ReturnType<typeof popupConfigSchema.parse> } | null;

async function loadPopup(): Promise<Popup> {
  try {
    const popupRow = await getActivePopup(new Date());
    if (!popupRow) return null;
    const parsed = popupConfigSchema.safeParse(popupRow.config);
    return parsed.success ? { id: popupRow.id, trigger: popupRow.trigger, config: parsed.data } : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [landing, popup, site, cmsHome] = await Promise.all([
    getLandingData(),
    loadPopup(),
    getSiteSetting("site").then(parseSiteSettings).catch(() => parseSiteSettings(null)),
    loadCmsHome(),
  ]);
  // Section-driven home is optional: render a published `home` PageLayout when
  // present, otherwise fall back to the curated <Landing> (#19/#20).
  return (
    <main>
      <SiteNavbar />
      {cmsHome ? (
        cmsHome.sections.map((section) => <SectionRenderer key={section.id} section={section} />)
      ) : (
        <Landing data={landing} site={site} />
      )}
      <Footer />
      <PhoneCapturePopup />
      {popup && <PromoPopup id={popup.id} trigger={popup.trigger} config={popup.config} />}
    </main>
  );
}
