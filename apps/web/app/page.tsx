import { getActivePopup, popupConfigSchema } from "@ecom/cms";
import { getLandingData } from "@/lib/commerce";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { Landing } from "@/components/site/landing";
import { PromoPopup } from "@/components/site/promo-popup";

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
  const [landing, popup] = await Promise.all([getLandingData(), loadPopup()]);
  return (
    <main>
      <SiteNavbar />
      <Landing data={landing} />
      <Footer />
      {popup && <PromoPopup id={popup.id} trigger={popup.trigger} config={popup.config} />}
    </main>
  );
}
