import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { TrackClient } from "@/components/track/track-client";

export const metadata: Metadata = { title: "Track Order" };

export const dynamic = "force-dynamic";

export default function TrackPage() {
  return (
    <main>
      <SiteNavbar />
      <Container className="py-14 lg:py-20">
        <TrackClient />
      </Container>
      <Footer />
    </main>
  );
}
