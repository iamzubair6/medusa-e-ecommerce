import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@ecom/cms";
import { setPhoneSession } from "@/lib/phone-session";
import { loginOrCreateByPhone } from "@/lib/customer-auth";

const schema = z.object({ phone: z.string().min(6).max(20), code: z.string().length(4) });

/** Verify OTP → auto-create + log in a real customer (passwordless). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 4-digit code" }, { status: 422 });

  const phone = parsed.data.phone.trim();
  const ok = await verifyOtp(phone, parsed.data.code);
  if (!ok) return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

  await setPhoneSession(phone); // verified-phone hint (also used for checkout autofill)
  const login = await loginOrCreateByPhone(phone); // full customer session
  return NextResponse.json({ ok: true, loggedIn: login.ok });
}
