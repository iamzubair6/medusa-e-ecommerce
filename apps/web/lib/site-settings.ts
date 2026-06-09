import { z } from "zod";

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
  deliveryLine: z.string().max(200).default("Standard delivery in 3–5 days · Free shipping over ৳2,000"),
  sizeGuide: z.string().max(6000).default(""), // optional HTML/text shown in the size-guide modal
  shippingReturns: z.string().max(6000).default(""), // optional HTML/text for the PDP "Shipping & Returns" accordion
  categoryTileCount: z.number().int().min(3).max(9).default(7),
  // Editable landing content (curated layout, dynamic copy/images/links).
  landing: z
    .object({
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
    })
    .default({}),
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const DEFAULT_SITE_SETTINGS: SiteSettings = siteSettingsSchema.parse({});

export function parseSiteSettings(raw: unknown): SiteSettings {
  const r = siteSettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_SITE_SETTINGS;
}
