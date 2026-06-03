import { NextResponse } from "next/server";
import { z } from "zod";
import { registerCustomer } from "@/lib/customer-auth";

const schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(60),
  lastName: z.string().min(1).max(60),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 422 });
  }
  const result = await registerCustomer(parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
