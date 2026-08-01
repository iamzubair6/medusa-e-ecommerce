import { NextResponse } from "next/server";
import { z } from "zod";
import { emailMockMode, renderEmail, sendEmail } from "@/lib/email";
import { EMAIL_TEMPLATE_TYPES, fillPlaceholders } from "@/lib/email-templates";
import { emailPurposesSchema } from "@/lib/email-purposes";
import { campaignSendSchema } from "@/lib/email-campaigns";
import { renderEmailHtml, SAMPLE_EMAIL_VARS } from "@/lib/email-render";
import { resolveFrame } from "@/lib/email-frames";
import { resolveBodyTemplate } from "@/lib/email-body-templates";
import { getEmailConfig } from "@/lib/email-settings";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.union([
  // Purpose test — sends the current (unsaved) editor state.
  z.object({
    type: z.enum(EMAIL_TEMPLATE_TYPES),
    to: z.string().email().max(120),
    purposes: emailPurposesSchema,
  }),
  // Campaign test (preset editor / Customers composer) — sends the passed draft.
  z.object({
    to: z.string().email().max(120),
    campaign: campaignSendSchema,
  }),
]);

/** Send a sample of one purpose/campaign to the given inbox (admin-gated). */
export async function POST(request: Request) {
  // Back-office only, but it emails arbitrary HTML to arbitrary inboxes —
  // keep it un-abusable as a spam relay.
  const limited = rateLimit(`email-test:${clientKey(request)}`, 15, 10 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many test sends — wait a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 422 });
  }
  if (emailMockMode()) {
    return NextResponse.json({ error: "Email is not configured (BREVO_API_KEY / EMAIL_FROM missing)." }, { status: 503 });
  }
  let subject: string;
  let html: string;
  if ("campaign" in parsed.data) {
    const { campaign } = parsed.data;
    const config = await getEmailConfig();
    subject = fillPlaceholders(campaign.subject, SAMPLE_EMAIL_VARS);
    html = renderEmailHtml({
      frame: resolveFrame(config.frames, campaign.frameId),
      bodyTemplateHtml: resolveBodyTemplate(config.bodyTemplates, campaign.bodyTemplateId).html,
      heading: "",
      content: campaign.content,
      vars: SAMPLE_EMAIL_VARS,
    });
  } else {
    ({ subject, html } = await renderEmail(parsed.data.type, SAMPLE_EMAIL_VARS, parsed.data.purposes));
  }
  const sent = await sendEmail({ to: parsed.data.to, subject: `[TEST] ${subject}`, html });
  if (!sent) return NextResponse.json({ error: "Brevo rejected the send — check the sender and key." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
