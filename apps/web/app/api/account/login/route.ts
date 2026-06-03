import { NextResponse } from "next/server";
import { z } from "zod";
import { loginCustomer } from "@/lib/customer-auth";

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email and password" }, { status: 422 });
  const ok = await loginCustomer(parsed.data.email, parsed.data.password);
  if (!ok) return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
