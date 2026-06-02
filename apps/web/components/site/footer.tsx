import Link from "next/link";
import { Container } from "@ecom/ui";

const groups = [
  { heading: "Shop", links: [["New In", "/collections/new"], ["Best Sellers", "/collections/best"], ["Sale", "/collections/sale"]] },
  { heading: "Help", links: [["Track Order", "/track"], ["Shipping", "/help/shipping"], ["Returns", "/help/returns"]] },
  { heading: "Company", links: [["About", "/about"], ["Careers", "/careers"], ["Contact", "/contact"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-ink text-primary-foreground">
      <Container className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        <div className="col-span-2 md:col-span-1">
          <span className="font-display text-2xl font-medium">Maison</span>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            Considered design. Premium materials. Made to last.
          </p>
        </div>
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/50">
              {group.heading}
            </p>
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
      <Container className="border-t border-white/10 py-6 text-xs text-white/40">
        © {2026} Maison. All rights reserved.
      </Container>
    </footer>
  );
}
