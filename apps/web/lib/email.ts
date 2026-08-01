import "server-only";

/**
 * Transactional email via Brevo's free API (300/day) — https://developers.brevo.com.
 * Mock mode (no BREVO_API_KEY): nothing is sent and callers fall back to their
 * demo affordance (e.g. on-screen OTP), so the site keeps working with zero setup.
 *
 * Env: BREVO_API_KEY (required to send), EMAIL_FROM (Brevo-verified sender
 * address), EMAIL_FROM_NAME (display name, defaults to "Maison").
 */
export const emailMockMode = (): boolean => !process.env.BREVO_API_KEY || !process.env.EMAIL_FROM;

type SendArgs = { to: string; toName?: string; subject: string; html: string };

/** Send one email. Never throws — returns false on mock mode or any failure. */
export async function sendEmail({ to, toName, subject, html }: SendArgs): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey || emailMockMode()) return false;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: process.env.EMAIL_FROM, name: process.env.EMAIL_FROM_NAME ?? "Maison" },
        to: [{ email: to, ...(toName ? { name: toName } : {}) }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------------- */
/* Rendering — every send goes through the ONE shared renderer               */
/* (lib/email-render.ts): purpose config → body template {content} slot →    */
/* frame → placeholders. Config comes from the admin-editable SiteSettings   */
/* (/admin/email-templates), read migration-aware in lib/email-settings.ts.  */
/* ------------------------------------------------------------------------- */

import { fillPlaceholders, escapeHtml, type EmailTemplateType } from "./email-templates";
import { renderEmailHtml } from "./email-render";
import { resolveFrame } from "./email-frames";
import { resolveBodyTemplate } from "./email-body-templates";
import { getEmailConfig } from "./email-settings";
import type { EmailPurposes } from "./email-purposes";

/** On-brand shell: ink logo band, claret accent rule, parchment card, footer. */
import { emailShell } from "./email-shell";
export { emailShell, escapeHtml };

/**
 * Render a transactional email from the admin-managed purpose configs.
 * `purposes` may be passed in when the caller already has them (the admin
 * test route sends the current unsaved editor state).
 */
export async function renderEmail(
  type: EmailTemplateType,
  vars: Record<string, string>,
  purposes?: EmailPurposes,
): Promise<{ subject: string; html: string }> {
  const config = await getEmailConfig();
  const p = (purposes ?? config.purposes)[type];
  return {
    subject: fillPlaceholders(p.subject, vars),
    html: renderEmailHtml({
      frame: resolveFrame(config.frames, p.frameId),
      bodyTemplateHtml: resolveBodyTemplate(config.bodyTemplates, p.bodyTemplateId).html,
      heading: p.heading,
      content: p.content,
      vars,
    }),
  };
}

/** Convenience: render + send in one call. Never throws; false = not sent. */
export async function sendTemplateEmail(
  type: EmailTemplateType,
  to: string,
  vars: Record<string, string>,
): Promise<boolean> {
  if (emailMockMode()) return false;
  const { subject, html } = await renderEmail(type, vars);
  return sendEmail({ to, subject, html });
}
