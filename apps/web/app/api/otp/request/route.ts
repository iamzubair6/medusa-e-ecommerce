import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@ecom/cms";
import { sendOtp, otpMockMode } from "@/lib/otp-sms";
import { emailMockMode, otpEmailHtml, sendEmail } from "@/lib/email";
import { findCustomerEmailByPhone } from "@/lib/medusa-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  phone: z.string().min(6).max(20),
  email: z.string().email().max(120).optional(),
});

/** On-screen demo codes: explicit opt-in in production, allowed in dev. */
const demoCodesAllowed = () =>
  process.env.OTP_DEMO_CODES === "true" || process.env.NODE_ENV !== "production";

/**
 * Generate + send a 6-digit OTP for a phone. Delivery, best first:
 * 1. real email (Brevo) — to the phone's REGISTERED email when an account
 *    exists (the caller's email is never trusted for existing accounts, or the
 *    code could be exfiltrated to take the account over); the supplied email
 *    is used only for brand-new phones (registration),
 * 2. real SMS when a gateway is configured (none yet),
 * 3. demo mode (explicit opt-in in prod) — the code is returned on-screen.
 */
export async function POST(request: Request) {
  const ipLimit = rateLimit(`otp:${clientKey(request)}`, 5, 60_000);
  if (!ipLimit.ok) {
    return NextResponse.json({ error: "Too many codes requested. Try again in a minute." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 422 });

  const phone = parsed.data.phone.trim();
  const phoneLimit = rateLimit(`otp-phone:${phone}`, 3, 5 * 60_000);
  if (!phoneLimit.ok) {
    return NextResponse.json({ error: "Too many codes for this number. Try again shortly." }, { status: 429 });
  }

  try {
    // Bind delivery to the account: an existing phone's code goes only to its
    // stored email. The caller's email is honored only when the phone is new.
    const placeholder = (addr: string) => addr.endsWith("@phone.maison.local");
    const stored = await findCustomerEmailByPhone(phone).catch(() => null);
    const target = stored ? (placeholder(stored) ? undefined : stored) : parsed.data.email?.trim();

    const { code } = await requestOtp(phone);
    const emailed = target && !emailMockMode()
      ? await sendEmail({ to: target, subject: "Your Maison verification code", html: otpEmailHtml(code) })
      : false;
    if (!emailed) await sendOtp(phone, code);

    const delivered = emailed || !otpMockMode();
    if (!delivered && !demoCodesAllowed()) {
      return NextResponse.json(
        { error: "We can't deliver a code to this number yet. Please contact support." },
        { status: 503 },
      );
    }
    return NextResponse.json({
      ok: true,
      ...(emailed ? { channel: "email" as const, sentTo: maskEmail(target as string) } : {}),
      ...(delivered ? {} : { devCode: code }),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}

/** j***e@g***.com — enough to recognize the inbox without leaking it. */
function maskEmail(addr: string): string {
  const [user = "", domain = ""] = addr.split("@");
  const mask = (s: string) => (s.length <= 2 ? `${s[0] ?? ""}*` : `${s[0]}***${s[s.length - 1]}`);
  return `${mask(user)}@${mask(domain)}`;
}
