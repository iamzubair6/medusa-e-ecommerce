import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@ecom/ui";
import { getCustomer, getCustomerOrders } from "@/lib/customer-auth";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { AccountClient } from "@/components/site/account-client";

export const metadata: Metadata = { title: "My Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const orders = await getCustomerOrders();

  return (
    <main>
      <SiteNavbar />
      <Container className="py-12">
        <h1 className="mb-8 font-display text-3xl font-bold tracking-tight">
          Hello{customer.firstName ? `, ${customer.firstName}` : ""}
        </h1>
        <AccountClient customer={customer} orders={orders} />
      </Container>
      <Footer />
    </main>
  );
}
