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
} as const;

export type SectionTypeKey = keyof typeof sectionConfigSchemas;
