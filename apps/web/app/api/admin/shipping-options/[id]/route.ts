import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateShippingRate } from "@/lib/medusa-admin";

const schema = z.object({ amount: z.number().int().min(0).max(100000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 422 });
  }
  try {
    await updateShippingRate(id, parsed.data.amount);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
