import { z } from "zod";
import {
  DEFAULT_EMAIL_TEMPLATES,
  EMAIL_TEMPLATE_TYPES,
  parseEmailTemplates,
  type EmailTemplateType,
} from "./email-templates";
import { DEFAULT_FRAME_REF } from "./email-frames";
import { PLAIN_BODY_TEMPLATE_ID } from "./email-body-templates";

/**
 * Per-purpose email configuration (plan §4, phase 2), stored in the CMS
 * SiteSetting "emailPurposes": each of the 8 transactional purposes points at
 * a frame ("default" | "none" | frame id) and a body template, and holds its
 * own subject / heading / content (the HTML that fills the body template's
 * {content} slot).
 *
 * Migration: when "emailPurposes" was never saved, the legacy "emailTemplates"
 * setting (subject/heading/body) maps to content=body + Plain body template +
 * Default frame — byte-identical rendering to the pre-library pipeline, so
 * nothing visibly changes on upgrade day. Pure module (client-safe).
 */

export const emailPurposeConfigSchema = z.object({
  /** "default" (follow the default frame), "none" (unwrapped), or a frame id. */
  frameId: z.string().min(1).max(40),
  bodyTemplateId: z.string().min(1).max(40),
  subject: z.string().min(1).max(150),
  heading: z.string().min(1).max(120),
  content: z.string().min(1).max(10000),
});
export type EmailPurposeConfig = z.infer<typeof emailPurposeConfigSchema>;

export const emailPurposesSchema = z.object({
  otp: emailPurposeConfigSchema,
  orderConfirmation: emailPurposeConfigSchema,
  orderShipped: emailPurposeConfigSchema,
  orderDelivered: emailPurposeConfigSchema,
  welcome: emailPurposeConfigSchema,
  restock: emailPurposeConfigSchema,
  abandonedCart: emailPurposeConfigSchema,
  newsletter: emailPurposeConfigSchema,
});
export type EmailPurposes = z.infer<typeof emailPurposesSchema>;

/** Map a legacy subject/heading/body template to the purpose-config shape. */
function fromLegacy(t: { subject: string; heading: string; body: string }): EmailPurposeConfig {
  return {
    frameId: DEFAULT_FRAME_REF,
    bodyTemplateId: PLAIN_BODY_TEMPLATE_ID,
    subject: t.subject,
    heading: t.heading,
    content: t.body,
  };
}

export const DEFAULT_EMAIL_PURPOSES: EmailPurposes = Object.fromEntries(
  EMAIL_TEMPLATE_TYPES.map((type) => [type, fromLegacy(DEFAULT_EMAIL_TEMPLATES[type])]),
) as Record<EmailTemplateType, EmailPurposeConfig>;

/**
 * Parse the raw "emailPurposes" setting with a per-key merge (like the legacy
 * parseEmailTemplates): each valid purpose wins; anything missing/invalid
 * falls back to the migrated legacy "emailTemplates" value (second arg) — and
 * ultimately to the code defaults.
 */
export function parseEmailPurposes(raw: unknown, legacyTemplatesRaw: unknown = null): EmailPurposes {
  const legacy = parseEmailTemplates(legacyTemplatesRaw);
  const merged = Object.fromEntries(
    EMAIL_TEMPLATE_TYPES.map((type) => [type, fromLegacy(legacy[type])]),
  ) as Record<EmailTemplateType, EmailPurposeConfig>;
  if (raw && typeof raw === "object") {
    for (const type of EMAIL_TEMPLATE_TYPES) {
      const one = emailPurposeConfigSchema.safeParse((raw as Record<string, unknown>)[type]);
      if (one.success) merged[type] = one.data;
    }
  }
  return merged;
}

/**
 * Placeholders each purpose really shouldn't ship without (missing one gets a
 * WARNING in the editor — never a block; plan §2).
 */
export const IMPORTANT_PLACEHOLDERS: Record<EmailTemplateType, string[]> = {
  otp: ["{code}"],
  orderConfirmation: ["{orderId}"],
  orderShipped: ["{trackUrl}"],
  orderDelivered: ["{orderId}"],
  welcome: [],
  restock: ["{url}"],
  abandonedCart: ["{cartUrl}"],
  newsletter: [],
};

/** Which important placeholders are absent from subject + heading + content. */
export function missingImportantPlaceholders(
  type: EmailTemplateType,
  config: Pick<EmailPurposeConfig, "subject" | "heading" | "content">,
): string[] {
  const haystack = `${config.subject}\n${config.heading}\n${config.content}`;
  return IMPORTANT_PLACEHOLDERS[type].filter((token) => {
    const key = token.slice(1, -1);
    return !haystack.includes(`{${key}}`) && !haystack.includes(`{{${key}}}`);
  });
}
