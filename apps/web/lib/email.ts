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
/* Rendering — the branded shell is fixed in code; subject/heading/body come  */
/* from the admin-editable "emailTemplates" SiteSetting (/admin/email-templates). */
/* ------------------------------------------------------------------------- */

import { getSiteSetting } from "@ecom/cms";
import {
  fillPlaceholders,
  parseEmailTemplates,
  type EmailTemplates,
  type EmailTemplateType,
} from "./email-templates";

/** On-brand shell: ink logo band, claret accent rule, parchment card, footer. */
/** Escape user-supplied text before interpolating it into email HTML. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailShell(heading: string, bodyHtml: string): string {
  return `
<div style="background:#eae4d6;padding:36px 16px;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
  <div style="max-width:540px;margin:0 auto;">
    <div style="background:#1c1a17;padding:22px 32px;text-align:center;">
      <span style="font-size:24px;letter-spacing:6px;font-weight:bold;text-transform:uppercase;color:#f5f1e8;">Maison</span>
    </div>
    <div style="height:3px;background:#7a1f2b;"></div>
    <div style="background:#fbf8f1;border:1px solid #d8cfbc;border-top:0;padding:36px 32px;">
      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:bold;">${heading}</h1>
      ${bodyHtml}
    </div>
    <p style="margin:18px 8px 0;text-align:center;font-size:12px;color:#8a8272;">
      Maison · editorial luxury, every day.<br/>Questions? Just reply to this email — a human reads it.
    </p>
  </div>
</div>`;
}

/**
 * Render a transactional email from the admin-managed templates.
 * `templates` may be passed in when the caller already fetched the setting.
 */
export async function renderEmail(
  type: EmailTemplateType,
  vars: Record<string, string>,
  templates?: EmailTemplates,
): Promise<{ subject: string; html: string }> {
  const t = (templates ?? parseEmailTemplates(await getSiteSetting("emailTemplates").catch(() => null)))[type];
  return {
    subject: fillPlaceholders(t.subject, vars),
    html: emailShell(fillPlaceholders(t.heading, vars), fillPlaceholders(t.body, vars)),
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
