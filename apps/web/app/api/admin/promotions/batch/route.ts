import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { ensurePersonalPromo } from "@/lib/medusa-admin";
import { addBatchPrefix } from "@/lib/public-promos";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const schema = z
  .object({
    prefix: z
      .string()
      .min(2)
      .max(12)
      .regex(/^[A-Z0-9]+$/i, "Letters/numbers only")
      .transform((s) => s.toUpperCase()),
    count: z.number().int().min(1).max(1000),
    kind: z.enum(["percentage", "fixed"]),
    value: z.number().int().min(1).max(100_000),
  })
  .refine((d) => d.kind !== "percentage" || d.value <= 100, {
    message: "Percentage cannot exceed 100.",
    path: ["value"],
  });

/** Generate a batch of unique ONE-TIME promo codes (printed-card campaigns,
 *  #140). Codes are PREFIX-XXXXXX, each capped at a single redemption, never
 *  listed publicly. Returns the codes for CSV download. ADMIN-gated. */
export async function POST(request: Request) {
  const limit = rateLimit(`promo-batch:${clientKey(request)}`, 3, 10 * 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many batches — wait a few minutes." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  const { prefix, count, kind, value } = parsed.data;

  // Random 6-char codes; the prefix namespaces the campaign. ensurePersonalPromo
  // is idempotent, so an accidental duplicate simply reuses the existing promo.
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(`${prefix}-${crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase()}`);
  }

  const list = [...codes];
  const failed: string[] = [];
  const CONCURRENCY = 10;
  for (let i = 0; i < list.length; i += CONCURRENCY) {
    await Promise.all(
      list.slice(i, i + CONCURRENCY).map((code) =>
        ensurePersonalPromo(code, kind, value).catch(() => {
          failed.push(code);
        }),
      ),
    );
  }

  const created = list.filter((c) => !failed.includes(c));
  await addBatchPrefix(prefix).catch(() => undefined); // folds the codes in the admin list
  return NextResponse.json({ codes: created, failed: failed.length });
}
