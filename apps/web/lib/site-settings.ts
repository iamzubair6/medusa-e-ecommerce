import { z } from "zod";

/** A 6-digit hex color (`#7a2230`) or empty string (= use the default claret). */
const accentHex = z
  .string()
  .regex(/^(#[0-9a-fA-F]{6})?$/, "Use a 6-digit hex color like #7a2230, or leave empty.")
  .default("");

/** Curated (Fashion-Nova) landing content — the global home version and the
 *  per-division overrides share this shape. */
export const landingSchema = z.object({
  hero: z
    .object({
      image: z.string().default("https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&h=1000&q=80"),
      eyebrow: z.string().max(60).default("New Season"),
      headline: z.string().max(80).default("BOGO Free"),
      subtext: z.string().max(160).default("Get ৳500 off ৳2,500+ — use code MAISON25"),
      ctaLabel: z.string().max(40).default("Shop Now"),
      ctaHref: z.string().max(200).default("/collections/sale"),
    })
    .default({}),
  promo: z
    .object({
      image: z.string().default("https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&h=900&q=80"),
      heading: z.string().max(80).default("Up to 80% Off Sitewide"),
      ctaLabel: z.string().max(40).default("Shop Now"),
      ctaHref: z.string().max(200).default("/collections/sale"),
    })
    .default({}),
  feature: z
    .object({
      image: z.string().default("https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1800&h=950&q=80"),
      heading: z.string().max(80).default("Golden Hours"),
      ctaLabel: z.string().max(40).default("Shop the Edit"),
      ctaHref: z.string().max(200).default("/collections/luxe"),
    })
    .default({}),
  sale: z
    .object({
      heading: z.string().max(80).default("60–80% Off Sale"),
      ctaLabel: z.string().max(40).default("Shop Now"),
      ctaHref: z.string().max(200).default("/collections/sale"),
    })
    .default({}),
  trendCards: z
    .array(z.object({ label: z.string().max(40), image: z.string(), href: z.string().max(200) }))
    .max(8)
    .default([
      { label: "Second Skin", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=600&h=800&q=80", href: "/collections/bodysuits?division=women" },
      { label: "Vacation Strolls", image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=600&h=800&q=80", href: "/collections/women?division=women&trend=Vacation" },
      { label: "Hotter on Vacation", image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=600&h=800&q=80", href: "/collections/trending" },
      { label: "Swim Escape", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&h=800&q=80", href: "/collections/swim?division=women" },
    ]),
  brandTiles: z
    .array(z.object({ label: z.string().max(40), image: z.string(), href: z.string().max(200) }))
    .max(12)
    .default([
      { label: "Maison Men", image: "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?auto=format&fit=crop&w=400&h=400&q=80", href: "/collections/men?division=men" },
      { label: "Maison", image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&h=400&q=80", href: "/collections/women?division=women" },
      { label: "Maison Curve", image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=400&h=400&q=80", href: "/collections/plus?division=plus" },
      { label: "Maison Kids", image: "https://images.unsplash.com/photo-1483118714900-540cf339fd46?auto=format&fit=crop&w=400&h=400&q=80", href: "/collections/kids?division=kids" },
      { label: "Maison Sport", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=400&h=400&q=80", href: "/collections/sport?division=sport" },
      { label: "Maison Luxe", image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&h=400&q=80", href: "/collections/luxe" },
    ]),
  // Brand collab / video carousel slides (full-bleed, auto-advancing).
  collabSlides: z
    .array(
      z.object({
        image: z.string(),
        title: z.string().max(80),
        href: z.string().max(200),
        eyebrow: z.string().max(60).optional(),
        cta: z.string().max(40).optional(),
      }),
    )
    .max(8)
    .default([
      { image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&h=1000&q=80", eyebrow: "Collab", title: "Maison × Active", href: "/collections/sport?division=sport" },
      { image: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1800&h=1000&q=80", eyebrow: "The Edit", title: "Vacation Mindset", href: "/collections/trending" },
      { image: "https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=1800&h=1000&q=80", eyebrow: "New", title: "Golden Hours", href: "/collections/luxe" },
    ]),
});

export type Landing = z.infer<typeof landingSchema>;

/**
 * Editable storefront content (admin → /admin/site, stored in CMS SiteSetting
 * "site"). Replaces hardcoded announcement / marquee / brand names / delivery line
 * / size guide so they're managed without code.
 */
export const siteSettingsSchema = z.object({
  announcement: z
    .object({
      active: z.boolean().default(true),
      message: z.string().max(160).default("FREE SHIPPING ON ORDERS OVER ৳2,000"),
      href: z.string().max(200).default("/products"),
    })
    .default({}),
  marquee: z
    .object({
      enabled: z.boolean().default(true),
      items: z.array(z.string().min(1).max(60)).max(12).default(["Free Shipping Over ৳2,000", "Cash on Delivery", "Easy 30-Day Returns", "New Drops Weekly", "Shop the App"]),
    })
    .default({}),
  brands: z
    .object({
      women: z.string().max(40).default("MAISON"),
      plus: z.string().max(40).default("MAISON CURVE"),
      men: z.string().max(40).default("MAISON MEN"),
      sport: z.string().max(40).default("MAISON SPORT"),
      kids: z.string().max(40).default("MAISON KIDS"),
      beauty: z.string().max(40).default("MAISON BEAUTY"),
    })
    .default({}),
  // Optional accent color per division (6-digit hex, or empty for the brand
  // claret). Rejecting bad values gives the admin feedback instead of a silent
  // no-op. Lets a division feel distinct without abandoning the default.
  accentByDivision: z
    .object({
      women: accentHex,
      plus: accentHex,
      men: accentHex,
      sport: accentHex,
      kids: accentHex,
      beauty: accentHex,
    })
    .default({}),
  deliveryLine: z.string().max(200).default("Standard delivery in 3–5 days · Free shipping over ৳2,000"),
  sizeGuide: z.string().max(6000).default(""), // optional HTML/text shown in the size-guide modal
  shippingReturns: z.string().max(6000).default(""), // optional HTML/text for the PDP "Shipping & Returns" accordion
  categoryTileCount: z.number().int().min(3).max(9).default(7),
  // Editable landing content (curated layout, dynamic copy/images/links).
  landing: landingSchema.default({}),
  // Optional per-division curated landing. A division key here overrides the
  // global `landing` on that page (e.g. /pages/men shows men's hero/promo/
  // feature), mirroring the per-page CMS-sections model. Absent = inherit home.
  landingByDivision: z.record(z.string(), landingSchema).default({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const DEFAULT_SITE_SETTINGS: SiteSettings = siteSettingsSchema.parse({});

export function parseSiteSettings(raw: unknown): SiteSettings {
  const r = siteSettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_SITE_SETTINGS;
}

/** The curated landing content for a page — the division's override if set,
 *  else the global (home) content. */
export function landingContentFor(site: SiteSettings, division: string): Landing {
  return site.landingByDivision[division] ?? site.landing;
}

/** Inline `--accent`/`--ring` override for a division's `<main>`, or undefined
 *  when that division uses the default claret. */
export function accentStyleFor(
  site: SiteSettings,
  division: string,
): Record<string, string> | undefined {
  const hex = site.accentByDivision[division as keyof SiteSettings["accentByDivision"]];
  const triplet = hex ? hexToHslTriplet(hex) : null;
  return triplet ? { "--accent": triplet, "--ring": triplet } : undefined;
}

/**
 * "#7a2230" → "356 46% 32%" — an HSL triplet for the `--accent` CSS var, which
 * every `hsl(var(--accent))` consumer reads. Returns null for empty/invalid
 * input so callers fall back to the default claret token.
 */
export function hexToHslTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1]!, 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
