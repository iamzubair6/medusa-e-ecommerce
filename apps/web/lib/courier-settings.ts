import { z } from "zod";

/**
 * Admin-managed delivery-partner choice, stored in the CMS SiteSetting
 * "courier" (edited on /admin/shipping). Decides how the Ship step behaves:
 *   manual    — admin enters any courier's tracking number by hand
 *   steadfast — one-click handover to Steadfast (needs API keys in env)
 * testMode ON simulates Steadfast consignments (no real pickups) — the safe
 * default while the project is in its test phase.
 */
export const courierSettingsSchema = z.object({
  partner: z.enum(["manual", "steadfast"]).default("steadfast"),
  testMode: z.boolean().default(true),
});

export type CourierSettings = z.infer<typeof courierSettingsSchema>;

export const DEFAULT_COURIER_SETTINGS: CourierSettings = courierSettingsSchema.parse({});

export function parseCourierSettings(raw: unknown): CourierSettings {
  const r = courierSettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_COURIER_SETTINGS;
}
