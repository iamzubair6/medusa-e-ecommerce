import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "@ecom/ui/styles.css";
import { Providers } from "./providers";

// Clean, bold neo-grotesque — Fashion-Nova-style commercial look (one family,
// heavy weights for promo headers).
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});
const display = Archivo({
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Maison — Modern Fashion", template: "%s · Maison" },
  description: "Considered design. Premium materials. Made to last.",
  openGraph: { type: "website", siteName: "Maison" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
