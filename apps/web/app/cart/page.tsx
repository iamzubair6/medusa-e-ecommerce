import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { CartPageClient } from "@/components/cart/cart-page-client";

export const metadata: Metadata = { title: "Your Bag" };

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
