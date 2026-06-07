import Link from "next/link";
import { Apple, Play } from "lucide-react";
import { Container } from "@ecom/ui";
import { NewsletterSignup } from "./newsletter-signup";

const groups = [
  {
    heading: "Help",
    links: [
      ["Help Center", "/help"],
      ["Track Order", "/track"],
      ["Size Guide", "/help/size-guide"],
      ["Shipping", "/help/shipping"],
      ["Returns", "/help/returns"],
    ],
  },
  {
    heading: "Company",
    links: [
      ["About", "/about"],
      ["Careers", "/careers"],
      ["Contact", "/contact"],
      ["Sustainability", "/sustainability"],
    ],
  },
  {
    heading: "Quick Links",
    links: [
      ["New In", "/collections/new"],
      ["Sale", "/collections/sale"],
      ["Trending", "/collections/trending"],
      ["Gift Cards", "/gift-cards"],
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-ink text-primary-foreground">
      <Container className="grid grid-cols-2 gap-8 py-12 md:grid-cols-5">
        {/* App + brand */}
        <div className="col-span-2">
          <span className="font-display text-2xl font-black uppercase tracking-tight">MAISON</span>
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-white/50">Shop Faster with the App</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs text-white/80">
              <Apple className="h-5 w-5" /> App Store
            </span>
            <span className="flex items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-xs text-white/80">
              <Play className="h-5 w-5" /> Google Play
            </span>
          </div>
        </div>

        {groups.map((group) => (
          <div key={group.heading}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">{group.heading}</p>
            <ul className="flex flex-col gap-2">
              {group.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-sm text-white/70 transition-colors hover:text-gold-soft">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      {/* newsletter */}
      <Container className="border-t border-white/10 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-display text-lg font-bold uppercase">Sign up for discounts + updates</p>
            <p className="text-sm text-white/50">Be first to know about new drops and offers.</p>
          </div>
          <NewsletterSignup />
        </div>
      </Container>

      <Container className="border-t border-white/10 py-6 text-xs text-white/40">
        © 2026 Maison. All rights reserved.
      </Container>
    </footer>
  );
}
