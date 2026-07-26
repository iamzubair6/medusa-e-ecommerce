import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteSetting } from "@ecom/cms";
import { adminConfigured, listAllCustomerEmails } from "@/lib/medusa-admin";
import { sendEmail, emailMockMode, emailShell } from "@/lib/email";
import { parseCustomEmailTemplates, fillPlaceholders, isFullHtmlDocument } from "@/lib/email-templates";
import { parseEmailFrame } from "@/lib/email-frame";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Spend guard — bulk email campaigns are human-paced. */
const SENDS_PER_WINDOW = 2;
const WINDOW_MS = 10 * 60_000;
/** Brevo free tier is 300/day — hard cap one campaign below that. */
const MAX_RECIPIENTS = 300;

const bodySchema = z.object({
  templateId: z.string().min(1).max(40),
  /** Must match the server-resolved audience so a stale client can't over-send. */
  expectedRecipients: z.number().int().positive(),
});

/** Recipient count for the "all customers with an email" audience (ADMIN-only by middleware). */
export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }
  const recipients = await listAllCustomerEmails();
  return NextResponse.json({ recipients: recipients.length });
}

/** Send a custom template to every customer with a real email (ADMIN-only by middleware). */
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

  const templates = parseCustomEmailTemplates(await getSiteSetting("customEmailTemplates").catch(() => null));
  const template = templates.find((t) => t.id === parsed.data.templateId);
  if (!template) return NextResponse.json({ error: "Template not found — save it first." }, { status: 404 });

  const recipients = await listAllCustomerEmails();
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

  const frame = parseEmailFrame(await getSiteSetting("emailFrame").catch(() => null));
  let sent = 0;
  for (const r of recipients) {
    const vars = { name: r.name || "there", email: r.email };
    const ok = await sendEmail({
      to: r.email,
      subject: fillPlaceholders(template.subject, vars),
      // Full HTML documents go out as-is; fragments get the brand shell (#142).
      html: isFullHtmlDocument(template.body)
        ? fillPlaceholders(template.body, vars)
        : emailShell(fillPlaceholders(template.heading, vars), fillPlaceholders(template.body, vars), frame),
    });
    if (ok) sent += 1;
  }
  return NextResponse.json({ sent, recipients: recipients.length });
}
