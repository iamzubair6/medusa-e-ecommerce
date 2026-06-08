import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { getSiteSetting } from "@ecom/cms";
import { getCustomer } from "@/lib/customer-auth";
import { getPhoneSession } from "@/lib/phone-session";
import { parsePersona } from "@/lib/persona";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [customer, phone, personaRaw] = await Promise.all([
    getCustomer().catch(() => null),
    getPhoneSession().catch(() => null),
    getSiteSetting("persona").catch(() => null),
  ]);

  // Phone-OTP accounts have a placeholder @phone.maison.local email — don't prefill it.
  const realEmail = customer?.email && !customer.email.endsWith("@phone.maison.local") ? customer.email : "";
  const prefill = {
    email: realEmail,
    firstName: customer?.firstName ?? "",
    lastName: customer?.lastName ?? "",
    phone: customer?.phone || phone || "",
  };

  return (
    <main>
      <SiteNavbar />
      <Container className="py-10">
        <CheckoutClient prefill={prefill} persona={parsePersona(personaRaw)} />
      </Container>
      <Footer />
    </main>
  );
}
