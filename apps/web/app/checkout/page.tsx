import type { Metadata } from "next";
import { Container } from "@ecom/ui";
import { getSiteSetting } from "@ecom/cms";
import { getCustomer } from "@/lib/customer-auth";
import { getPhoneSession } from "@/lib/phone-session";
import { parsePersona } from "@/lib/persona";
import { enabledPaymentMethods, parseCheckoutConfig } from "@/lib/checkout-config";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { CheckoutClient } from "@/components/checkout/checkout-client";

export const metadata: Metadata = { title: "Checkout" };
export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const [customer, phone, personaRaw, checkoutRaw] = await Promise.all([
    getCustomer().catch(() => null),
    getPhoneSession().catch(() => null),
    getSiteSetting("persona").catch(() => null),
    getSiteSetting("checkout").catch(() => null),
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
        {(payment === "failed" || payment === "cancelled") && (
          <div className="mb-6 border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {payment === "cancelled"
              ? "Payment was cancelled — your bag is untouched. Pick a payment method to try again."
              : "The payment didn't go through and nothing was charged. Please try again or choose Cash on Delivery."}
          </div>
        )}
        <CheckoutClient
          prefill={prefill}
          persona={parsePersona(personaRaw)}
          paymentMethods={enabledPaymentMethods(parseCheckoutConfig(checkoutRaw))}
        />
      </Container>
      <Footer />
    </main>
  );
}
