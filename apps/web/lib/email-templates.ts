import { z } from "zod";

/**
 * Admin-editable transactional email templates, stored in the CMS SiteSetting
 * "emailTemplates" (edited at /admin/email-templates). The admin edits the
 * subject / heading / body per template; the branded shell (logo band, claret
 * accent, footer) is fixed in code so every email stays on-brand.
 *
 * Placeholders (replaced at send time, unknown ones left intact):
 *   all:                {name}
 *   otp:                {code}
 *   order* templates:   {orderId} {total} {trackUrl}
 *   orderShipped:       {trackingNumber}
 */
export const EMAIL_TEMPLATE_TYPES = [
  "otp",
  "orderConfirmation",
  "orderShipped",
  "orderDelivered",
  "welcome",
] as const;
export type EmailTemplateType = (typeof EMAIL_TEMPLATE_TYPES)[number];

export const emailTemplateSchema = z.object({
  subject: z.string().min(1).max(150),
  heading: z.string().min(1).max(120),
  body: z.string().min(1).max(10000),
});

export const emailTemplatesSchema = z.object({
  otp: emailTemplateSchema,
  orderConfirmation: emailTemplateSchema,
  orderShipped: emailTemplateSchema,
  orderDelivered: emailTemplateSchema,
  welcome: emailTemplateSchema,
});

export type EmailTemplate = z.infer<typeof emailTemplateSchema>;
export type EmailTemplates = z.infer<typeof emailTemplatesSchema>;

/** Meta shown in the admin editor: friendly names + available placeholders. */
export const EMAIL_TEMPLATE_META: Record<EmailTemplateType, { label: string; placeholders: string[] }> = {
  otp: { label: "Verification code (OTP)", placeholders: ["{code}", "{name}"] },
  orderConfirmation: { label: "Order confirmation", placeholders: ["{orderId}", "{total}", "{trackUrl}", "{name}"] },
  orderShipped: {
    label: "Order shipped",
    placeholders: ["{orderId}", "{trackingNumber}", "{trackUrl}", "{name}"],
  },
  orderDelivered: { label: "Order delivered", placeholders: ["{orderId}", "{trackUrl}", "{name}"] },
  welcome: { label: "Welcome (after registration)", placeholders: ["{name}"] },
};

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplates = {
  otp: {
    subject: "{code} is your Maison verification code",
    heading: "Your verification code",
    body: `<p style="margin:0 0 10px;font-size:15px;color:#5c564a;">Use this code to continue — it expires in 5 minutes.</p>
<p style="margin:0 0 18px;text-align:center;"><span style="display:inline-block;padding:14px 28px;background:#1c1a17;color:#f5f1e8;font-size:30px;letter-spacing:12px;font-weight:bold;border-radius:2px;">{code}</span></p>
<p style="margin:0;font-size:13px;color:#8a8272;">Didn't request this? You can safely ignore this email — your account is untouched.</p>`,
  },
  orderConfirmation: {
    subject: "Order {orderId} confirmed — welcome to the drop",
    heading: "Thank you. It's yours.",
    body: `<p style="margin:0 0 14px;font-size:15px;">Your order <strong style="color:#7a1f2b;">{orderId}</strong> ({total}) is confirmed and being prepared with care.</p>
<table role="presentation" width="100%" style="margin:0 0 18px;border-collapse:collapse;"><tr>
<td style="border:1px solid #d8cfbc;padding:14px 16px;background:#f5f1e8;">
<p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a8272;">Order</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:bold;">{orderId}</p>
</td>
<td style="border:1px solid #d8cfbc;border-left:0;padding:14px 16px;background:#f5f1e8;">
<p style="margin:0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#8a8272;">Total</p>
<p style="margin:4px 0 0;font-size:18px;font-weight:bold;">{total}</p>
</td></tr></table>
<p style="margin:0 0 18px;text-align:center;"><a href="{trackUrl}" style="display:inline-block;padding:13px 34px;background:#7a1f2b;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Track your order</a></p>
<p style="margin:0;font-size:13px;color:#8a8272;">We'll email you again the moment it ships.</p>`,
  },
  orderShipped: {
    subject: "Order {orderId} is on its way",
    heading: "Shipped. En route to you.",
    body: `<p style="margin:0 0 14px;font-size:15px;">Great news — order <strong style="color:#7a1f2b;">{orderId}</strong> has left our studio.</p>
<p style="margin:0 0 14px;font-size:14px;color:#5c564a;">Tracking number: <strong>{trackingNumber}</strong></p>
<p style="margin:0 0 18px;text-align:center;"><a href="{trackUrl}" style="display:inline-block;padding:13px 34px;background:#7a1f2b;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Follow the journey</a></p>
<p style="margin:0;font-size:13px;color:#8a8272;">Keep cash ready if you chose Cash on Delivery.</p>`,
  },
  orderDelivered: {
    subject: "Delivered — how does it feel?",
    heading: "Order {orderId} has arrived.",
    body: `<p style="margin:0 0 14px;font-size:15px;">Your pieces are home. We hope they feel as good as they look.</p>
<p style="margin:0 0 18px;text-align:center;"><a href="{trackUrl}" style="display:inline-block;padding:13px 34px;background:#1c1a17;color:#f5f1e8;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;">View order</a></p>
<p style="margin:0;font-size:13px;color:#8a8272;">Something not right? Reply to this email within 7 days and we'll arrange an exchange or return.</p>`,
  },
  welcome: {
    subject: "Welcome to Maison — you're on the list",
    heading: "Welcome, {name}.",
    body: `<p style="margin:0 0 14px;font-size:15px;">Your account is live. You now see new drops first, check out faster, and track every order in one place.</p>
<p style="margin:0 0 18px;text-align:center;"><a href="{trackUrl}" style="display:inline-block;padding:13px 34px;background:#7a1f2b;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Shop new in</a></p>
<p style="margin:0;font-size:13px;color:#8a8272;">Editorial luxury, for every day — see you inside.</p>`,
  },
};

/** Parse the raw CMS value; missing/invalid templates fall back per-key. */
export function parseEmailTemplates(raw: unknown): EmailTemplates {
  const r = emailTemplatesSchema.safeParse(raw);
  if (r.success) return r.data;
  // Partial saves (or never-saved) — merge valid keys over the defaults.
  const merged = { ...DEFAULT_EMAIL_TEMPLATES };
  if (raw && typeof raw === "object") {
    for (const key of EMAIL_TEMPLATE_TYPES) {
      const one = emailTemplateSchema.safeParse((raw as Record<string, unknown>)[key]);
      if (one.success) merged[key] = one.data;
    }
  }
  return merged;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/**
 * Replace {placeholders}; unknown tokens are left visible so mistakes surface.
 * Values are HTML-escaped — the template itself is the only intended HTML
 * source (blocks customer-controlled names from injecting markup into emails).
 */
export function fillPlaceholders(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => (vars[key] !== undefined ? escapeHtml(vars[key]) : m));
}
