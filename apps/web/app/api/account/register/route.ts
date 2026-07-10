import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@ecom/cms";
import { registerCustomer } from "@/lib/customer-auth";
import { sendTemplateEmail } from "@/lib/email";
import { requestOrigin } from "@/lib/origin";

const schema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(100),
  firstName: z.string().min(1).max(60),
  lastName: z.string().max(60).optional(),
  phone: z.string().min(6).max(20),
  code: z.string().length(6),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid details" }, { status: 422 });
  }
  const { phone, code, email, password, firstName, lastName } = parsed.data;

  try {
    // Phone must be OTP-verified before we create the account. A correct code
    // stays retryable until expiry, so a backend failure below doesn't burn it.
    const verified = await verifyOtp(phone, code);
    if (!verified) return NextResponse.json({ error: "Invalid or expired phone code" }, { status: 401 });

    const result = await registerCustomer({ email, password, firstName, lastName: lastName ?? "", phone });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // Welcome email (admin-editable template) — best-effort, never blocks signup.
    await sendTemplateEmail("welcome", email, {
      name: firstName,
      trackUrl: `${requestOrigin(request)}/collections/new`,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    // e.g. the commerce backend is unreachable — never a bare 500.
    return NextResponse.json(
      { error: "The store backend is unreachable right now — your code is still valid, try again in a minute." },
      { status: 502 },
    );
  }
}
