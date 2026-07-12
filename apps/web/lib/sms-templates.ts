import { z } from "zod";

/**
 * Admin-editable SMS copy, stored in the CMS SiteSetting "smsTemplates"
 * (edited at /admin/sms-templates). Compliance notes baked into the defaults:
 * MiMSMS's OTP format is "Your {company} OTP code is {code}…", and BD mobile
 * operators require the brand name in round brackets inside every SMS body —
 * missing it risks rejection and sender-ID blocking.
 *
 * Placeholders (unknown tokens stay visible so mistakes surface):
 *   all:               {company}
 *   otp:               {code}
 *   order templates:   {orderId} {total} {trackUrl}
 */
export const SMS_TEMPLATE_TYPES = ["otp", "orderConfirmation"] as const;
export type SmsTemplateType = (typeof SMS_TEMPLATE_TYPES)[number];

export const smsTemplatesSchema = z.object({
  /** Brand/company name — required by operators inside every SMS body. */
  companyName: z.string().min(1).max(40),
  otp: z.string().min(10).max(300),
  orderConfirmation: z.string().min(10).max(300),
});

export type SmsTemplates = z.infer<typeof smsTemplatesSchema>;

export const SMS_TEMPLATE_META: Record<SmsTemplateType, { label: string; placeholders: string[] }> = {
  otp: { label: "Verification code (OTP)", placeholders: ["{code}", "{company}"] },
  orderConfirmation: {
    label: "Order confirmation",
    placeholders: ["{orderId}", "{total}", "{trackUrl}", "{company}"],
  },
};

export const DEFAULT_SMS_TEMPLATES: SmsTemplates = {
  companyName: "Maison",
  // MiMSMS-documented OTP format + operator-required (brand) suffix.
  otp: "Your {company} OTP code is {code}. The code will expire in 5 minutes. ({company})",
  orderConfirmation: "Order {orderId} confirmed ({total}). Track: {trackUrl} ({company})",
};

/** Parse the raw CMS value; invalid/missing falls back per-field to defaults. */
export function parseSmsTemplates(raw: unknown): SmsTemplates {
  const r = smsTemplatesSchema.safeParse(raw);
  if (r.success) return r.data;
  const merged = { ...DEFAULT_SMS_TEMPLATES };
  if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const name = z.string().min(1).max(40).safeParse(record.companyName);
    if (name.success) merged.companyName = name.data;
    for (const key of SMS_TEMPLATE_TYPES) {
      const one = z.string().min(10).max(300).safeParse(record[key]);
      if (one.success) merged[key] = one.data;
    }
  }
  return merged;
}

/** Plain-text placeholder fill — no escaping (SMS has no markup). */
export function fillSmsPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}
