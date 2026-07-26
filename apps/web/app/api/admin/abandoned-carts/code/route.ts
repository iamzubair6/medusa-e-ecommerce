import { NextResponse } from "next/server";
import { z } from "zod";
import { getAbandonedCart } from "@ecom/cms";
import { recoveryCodeForCart } from "@/lib/recovery-incentive";

const schema = z.object({ id: z.string().min(1).max(120) });

/** The one-time discount code for an abandoned cart — for support to read out
 *  over the phone (creates the promo on first use). Admin-gated by middleware. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "id required" }, { status: 422 });
  const cart = await getAbandonedCart(parsed.data.id);
  if (!cart) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const reward = await recoveryCodeForCart(cart.id);
    if (!reward) {
      return NextResponse.json(
        { error: "Set a recovery discount % above first (it's currently 0)." },
        { status: 409 },
      );
    }
    return NextResponse.json(reward);
  } catch {
    return NextResponse.json({ error: "Could not create the code — is Medusa reachable?" }, { status: 502 });
  }
}
