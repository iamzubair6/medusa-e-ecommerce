import { z } from "zod";

/** A CTA button used across hero, banners, editorial blocks. */
export const ctaSchema = z.object({
  label: z.string().min(1).max(40),
  href: z.string().min(1),
  variant: z.enum(["solid", "outline", "ghost"]).default("solid"),
});
export type Cta = z.infer<typeof ctaSchema>;

/** Reference to a media asset (image or video). */
export const mediaRefSchema = z.object({
  url: z.string().url(),
  alt: z.string().max(160).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type MediaRef = z.infer<typeof mediaRefSchema>;

/**
 * Where a product section pulls its products from. Resolved against Medusa at
 * render time.
 */
export const productSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("collection"), handle: z.string().min(1) }),
  z.object({ kind: z.literal("ids"), ids: z.array(z.string().min(1)).min(1).max(24) }),
  z.object({ kind: z.literal("newest") }),
  z.object({ kind: z.literal("bestsellers") }),
]);
export type ProductSource = z.infer<typeof productSourceSchema>;
