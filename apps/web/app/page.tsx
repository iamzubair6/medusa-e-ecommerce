import { getActivePopup, getPublishedPage, popupConfigSchema } from "@ecom/cms";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { SectionRenderer, type SectionData } from "@/components/site/section-renderer";
import { PromoPopup } from "@/components/site/promo-popup";

// Revalidate hourly; admin publish will trigger on-demand revalidation later.
export const revalidate = 3600;

interface HomeData {
  sections: SectionData[];
  popup: { id: string; trigger: "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE"; config: ReturnType<typeof popupConfigSchema.parse> } | null;
}

async function loadHome(): Promise<HomeData | null> {
  try {
    const [page, popupRow] = await Promise.all([getPublishedPage("home"), getActivePopup(new Date())]);

    let popup: HomeData["popup"] = null;
    if (popupRow) {
      const parsed = popupConfigSchema.safeParse(popupRow.config);
      if (parsed.success) popup = { id: popupRow.id, trigger: popupRow.trigger, config: parsed.data };
    }

    return { sections: page?.sections ?? [], popup };
  } catch (error) {
    if (process.env.NODE_ENV !== "production") console.error("loadHome failed", error);
    return null;
  }
}

export default async function HomePage() {
  const data = await loadHome();

  return (
    <main>
      <SiteNavbar />
      {data?.sections.length ? (
        data.sections.map((section) => <SectionRenderer key={section.id} section={section} />)
      ) : (
        <Container className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
          <h1 className="font-display text-3xl font-bold">Welcome</h1>
          <p className="text-muted-foreground">The homepage layout is being set up.</p>
        </Container>
      )}
      <Footer />
      {data?.popup && <PromoPopup id={data.popup.id} trigger={data.popup.trigger} config={data.popup.config} />}
    </main>
  );
}
