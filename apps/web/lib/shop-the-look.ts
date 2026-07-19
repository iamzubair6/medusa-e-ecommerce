import { z } from "zod";

/**
 * "Shop the Look" — Fashion-Nova-style outfit tagging, stored in the CMS
 * SiteSetting "shopTheLook". The admin places hotspots (percent coordinates)
 * on a model photo for a product; the PDP renders clickable dots linking each
 * tagged piece (top / bottom / shoes / accessories) to its own product page.
 * Labels are captured at tag time so the storefront needs zero extra fetches.
 */
export const lookHotspotSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  productHandle: z.string().min(1).max(120),
  label: z.string().max(120).default(""),
});

export const lookSchema = z.object({
  /** Handle of the product whose PDP shows this look. */
  productHandle: z.string().min(1).max(120),
  /** The model/outfit photo the dots sit on (defaults to the product's image). */
  imageUrl: z.string().url().max(500),
  hotspots: z.array(lookHotspotSchema).max(8).default([]),
});

export const shopTheLookSchema = z.object({
  looks: z.array(lookSchema).max(60).default([]),
  /** Optional bundle incentive for "Add the whole look": a display percent and
   *  a pre-created Medusa promo code auto-applied when the full look is added. */
  bundlePercent: z.number().int().min(0).max(50).default(0),
  bundleCode: z.string().max(40).default(""),
});

export type LookHotspot = z.infer<typeof lookHotspotSchema>;
export type Look = z.infer<typeof lookSchema>;
export type ShopTheLook = z.infer<typeof shopTheLookSchema>;

export const DEFAULT_SHOP_THE_LOOK: ShopTheLook = shopTheLookSchema.parse({});

export function parseShopTheLook(raw: unknown): ShopTheLook {
  const r = shopTheLookSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_SHOP_THE_LOOK;
}

export function lookForProduct(data: ShopTheLook, productHandle: string): Look | undefined {
  const look = data.looks.find((l) => l.productHandle === productHandle);
  return look && look.hotspots.length > 0 ? look : undefined;
}
