import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
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

  const eyebrow = page.slug.split("/").map((segment) => segment.replace(/-/g, " ")).join(" · ");

  return (
    <main>
      <SiteNavbar />

      {/* Hero band — parchment card tone, oversized Fraunces title, brass hairline */}
      <section className="bg-card">
        <Container className="max-w-3xl pb-12 pt-16 md:pb-16 md:pt-24">
          <p className="flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <span aria-hidden className="h-px w-8 bg-brass/60" />
            {eyebrow}
          </p>
          <h1 className="mt-5 font-display text-4xl font-normal leading-[1.05] tracking-tight text-foreground [text-wrap:balance] md:text-6xl">
            {page.title}
          </h1>
        </Container>
        <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-brass/60 to-transparent" />
      </section>

      {/* Admin-authored body — styled through arbitrary variants on the wrapper */}
      <Container className="max-w-3xl py-14 md:py-20">
        <div
          className="flex flex-col gap-4 text-base leading-[1.75] text-foreground/75 [&_a:hover]:decoration-claret [&_a]:font-medium [&_a]:text-claret [&_a]:underline [&_a]:decoration-brass/50 [&_a]:underline-offset-4 [&_h2+p]:mt-1 [&_h2:first-child]:mt-0 [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-brass/30 [&_h2]:pb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-medium [&_h2]:tracking-tight [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_li]:marker:text-brass [&_p:first-of-type]:font-display [&_p:first-of-type]:text-xl [&_p:first-of-type]:font-normal [&_p:first-of-type]:leading-snug [&_p:first-of-type]:text-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      </Container>

      {/* Closing CTA — everywhere except the contact page itself */}
      {page.slug !== "contact" ? (
        <section className="border-t border-border bg-card">
          <Container className="max-w-3xl py-14 text-center md:py-16">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Need help?</p>
            <h2 className="mt-3 font-display text-2xl font-normal tracking-tight text-foreground [text-wrap:balance] md:text-3xl">
              A real person replies within 24 hours.
            </h2>
            <Link
              href="/contact"
              className="mt-8 inline-flex h-11 items-center justify-center bg-primary px-7 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-claret focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-claret"
            >
              Contact us
            </Link>
          </Container>
        </section>
      ) : null}

      <Footer />
    </main>
  );
}
