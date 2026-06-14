import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = { title: "Your Bag" };

// Per-user bag — render on demand (also avoids a build-time nav/Medusa fetch
// hanging static prerender on cold Medusa; see #17).
export const dynamic = "force-dynamic";

export default function CartPage() {
  return (
    <main>
      <SiteNavbar />
      <Container className="py-10">
        <CartPageClient />
      </Container>
      <Footer />
    </main>
  );
}
