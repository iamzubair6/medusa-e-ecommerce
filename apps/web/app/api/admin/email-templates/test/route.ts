import { NextResponse } from "next/server";
import { z } from "zod";
import { emailMockMode, renderEmail, sendEmail } from "@/lib/email";
import { EMAIL_TEMPLATE_TYPES, emailTemplatesSchema } from "@/lib/email-templates";

const schema = z.object({
  type: z.enum(EMAIL_TEMPLATE_TYPES),
  to: z.string().email().max(120),
  // Current editor values so the admin previews unsaved edits.
  templates: emailTemplatesSchema,
});

/** Demo values so every placeholder renders in test sends. */
const SAMPLE_VARS: Record<string, string> = {
  code: "482913",
  orderId: "MSN-00042",
  total: "৳2,350",
  trackUrl: "https://example.com/track",
  trackingNumber: "BD123456789",
  name: "Test Customer",
};

/** Send a sample of one template to the given inbox (admin-gated). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 422 });
  }
  if (emailMockMode()) {
    return NextResponse.json({ error: "Email is not configured (BREVO_API_KEY / EMAIL_FROM missing)." }, { status: 503 });
  }
  const { subject, html } = await renderEmail(parsed.data.type, SAMPLE_VARS, parsed.data.templates);
  const sent = await sendEmail({ to: parsed.data.to, subject: `[TEST] ${subject}`, html });
  if (!sent) return NextResponse.json({ error: "Brevo rejected the send — check the sender and key." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
