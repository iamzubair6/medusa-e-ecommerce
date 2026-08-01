import type { Metadata } from "next";
import { ToastProvider } from "@/components/admin/toast";

export const metadata: Metadata = { title: "POS — Maison", robots: { index: false } };

/** Fullscreen counter chrome: no storefront navbar, no admin sidebar. */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
