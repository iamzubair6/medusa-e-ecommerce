import { z } from "zod";
import { ctaSchema, mediaRefSchema } from "./primitives";

/** Promotional popup content + trigger detail. */
export const popupConfigSchema = z.object({
  heading: z.string().min(1).max(120),
  body: z.string().max(300).optional(),
  media: mediaRefSchema.optional(),
  cta: ctaSchema.optional(),
  // newsletter capture: when true, shows an email field that creates a GuestLead
  captureEmail: z.boolean().default(false),
  dismissLabel: z.string().max(40).default("No thanks"),
  // trigger detail (interpreted by the matching PopupTrigger)
  delayMs: z.number().int().min(0).max(60000).default(4000),
  scrollPercent: z.number().int().min(0).max(100).default(40),
  // don't reshow for this many days after dismissal
  frequencyDays: z.number().int().min(0).max(90).default(7),
});
export type PopupConfig = z.infer<typeof popupConfigSchema>;
