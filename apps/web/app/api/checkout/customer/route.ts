import { NextResponse } from "next/server";
import { z } from "zod";
import { captureGuestLead } from "@ecom/cms";
import { getCartId } from "@/lib/cart-cookie";
import { setCartCustomer } from "@/lib/medusa-store";

const addressSchema = z.object({
  first_name: z.string().min(1).max(60),
  last_name: z.string().min(1).max(60),
  address_1: z.string().min(1).max(120),
  city: z.string().min(1).max(60),
  postal_code: z.string().min(1).max(20),
  country_code: z.string().length(2),
  phone: z.string().max(30).optional(),
});

const schema = z.object({ email: z.string().email(), address: addressSchema });

/** Save email + shipping address on the cart AND capture a guest lead. */
export async function POST(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });

  // Capture the guest as a lead first — so abandoned checkouts are recorded
  // even if the Medusa update or later steps fail.
  await captureGuestLead({
    email: parsed.data.email,
    phone: parsed.data.address.phone,
    capturedFields: { ...parsed.data.address },
    cartId: id,
    source: "checkout",
  }).catch(() => undefined);

  try {
    const cart = await setCartCustomer(id, parsed.data.email, parsed.data.address);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
