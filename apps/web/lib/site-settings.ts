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
});

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export const DEFAULT_SITE_SETTINGS: SiteSettings = siteSettingsSchema.parse({});

export function parseSiteSettings(raw: unknown): SiteSettings {
  const r = siteSettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_SITE_SETTINGS;
}
