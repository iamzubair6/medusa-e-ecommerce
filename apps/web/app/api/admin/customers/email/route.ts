import { NextResponse } from "next/server";
import { z } from "zod";
import { adminConfigured, listAllCustomerEmails } from "@/lib/medusa-admin";
import { sendEmail, emailMockMode } from "@/lib/email";
import { fillPlaceholders } from "@/lib/email-templates";
import { campaignSendSchema } from "@/lib/email-campaigns";
import { renderEmailHtml } from "@/lib/email-render";
import { resolveFrame } from "@/lib/email-frames";
import { resolveBodyTemplate } from "@/lib/email-body-templates";
import { getEmailConfig } from "@/lib/email-settings";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Spend guard — bulk email campaigns are human-paced. */
const SENDS_PER_WINDOW = 2;
const WINDOW_MS = 10 * 60_000;
/** Brevo free tier is 300/day — hard cap one campaign below that. */
const MAX_RECIPIENTS = 300;

const bodySchema = campaignSendSchema.extend({
  /** Must match the server-resolved audience so a stale client can't over-send. */
  expectedRecipients: z.number().int().positive(),
  /** "all" (default) or a hand-picked list of customer emails (#175). */
  audience: z.union([z.literal("all"), z.array(z.string().email()).min(1).max(MAX_RECIPIENTS)]).default("all"),
});

/** Audience for campaigns (ADMIN-only by middleware): count, or the pickable
 *  list (?list=1) for the hand-picked mode — capped at the send cap. */
export async function GET(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }
  const recipients = await listAllCustomerEmails();
  if (new URL(request.url).searchParams.get("list")) {
    return NextResponse.json({
      recipients: recipients.length,
      customers: recipients.slice(0, MAX_RECIPIENTS),
      truncated: recipients.length > MAX_RECIPIENTS,
    });
  }
  return NextResponse.json({ recipients: recipients.length });
}

/** Send one campaign (subject + content + body template + frame) to every customer with a real email. */
export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }
  if (emailMockMode()) {
    return NextResponse.json({ error: "Email is not configured (BREVO_API_KEY / EMAIL_FROM missing)." }, { status: 503 });
  }
  const limit = rateLimit(`bulk-email:${clientKey(request)}`, SENDS_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many bulk sends — wait a few minutes before the next campaign." },
      { status: 429 },
    );
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 422 });
  }

  const everyone = await listAllCustomerEmails();
  // Hand-picked mode: only emails that are REAL current customers survive —
  // the client can never make this endpoint mail an arbitrary address.
  const recipients =
    parsed.data.audience === "all"
      ? everyone
      : everyone.filter((r) =>
          (parsed.data.audience as string[]).some((e) => e.toLowerCase() === r.email.toLowerCase()),
        );
  if (recipients.length === 0) return NextResponse.json({ error: "No customers with an email." }, { status: 409 });
  if (recipients.length !== parsed.data.expectedRecipients) {
    return NextResponse.json(
      { error: `The audience changed (now ${recipients.length}) — review and confirm again.`, recipients: recipients.length },
      { status: 409 },
    );
  }
  if (recipients.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { error: `Audience (${recipients.length}) exceeds the ${MAX_RECIPIENTS}/campaign cap (Brevo free tier is 300/day).` },
      { status: 422 },
    );
  }

  // Frame + body template resolved once server-side from the shared libraries.
  const config = await getEmailConfig();
  const frame = resolveFrame(config.frames, parsed.data.frameId);
  const bodyTemplateHtml = resolveBodyTemplate(config.bodyTemplates, parsed.data.bodyTemplateId).html;

  let sent = 0;
  for (const r of recipients) {
    const vars = { name: r.name || "there", email: r.email };
    const ok = await sendEmail({
      to: r.email,
      subject: fillPlaceholders(parsed.data.subject, vars),
      html: renderEmailHtml({ frame, bodyTemplateHtml, heading: "", content: parsed.data.content, vars }),
    });
    if (ok) sent += 1;
  }
  return NextResponse.json({ sent, recipients: recipients.length });
}
