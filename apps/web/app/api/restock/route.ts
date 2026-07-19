import { NextResponse } from "next/server";
import { z } from "zod";
import { createRestockSubscription } from "@ecom/cms";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  productHandle: z.string().min(1).max(160),
  productTitle: z.string().min(1).max(200),
  variantId: z.string().min(1).max(120),
  size: z.string().min(1).max(40),
  email: z.string().email().max(200),
});

/** Subscribe an email to a sold-out variant's restock (public, rate-limited). */
export async function POST(request: Request) {
  const limit = rateLimit(`restock:${clientKey(request)}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many requests — try again shortly." }, { status: 429 });
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
  }
  try {
    await createRestockSubscription({ ...parsed.data, email: parsed.data.email.toLowerCase() });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Couldn't save that — please try again." }, { status: 500 });
  }
}
