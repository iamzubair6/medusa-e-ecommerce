import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { addAddress } from "@/lib/customer-auth";
import { addressSchema } from "@/lib/address-schema";

export async function POST(request: Request) {
  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid address" }, { status: 422 });
  const ok = await addAddress(parsed.data);
  if (!ok) return NextResponse.json({ error: "Could not save address" }, { status: 400 });
  revalidatePath("/account");
  return NextResponse.json({ ok: true }, { status: 201 });
}
