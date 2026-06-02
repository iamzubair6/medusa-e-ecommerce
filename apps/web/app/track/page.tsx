import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { TrackClient } from "@/components/track/track-client";

export const metadata: Metadata = { title: "Track Order" };

export default function TrackPage() {
  return (
    <main>
      <SiteNavbar />
      <Container className="py-12">
        <TrackClient />
      </Container>
      <Footer />
    </main>
  );
}
