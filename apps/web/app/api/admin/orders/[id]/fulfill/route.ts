import { NextResponse } from "next/server";
import { fulfillOrder } from "@/lib/medusa-admin";

/** Create a fulfillment for all items in the order (admin-gated). */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await fulfillOrder(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
