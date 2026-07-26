import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@ecom/ui";
import { getCustomer, getCustomerOrders, listAddresses } from "@/lib/customer-auth";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { AccountClient } from "@/components/site/account-client";
import { AccountOffers } from "@/components/site/account-offers";
import { AddressBook } from "@/components/site/address-book";

export const metadata: Metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const [orders, addresses] = await Promise.all([getCustomerOrders(), listAddresses()]);

  return (
    <main>
      <SiteNavbar />
      <Container className="py-12 lg:py-16">
        <AccountClient customer={customer} orders={orders} />
        <AccountOffers phone={customer.phone ?? null} />
        <div className="mt-12">
          <AddressBook addresses={addresses} />
        </div>
      </Container>
      <Footer />
    </main>
  );
}
