import type { Metadata } from "next";
import Link from "next/link";
import { Button, Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";

export const metadata: Metadata = { title: "Page Not Found" };

export default function NotFound() {
  return (
    <main>
      <SiteNavbar />
      <Container className="py-24 md:py-36">
        <div className="max-w-3xl">
          <h1 className="text-balance font-display text-[clamp(2.25rem,6vw,5.5rem)] font-normal leading-[1.02] tracking-[-0.01em]">
            404 — This look has <em className="text-accent">moved on</em>.
          </h1>
          <div className="rule-brass my-8" aria-hidden />
          <p className="max-w-md text-foreground/70">
            The page you&rsquo;re after has sold out, been retired, or never walked. The
            collection, however, is very much in season.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/">Back to shopping</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/collections/new">New arrivals</Link>
            </Button>
          </div>
        </div>
      </Container>
      <Footer />
    </main>
  );
}
