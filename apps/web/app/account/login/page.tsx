import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/customer-auth";
import { LoginForm } from "@/components/site/login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

/** Standalone auth layout — no site navbar/footer, just the mark and a way back. */
export default async function LoginPage() {
  if (await getCustomer()) redirect("/account");
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-xl font-black uppercase tracking-tight">
          Maison
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to store
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <LoginForm />
      </div>
    </main>
  );
}
