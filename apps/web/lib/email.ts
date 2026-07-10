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
/* Templates — inline-styled to survive email clients, on-brand (bone/ink).   */
/* ------------------------------------------------------------------------- */

const shell = (inner: string) => `
<div style="background:#f5f1e8;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
  <div style="max-width:520px;margin:0 auto;background:#fbf8f1;border:1px solid #d8cfbc;padding:32px;">
    <p style="margin:0 0 24px;font-size:22px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;">Maison</p>
    ${inner}
    <p style="margin:32px 0 0;padding-top:16px;border-top:1px solid #d8cfbc;font-size:12px;color:#8a8272;">
      Maison · editorial luxury, every day. Questions? Just reply to this email.
    </p>
  </div>
</div>`;

export function otpEmailHtml(code: string): string {
  return shell(`
    <p style="margin:0 0 8px;font-size:16px;">Your verification code</p>
    <p style="margin:0 0 16px;font-size:34px;letter-spacing:10px;font-weight:bold;color:#7a1f2b;">${code}</p>
    <p style="margin:0;font-size:14px;color:#5c564a;">It expires in 5 minutes. If you didn't request it, you can ignore this email.</p>
  `);
}

export function orderConfirmationHtml(order: { displayId: number; total: string }): string {
  return shell(`
    <p style="margin:0 0 8px;font-size:20px;font-weight:bold;">Order confirmed — thank you!</p>
    <p style="margin:0 0 16px;font-size:15px;">
      Your order <strong>#${order.displayId}</strong> (${order.total}) is being prepared.
    </p>
    <p style="margin:0 0 16px;font-size:14px;color:#5c564a;">
      We'll be in touch when it ships. You can follow it anytime on the
      <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/track" style="color:#7a1f2b;">Track Order</a> page
      using your order ID and phone number.
    </p>
  `);
}
