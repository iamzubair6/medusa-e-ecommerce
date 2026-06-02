import { NextResponse } from "next/server";
import { clearCartId, getCartId } from "@/lib/cart-cookie";
import { completeCart, initPayment } from "@/lib/medusa-store";

/** Initialize payment (manual provider) and complete the cart into an order. */
export async function POST() {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  try {
    await initPayment(id);
    const result = await completeCart(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    await clearCartId();
    return NextResponse.json({ order: result.order });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
