import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSiteSetting } from "@ecom/cms";
import { getLandingData, DIVISION_HANDLES } from "@/lib/commerce";
import { parseSiteSettings } from "@/lib/site-settings";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { Landing } from "@/components/site/landing";

export const revalidate = 600;

// Fashion-Nova-style division landing page. Route handle "curve" maps to "plus".
const ALIAS: Record<string, string> = { curve: "plus" };

function resolve(raw: string): string | null {
  const handle = ALIAS[raw] ?? raw;
  return DIVISION_HANDLES.some((h) => h === handle) ? handle : null;
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

  const [landing, site] = await Promise.all([
    getLandingData(),
    getSiteSetting("site").then(parseSiteSettings).catch(() => parseSiteSettings(null)),
  ]);

  return (
    <main>
      <SiteNavbar />
      <Landing data={landing} site={site} />
      <Footer />
    </main>
  );
}
