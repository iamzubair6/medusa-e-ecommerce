import type { Metadata } from "next";
import { Fraunces, Hanken_Grotesk } from "next/font/google";
import "@ecom/ui/styles.css";
import { Providers } from "./providers";

// Editorial display serif (characterful, high-contrast) + refined grotesque body.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
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
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
