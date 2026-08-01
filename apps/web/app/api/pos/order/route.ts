import { NextResponse } from "next/server";
import { posFindOrderByNumber } from "@/lib/pos";
import { parseOrderId } from "@/lib/order-id";

/** Receipt-number lookup (MSN-00042 / 42) for reprints and returns. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("number") ?? "";
  const displayId = parseOrderId(raw);
  if (!displayId) {
    return NextResponse.json({ error: "Enter the order number from the receipt." }, { status: 422 });
  }
  try {
    const order = await posFindOrderByNumber(displayId);
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Lookup failed — try again." }, { status: 502 });
  }
}
