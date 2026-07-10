import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { SiteNavbar } from "@/components/site/site-navbar";
import { Footer } from "@/components/site/footer";
import { RegisterForm } from "@/components/site/register-form";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getCustomer()) redirect("/account");
  return (
    <main>
      <SiteNavbar />
      <div className="grid min-h-[70vh] lg:grid-cols-2">
        {/* editorial panel */}
        <aside className="hidden flex-col justify-between bg-ink p-12 text-primary-foreground lg:flex">
          <span className="font-display text-xl font-black uppercase tracking-tight">Maison</span>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight">
              First pick of
              <br />
              every drop<span className="text-gold-soft">.</span>
            </h2>
            <ul className="mt-8 flex flex-col gap-3 text-sm text-white/70">
              <li>— New styles weekly, members see them first</li>
              <li>— Faster checkout with saved details</li>
              <li>— Order tracking &amp; easy returns</li>
              <li>— Member-only offers by email</li>
            </ul>
          </div>
          <p className="text-xs text-white/40">Editorial luxury, for every day.</p>
        </aside>

        {/* form panel */}
        <div className="flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-sm">
            <h1 className="mb-8 text-center font-display text-3xl font-bold tracking-tight">Create account</h1>
            <RegisterForm />
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
