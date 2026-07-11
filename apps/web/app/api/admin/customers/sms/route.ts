import { NextResponse } from "next/server";
import { z } from "zod";
import {
  adminConfigured,
  getCustomerPhonesByIds,
  listAllCustomerPhones,
} from "@/lib/medusa-admin";
import { sendPromotionalSms } from "@/lib/otp-sms";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/** Hard server-side cost caps — the client UI's confirmation is advisory only. */
const MAX_SEGMENTS = 4;
const SENDS_PER_WINDOW = 3;
const WINDOW_MS = 10 * 60_000;

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message is required.")
  .max(500, "Message must be 500 characters or fewer.");

/**
 * The audience is always resolved server-side: "all" loads every customer with
 * a phone from Medusa; "selected" accepts customer IDs only (never phones) and
 * looks their numbers up here. `expectedRecipients` must match the resolved
 * audience so a stale/forged client can't send to more people than confirmed.
 */
const bodySchema = z.discriminatedUnion("audience", [
  z.object({
    audience: z.literal("all"),
    message: messageSchema,
    expectedRecipients: z.number().int().positive(),
  }),
  z.object({
    audience: z.literal("selected"),
    message: messageSchema,
    expectedRecipients: z.number().int().positive(),
    customerIds: z
      .array(z.string().min(1))
      .min(1, "Select at least one customer.")
      .max(5000, "At most 5000 customers per send."),
  }),
]);

/** GSM 160/segment vs any non-GSM code point → 70/segment (matches the composer). */
function segmentCount(message: string): number {
  const unicode = [...message].some((ch) => (ch.codePointAt(0) ?? 0) > 127);
  return Math.max(1, Math.ceil(message.length / (unicode ? 70 : 160)));
}

/** Recipient count for the "all customers with a phone" audience (ADMIN-only by middleware). */
export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }
  const phones = await listAllCustomerPhones();
  return NextResponse.json({ recipients: phones.length });
}

/** Send a promotional SMS to the resolved audience (ADMIN-only by middleware). */
export async function POST(request: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }
  // Spend guard: a handful of bulk sends per window is plenty for a human.
  const limit = rateLimit(`promo-sms:${clientKey(request)}`, SENDS_PER_WINDOW, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many bulk sends — wait a few minutes before the next campaign." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 422 },
    );
  }
  if (segmentCount(parsed.data.message) > MAX_SEGMENTS) {
    return NextResponse.json(
      { error: `Message is too long — keep it within ${MAX_SEGMENTS} SMS segments.` },
      { status: 422 },
    );
  }

  const phones =
    parsed.data.audience === "all"
      ? await listAllCustomerPhones()
      : await getCustomerPhonesByIds(parsed.data.customerIds);
  if (phones.length === 0) {
    return NextResponse.json(
      { error: "No recipients have a phone number.", sent: 0, failed: 0 },
      { status: 422 },
    );
  }
  // The count the admin confirmed must match what we resolved right now.
  if (phones.length !== parsed.data.expectedRecipients) {
    return NextResponse.json(
      {
        error: `Audience changed since you confirmed (${phones.length} recipients now, you confirmed ${parsed.data.expectedRecipients}). Re-check and send again.`,
      },
      { status: 409 },
    );
  }

  const result = await sendPromotionalSms(phones, parsed.data.message);
  return NextResponse.json({ ...result, recipients: phones.length });
}
