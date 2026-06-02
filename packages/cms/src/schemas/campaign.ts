import { z } from "zod";

/**
 * Payload for a campaign "run" — what the campaign activates while live.
 * Kept intentionally small; extend as scheduled-activation features grow.
 */
export const campaignPayloadSchema = z
  .object({
    /** A Medusa promo code to promote during the run. */
    promoCode: z.string().max(60).optional(),
    /** Optional banner/announcement copy to surface during the run. */
    note: z.string().max(300).optional(),
  })
  .default({});

export type CampaignPayload = z.infer<typeof campaignPayloadSchema>;
