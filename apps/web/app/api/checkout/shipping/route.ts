import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteSetting } from "@ecom/cms";
import { getCartId } from "@/lib/cart-cookie";
import { addShippingMethod, listShippingOptions } from "@/lib/medusa-store";
import { parseCheckoutConfig, shippingOverrideFor } from "@/lib/checkout-config";
import type { ShippingOptionView } from "@/lib/cart-types";

/** List shipping options for the current cart, filtered/labelled by the admin
 *  "checkout" override (hidden options dropped, notes attached). */
export async function GET() {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  try {
    const [options, raw] = await Promise.all([
      listShippingOptions(id),
      getSiteSetting("checkout").catch(() => null),
    ]);
    const config = parseCheckoutConfig(raw);
    const visible: ShippingOptionView[] = [];
    for (const o of options) {
      const ov = shippingOverrideFor(config, o.id);
      if (ov && !ov.enabled) continue; // admin-hidden
      visible.push({ ...o, note: ov?.note || undefined });
    }
    return NextResponse.json({ options: visible });
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
