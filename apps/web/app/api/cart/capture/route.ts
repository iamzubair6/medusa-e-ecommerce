import { NextResponse } from "next/server";
import { z } from "zod";
import { upsertAbandonedCart } from "@ecom/cms";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  cartId: z.string().min(1).max(120),
  email: z.string().email().max(200),
  itemCount: z.number().int().min(0).max(999),
  total: z.string().max(40),
  items: z
    .array(
      z.object({
        title: z.string().max(200),
        quantity: z.number().int().min(0).max(999),
        thumbnail: z.string().max(600).optional(),
      }),
    )
    .max(50),
});

/**
 * Capture an in-progress cart + email at checkout so it can be recovered if the
 * order isn't completed. Idempotent per cartId (upsert). Public, rate-limited.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`cart-capture:${clientKey(request)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 422 });
  try {
    await upsertAbandonedCart({ ...parsed.data, email: parsed.data.email.toLowerCase() });
  } catch {
    /* best-effort — never block checkout */
  }
  return NextResponse.json({ ok: true });
}
