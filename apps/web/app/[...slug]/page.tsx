import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getSiteSetting } from "@ecom/cms";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { findContentPage, parseContentPages } from "@/lib/content-pages";

export const revalidate = 600;

// cache() keyed by the joined-slug string (arrays would defeat its reference
// equality), so generateMetadata + page share one Prisma read per request.
const pageFor = cache(async (path: string) => {
  const raw = await getSiteSetting("contentPages").catch(() => null);
  return findContentPage(parseContentPages(raw), path.split("/"));
});

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await pageFor(slug.join("/"));
  return page ? { title: page.title } : {};
}

/** Renders any admin-managed content page (help, company, legal…) by its slug path. */
export default async function ContentPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const page = await pageFor(slug.join("/"));
  if (!page) notFound();

  return (
    <main>
      <SiteNavbar />
      <Container className="max-w-3xl py-12">
        <h1 className="font-display text-3xl font-black uppercase tracking-tight">{page.title}</h1>
        <div
          className="mt-6 flex flex-col gap-3 text-sm leading-relaxed text-foreground/80 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:uppercase [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      </Container>
      <Footer />
    </main>
  );
}
