import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartId, setCartId } from "@/lib/cart-cookie";
import { addLineItem, createCart, getCart, medusaConfigured } from "@/lib/medusa-store";

const schema = z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(20) });

/** Add a line item, creating the cart on first add. */
export async function POST(request: Request) {
  if (!medusaConfigured()) {
    return NextResponse.json({ error: "Store backend unavailable" }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    let id = await getCartId();
    if (id && !(await getCart(id))) id = undefined; // stale cookie
    if (!id) {
      id = await createCart();
      await setCartId(id);
    }
    const cart = await addLineItem(id, parsed.data.variantId, parsed.data.quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
