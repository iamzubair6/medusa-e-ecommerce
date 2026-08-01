import { NextResponse } from "next/server";
import { z } from "zod";
import { posFindCustomerByPhone } from "@/lib/pos";

const schema = z.object({ phone: z.string().min(6).max(24) });

/** Phone → existing customer (so the counter sale feeds their order history). */
export async function GET(request: Request) {
  const parsed = schema.safeParse({ phone: new URL(request.url).searchParams.get("phone") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the customer's phone number." }, { status: 422 });
  }
  try {
    const customer = await posFindCustomerByPhone(parsed.data.phone);
    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: "Lookup failed — try again." }, { status: 502 });
  }
}
