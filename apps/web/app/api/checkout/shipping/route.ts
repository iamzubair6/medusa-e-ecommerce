import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartId } from "@/lib/cart-cookie";
import { addShippingMethod, listShippingOptions } from "@/lib/medusa-store";

/** List shipping options for the current cart. */
export async function GET() {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  try {
    return NextResponse.json({ options: await listShippingOptions(id) });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

const schema = z.object({ optionId: z.string().min(1) });

/** Select a shipping option. */
export async function POST(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "optionId required" }, { status: 422 });
  try {
    const cart = await addShippingMethod(id, parsed.data.optionId);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
