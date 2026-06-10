import { z } from "zod";
import { ctaSchema, mediaRefSchema, productSourceSchema } from "./primitives";

/**
 * HERO — conditionally renders a video OR a carousel based on `mode`.
 * This powers the "dynamic animated hero" requirement.
 */
export const heroConfigSchema = z
  .object({
    mode: z.enum(["video", "carousel"]),
    eyebrow: z.string().max(60).optional(),
    headline: z.string().min(1).max(120),
    subheadline: z.string().max(200).optional(),
    cta: ctaSchema.optional(),
    secondaryCta: ctaSchema.optional(),
    theme: z.enum(["light", "dark"]).default("dark"),
    align: z.enum(["left", "center", "right"]).default("left"),
    // video mode
    video: mediaRefSchema.extend({ poster: z.string().url().optional() }).optional(),
    // carousel mode
    slides: z
      .array(
        z.object({
          media: mediaRefSchema,
          headline: z.string().max(120).optional(),
          cta: ctaSchema.optional(),
        }),
      )
      .max(8)
      .optional(),
    autoplayMs: z.number().int().min(2000).max(12000).default(6000),
  })
  .refine((v) => (v.mode === "video" ? !!v.video : true), {
    message: "video is required when mode is 'video'",
    path: ["video"],
  })
  .refine((v) => (v.mode === "carousel" ? !!v.slides?.length : true), {
    message: "at least one slide is required when mode is 'carousel'",
    path: ["slides"],
  });
export type HeroConfig = z.infer<typeof heroConfigSchema>;

/** PRODUCT_ROW — a horizontal/grid row of products from a source. */
export const productRowConfigSchema = z.object({
  heading: z.string().min(1).max(80),
  subheading: z.string().max(160).optional(),
  source: productSourceSchema,
  limit: z.number().int().min(2).max(24).default(8),
  layout: z.enum(["carousel", "grid"]).default("carousel"),
  cta: ctaSchema.optional(),
});
export type ProductRowConfig = z.infer<typeof productRowConfigSchema>;

/** CATEGORY_GRID — promotional tiles linking to collections. */
export const categoryGridConfigSchema = z.object({
  heading: z.string().max(80).optional(),
  tiles: z
    .array(
      z.object({
        media: mediaRefSchema,
        label: z.string().min(1).max(40),
        href: z.string().min(1),
      }),
    )
    .min(1)
    .max(8),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
});
export type CategoryGridConfig = z.infer<typeof categoryGridConfigSchema>;

/** EDITORIAL — image + copy storytelling block. */
export const editorialConfigSchema = z.object({
  media: mediaRefSchema,
  eyebrow: z.string().max(60).optional(),
  heading: z.string().min(1).max(120),
  body: z.string().max(600).optional(),
  cta: ctaSchema.optional(),
  imageSide: z.enum(["left", "right"]).default("left"),
});
export type EditorialConfig = z.infer<typeof editorialConfigSchema>;

/** BANNER — full-width promo strip. */
export const bannerConfigSchema = z.object({
  media: mediaRefSchema.optional(),
  heading: z.string().min(1).max(120),
  cta: ctaSchema.optional(),
  theme: z.enum(["light", "dark", "gold"]).default("dark"),
});
export type BannerConfig = z.infer<typeof bannerConfigSchema>;

/** BRAND_CAROUSEL — full-bleed auto-advancing collab/brand slides. */
export const brandCarouselConfigSchema = z.object({
  slides: z
    .array(
      z.object({
        media: mediaRefSchema,
        eyebrow: z.string().max(60).optional(),
        title: z.string().min(1).max(80),
        href: z.string().min(1).max(200),
        cta: z.string().max(40).optional(),
      }),
    )
    .min(1)
    .max(8),
  intervalMs: z.number().int().min(2000).max(12000).default(5000),
});
export type BrandCarouselConfig = z.infer<typeof brandCarouselConfigSchema>;

/** MARQUEE — scrolling text strip (announcements / hype). */
export const marqueeConfigSchema = z.object({
  items: z.array(z.string().min(1).max(60)).min(1).max(12),
  speedSeconds: z.number().int().min(10).max(120).default(30),
});
export type MarqueeConfig = z.infer<typeof marqueeConfigSchema>;

/**
 * Map of SectionType -> its config Zod schema. Use `sectionConfigFor(type)` to
 * validate a section's `config` Json on write.
 */
export const sectionConfigSchemas = {
  HERO: heroConfigSchema,
  PRODUCT_ROW: productRowConfigSchema,
  CATEGORY_GRID: categoryGridConfigSchema,
  EDITORIAL: editorialConfigSchema,
  BANNER: bannerConfigSchema,
  MARQUEE: marqueeConfigSchema,
  BRAND_CAROUSEL: brandCarouselConfigSchema,
} as const;

export type SectionTypeKey = keyof typeof sectionConfigSchemas;

export const SECTION_TYPES = Object.keys(sectionConfigSchemas) as SectionTypeKey[];

const PLACEHOLDER_IMG =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80";

/** A valid starter config for a freshly-created section of each type. */
export function defaultSectionConfig(type: SectionTypeKey): unknown {
  switch (type) {
    case "HERO":
      return { mode: "carousel", headline: "New headline", theme: "dark", align: "left", autoplayMs: 6000, slides: [{ media: { url: PLACEHOLDER_IMG } }] };
    case "PRODUCT_ROW":
      return { heading: "Featured", source: { kind: "newest" }, limit: 8, layout: "carousel" };
    case "CATEGORY_GRID":
      return { tiles: [{ media: { url: PLACEHOLDER_IMG }, label: "Shop", href: "/products" }], columns: 3 };
    case "EDITORIAL":
      return { media: { url: PLACEHOLDER_IMG }, heading: "Heading", imageSide: "left" };
    case "BANNER":
      return { heading: "Big sale", theme: "dark" };
    case "MARQUEE":
      return { items: ["Free shipping over ৳2,000"], speedSeconds: 30 };
    case "BRAND_CAROUSEL":
      return { slides: [{ media: { url: PLACEHOLDER_IMG }, eyebrow: "Collab", title: "Maison × Active", href: "/collections/sale" }], intervalMs: 5000 };
  }
}
