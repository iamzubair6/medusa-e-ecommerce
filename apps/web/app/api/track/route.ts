import { NextResponse } from "next/server";
import { z } from "zod";
import { adminConfigured, getOrderTracking } from "@/lib/medusa-admin";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  orderNumber: z.coerce.number().int().positive(),
  email: z.string().email(),
});

/** Public order/parcel lookup. Requires order number + matching email. */
export async function POST(request: Request) {
  const limit = rateLimit(`track:${clientKey(request)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  if (!adminConfigured()) {
    return NextResponse.json({ error: "Tracking is unavailable." }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid order number and email." }, { status: 422 });
  }

  const order = await getOrderTracking(parsed.data.orderNumber, parsed.data.email);
  // Same shape whether found or not — don't leak which field was wrong.
  return NextResponse.json({ order });
}
