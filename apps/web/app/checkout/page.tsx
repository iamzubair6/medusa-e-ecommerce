import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return (
    <main>
      <SiteNavbar />
      <Container className="py-10">
        <CheckoutClient />
      </Container>
      <Footer />
    </main>
  );
}
