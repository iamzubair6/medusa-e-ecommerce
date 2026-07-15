import { z } from "zod";

/**
 * Admin-managed navigation / IA (Fashion-Nova style), stored in CMS SiteSetting
 * "navigation":  Division (page) → Collection (mega-menu item) → Popover Column
 * (heading) → Link. The storefront navbar renders from this; when a division has
 * no admin-defined collections it falls back to the Medusa-derived menu.
 */
export const navLinkSchema = z.object({
  label: z.string().min(1).max(60),
  href: z.string().min(1).max(200),
  highlight: z.boolean().default(false), // e.g. "Sale Dresses" in accent red
  swatch: z.string().max(30).default(""), // color dot for Shop-by-Color links
});

export const navColumnSchema = z.object({
  heading: z.string().max(60).default(""),
  links: z.array(navLinkSchema).max(24).default([]),
});

export const navCollectionSchema = z.object({
  label: z.string().min(1).max(40),
  href: z.string().min(1).max(200),
  highlight: z.boolean().default(false), // e.g. "Sale" in red
  image: z.string().max(300).default(""), // promo tile shown in the mega panel
  columns: z.array(navColumnSchema).max(6).default([]),
});

export const navDivisionSchema = z.object({
  handle: z.string().min(1).max(40),
  label: z.string().min(1).max(40),
  badge: z.string().max(12).default(""),
  collections: z.array(navCollectionSchema).max(24).default([]),
});

export const navigationSchema = z.object({
  divisions: z
    .array(navDivisionSchema)
    .max(12)
    .default([
      { handle: "women", label: "WOMEN", badge: "", collections: [] },
      { handle: "plus", label: "PLUS+CURVE", badge: "", collections: [] },
      { handle: "men", label: "MEN", badge: "", collections: [] },
      { handle: "sport", label: "SPORT", badge: "NEW", collections: [] },
      { handle: "kids", label: "KIDS", badge: "", collections: [] },
      { handle: "beauty", label: "BEAUTY", badge: "", collections: [] },
    ]),
});

export type Navigation = z.infer<typeof navigationSchema>;
export type NavDivision = z.infer<typeof navDivisionSchema>;
export type NavCollection = z.infer<typeof navCollectionSchema>;
export type NavColumn = z.infer<typeof navColumnSchema>;
export type NavLink = z.infer<typeof navLinkSchema>;

export const DEFAULT_NAVIGATION: Navigation = navigationSchema.parse({});

export function parseNavigation(raw: unknown): Navigation {
  const r = navigationSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_NAVIGATION;
}
