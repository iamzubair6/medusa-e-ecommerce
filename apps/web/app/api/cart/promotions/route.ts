import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartId } from "@/lib/cart-cookie";
import { applyPromotion, removePromotion } from "@/lib/medusa-store";

const schema = z.object({ code: z.string().min(1).max(60) });

/** Apply a promo code. Medusa silently ignores invalid codes, so we verify it
 * actually landed and report a clear error otherwise. */
export async function POST(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Code required" }, { status: 422 });
  const code = parsed.data.code.trim();
  try {
    const cart = await applyPromotion(id, code);
    if (!cart.promoCodes.some((c) => c.toLowerCase() === code.toLowerCase())) {
      return NextResponse.json({ error: "That code isn't valid.", cart }, { status: 422 });
    }
    return NextResponse.json({ cart });
  } catch {
    // Medusa rejects unknown/ineligible codes with an error — surface as a
    // friendly 422 rather than a generic gateway error.
    return NextResponse.json({ error: "That code isn't valid or can't be applied." }, { status: 422 });
  }
}

export async function DELETE(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Code required" }, { status: 422 });
  try {
    const cart = await removePromotion(id, parsed.data.code);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
