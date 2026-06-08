import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@ecom/cms";
import { sendOtp, otpMockMode } from "@/lib/otp-sms";

const schema = z.object({ phone: z.string().min(6).max(20) });

/** Generate + "send" a 4-digit OTP for a phone. In mock mode the code is returned. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid phone number" }, { status: 422 });

  const phone = parsed.data.phone.trim();
  try {
    const { code } = await requestOtp(phone);
    await sendOtp(phone, code);
    // Demo affordance: surface the code while SMS is mocked (no real gateway yet).
    return NextResponse.json({ ok: true, ...(otpMockMode() ? { devCode: code } : {}) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
