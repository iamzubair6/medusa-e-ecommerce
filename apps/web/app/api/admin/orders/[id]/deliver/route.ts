import { NextResponse } from "next/server";
import { markDelivered } from "@/lib/medusa-admin";

/** Mark the order delivered (COD cash collected). Admin-gated by middleware. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await markDelivered(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
