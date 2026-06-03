import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteAddress, updateAddress } from "@/lib/customer-auth";
import { addressSchema } from "@/lib/address-schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid address" }, { status: 422 });
  const ok = await updateAddress(id, parsed.data);
  if (!ok) return NextResponse.json({ error: "Could not update address" }, { status: 400 });
  revalidatePath("/account");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await deleteAddress(id);
  if (!ok) return NextResponse.json({ error: "Could not delete address" }, { status: 400 });
  revalidatePath("/account");
  return NextResponse.json({ ok: true });
}
