import { z } from "zod";

/** Shared validation for the product create/edit form payload. */
export const productSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  offer: z
    .object({
      type: z.enum(["bogo", "discount"]),
      label: z.string().min(1).max(60),
      percent: z.number().int().min(1).max(90).optional(),
    })
    .optional(),
  categoryIds: z.array(z.string().min(1)).max(20).optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
  type: z.string().max(40).optional(),
  colors: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        swatch: z.string().min(1).max(20),
        price: z.number().int().min(1),
        originalPrice: z.number().int().min(1).optional(),
        images: z.array(z.string().url()).min(1).max(12),
        sizes: z
          .array(z.object({ size: z.string().min(1).max(8), stock: z.number().int().min(0).max(9999) }))
          .min(1),
      }),
    )
    .min(1)
    .max(8),
});
