import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@ecom/cms";
import { registerCustomer } from "@/lib/customer-auth";

const schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60).optional(),
  phone: z.string().min(6).max(20),
  code: z.string().length(4),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 422 });
  }
  const { phone, code, email, password, firstName, lastName } = parsed.data;

  // Phone must be OTP-verified before we create the account.
  const verified = await verifyOtp(phone, code);
  if (!verified) return NextResponse.json({ error: "Invalid or expired phone code" }, { status: 401 });

  const result = await registerCustomer({ email, password, firstName, lastName: lastName ?? "", phone });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
