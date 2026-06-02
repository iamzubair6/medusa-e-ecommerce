import { NextResponse } from "next/server";
import { getCartId } from "@/lib/cart-cookie";
import { getCart, medusaConfigured } from "@/lib/medusa-store";

/** Current cart (or null). */
export async function GET() {
  if (!medusaConfigured()) return NextResponse.json({ cart: null });
  const id = await getCartId();
  if (!id) return NextResponse.json({ cart: null });
  const cart = await getCart(id);
  return NextResponse.json({ cart });
}
