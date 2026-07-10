import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { LoginForm } from "@/components/site/login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCustomer()) redirect("/account");
  return (
    <main>
      <SiteNavbar />
      <LoginForm />
      <Footer />
    </main>
  );
}
