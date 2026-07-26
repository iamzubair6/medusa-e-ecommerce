import { NextResponse } from "next/server";
import { z } from "zod";
import { emailMockMode, renderEmail, sendEmail, emailShell } from "@/lib/email";
import { EMAIL_TEMPLATE_TYPES, emailTemplatesSchema, fillPlaceholders, isFullHtmlDocument } from "@/lib/email-templates";
import { parseEmailFrame } from "@/lib/email-frame";
import { getSiteSetting } from "@ecom/cms";

const schema = z.union([
  z.object({
    type: z.enum(EMAIL_TEMPLATE_TYPES),
    to: z.string().email().max(120),
    // Current editor values so the admin previews unsaved edits.
    templates: emailTemplatesSchema,
  }),
  // Custom (owner-created) template test — sends the passed draft directly.
  z.object({
    to: z.string().email().max(120),
    custom: z.object({
      subject: z.string().min(1).max(150),
      heading: z.string().min(1).max(120),
      body: z.string().min(1).max(200_000),
    }),
  }),
]);

/** Demo values so every placeholder renders in test sends. */
const SAMPLE_VARS: Record<string, string> = {
  code: "482913",
  orderId: "MSN-00042",
  total: "৳2,350",
  trackUrl: "https://example.com/track",
  trackingNumber: "BD123456789",
  name: "Test Customer",
  email: "customer@example.com",
  product: "Ribbed Knit Tank",
  size: "M",
  url: "https://example.com/products/ribbed-knit-tank",
  items: "1× Satin Slip Dress · 2× Ribbed Knit Tank",
  count: "3",
  cartUrl: "https://example.com/cart",
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
  const { subject, html } =
    "custom" in parsed.data
      ? {
          subject: fillPlaceholders(parsed.data.custom.subject, SAMPLE_VARS),
          // Full HTML documents are sent as-is; fragments get the brand shell (#142).
          html: isFullHtmlDocument(parsed.data.custom.body)
            ? fillPlaceholders(parsed.data.custom.body, SAMPLE_VARS)
            : emailShell(
                fillPlaceholders(parsed.data.custom.heading, SAMPLE_VARS),
                fillPlaceholders(parsed.data.custom.body, SAMPLE_VARS),
                parseEmailFrame(await getSiteSetting("emailFrame").catch(() => null)),
              ),
        }
      : await renderEmail(parsed.data.type, SAMPLE_VARS, parsed.data.templates);
  const sent = await sendEmail({ to: parsed.data.to, subject: `[TEST] ${subject}`, html });
  if (!sent) return NextResponse.json({ error: "Brevo rejected the send — check the sender and key." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
