import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateCustomer } from "@/lib/customer-auth";

const schema = z.object({
  firstName: z.string().min(1).max(60).optional(),
  lastName: z.string().min(1).max(60).optional(),
  phone: z.string().max(30).optional(),
});

export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid details" }, { status: 422 });
  const ok = await updateCustomer(parsed.data);
  if (!ok) return NextResponse.json({ error: "Could not update profile" }, { status: 400 });
  revalidatePath("/account");
  return NextResponse.json({ ok: true });
}
