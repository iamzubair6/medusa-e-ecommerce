import { z } from "zod";

/**
 * Editable copy for the first-visit phone-capture popup (admin → /admin/phone-popup,
 * stored in CMS SiteSetting "phoneCapture" — kept separate from the "site" object so
 * it owns its own admin screen). Replaces the previously hardcoded strings in
 * components/site/phone-capture-popup.tsx. `codeSubtext` may contain a `{phone}`
 * placeholder that is replaced with the entered number at render time.
 */
export const phoneCaptureSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  heading: z.string().min(1).max(60).default("Get 10% Off"),
  subtext: z
    .string()
    .min(1)
    .max(200)
    .default("Add your phone for offers + faster checkout. We'll text a quick code."),
  buttonLabel: z.string().min(1).max(40).default("Send code"),
  codeHeading: z.string().min(1).max(60).default("Enter code"),
  codeSubtext: z.string().min(1).max(200).default("We sent a 4-digit code to {phone}."),
  successText: z.string().min(1).max(40).default("Verify & continue"),
});

export type PhoneCaptureSettings = z.infer<typeof phoneCaptureSettingsSchema>;

export const DEFAULT_PHONE_CAPTURE_SETTINGS: PhoneCaptureSettings = phoneCaptureSettingsSchema.parse({});

/** Parse the raw CMS value, falling back to defaults on any failure (mirrors parseSiteSettings). */
export function parsePhoneCaptureSettings(raw: unknown): PhoneCaptureSettings {
  const r = phoneCaptureSettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_PHONE_CAPTURE_SETTINGS;
}
