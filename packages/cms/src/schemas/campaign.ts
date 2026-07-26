import { z } from "zod";

/**
 * Payload for a campaign "run" — what the campaign activates while live.
 * Kept intentionally small; extend as scheduled-activation features grow.
 */
export const campaignPayloadSchema = z
  .object({
    /** A Medusa promo code to promote during the run. */
    promoCode: z.string().max(60).optional(),
    /** Internal note (not shown to shoppers). */
    note: z.string().max(300).optional(),
    /** Storefront announcement-bar message while the campaign is live —
     *  overrides the regular announcement bar. */
    bannerText: z.string().max(160).optional(),
    /** Where the banner's Shop Now link points (defaults to /products). */
    bannerHref: z.string().max(200).optional(),
  })
  .default({});

export type CampaignPayload = z.infer<typeof campaignPayloadSchema>;
