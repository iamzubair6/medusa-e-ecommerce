import { NextResponse } from "next/server";
import { z } from "zod";
import { clearCartId, getCartId } from "@/lib/cart-cookie";
import { completeCart, initPayment, setCartMetadata } from "@/lib/medusa-store";

const schema = z.object({ method: z.enum(["cod", "card"]).optional() });

/** Set the payment method (default Cash on Delivery), then complete the order.
 *  Both use Medusa's manual provider for now — funds are collected on delivery
 *  (COD) or will route to Stripe when wired (card). */
export async function POST(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const method = parsed.success ? (parsed.data.method ?? "cod") : "cod";
  try {
    await setCartMetadata(id, { payment_method: method }).catch(() => undefined);
    await initPayment(id);
    const result = await completeCart(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    await clearCartId();
    return NextResponse.json({ order: result.order, method });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
