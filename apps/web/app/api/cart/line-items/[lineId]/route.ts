import { NextResponse } from "next/server";
import { z } from "zod";
import { getCartId } from "@/lib/cart-cookie";
import { removeLineItem, updateLineItem } from "@/lib/medusa-store";

const updateSchema = z.object({ quantity: z.number().int().min(1).max(20) });

export async function POST(request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "quantity required" }, { status: 422 });
  try {
    const cart = await updateLineItem(id, lineId, parsed.data.quantity);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ lineId: string }> }) {
  const { lineId } = await params;
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  try {
    const cart = await removeLineItem(id, lineId);
    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
