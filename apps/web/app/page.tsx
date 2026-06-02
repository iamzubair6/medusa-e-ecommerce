import {
  getActivePopup,
  getNavMenu,
  getPublishedPage,
  megaMenuSchema,
  popupConfigSchema,
} from "@ecom/cms";
import { Container } from "@ecom/ui";
import { Navbar, type NavLink } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { SectionRenderer, type SectionData } from "@/components/site/section-renderer";
import { PromoPopup } from "@/components/site/promo-popup";

// Revalidate hourly; admin publish will trigger on-demand revalidation later.
export const revalidate = 3600;

interface HomeData {
  sections: SectionData[];
  navLinks: NavLink[];
  popup: { id: string; trigger: "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE"; config: ReturnType<typeof popupConfigSchema.parse> } | null;
}

async function loadHome(): Promise<HomeData | null> {
  try {
    const [page, menu, popupRow] = await Promise.all([
      getPublishedPage("home"),
      getNavMenu("main"),
      getActivePopup(new Date()),
    ]);

    const navLinks: NavLink[] =
      menu?.items.map((item) => {
        const mega = item.megaMenu ? megaMenuSchema.safeParse(item.megaMenu) : null;
        return { label: item.label, href: item.href, mega: mega?.success ? mega.data : undefined };
      }) ?? [];

    let popup: HomeData["popup"] = null;
    if (popupRow) {
      const parsed = popupConfigSchema.safeParse(popupRow.config);
      if (parsed.success) popup = { id: popupRow.id, trigger: popupRow.trigger, config: parsed.data };
    }

    return { sections: page?.sections ?? [], navLinks, popup };
  } catch (error) {
    // DB not reachable / not seeded yet — render a graceful shell.
    if (process.env.NODE_ENV !== "production") console.error("loadHome failed", error);
    return null;
  }
}

export default async function HomePage() {
  const data = await loadHome();

  if (!data) {
    return (
      <main>
        <Navbar links={[]} />
        <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
          <h1 className="font-display text-3xl font-bold">Content is being set up</h1>
          <p className="text-muted-foreground">
            Run the database setup and CMS seed to populate the storefront.
          </p>
        </Container>
        <Footer />
      </main>
    );
  }

  return (
    <main>
      <Navbar links={data.navLinks} />
      {data.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
      <Footer />
      {data.popup && (
        <PromoPopup id={data.popup.id} trigger={data.popup.trigger} config={data.popup.config} />
      )}
    </main>
  );
}
