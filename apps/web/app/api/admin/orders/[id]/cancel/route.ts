import { NextResponse } from "next/server";
import { cancelOrder } from "@/lib/medusa-admin";

/** Cancel an order. Admin-gated by middleware. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await cancelOrder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
