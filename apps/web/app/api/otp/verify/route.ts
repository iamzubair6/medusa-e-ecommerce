import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@ecom/cms";
import { setPhoneSession } from "@/lib/phone-session";
import { loginOrCreateByPhone } from "@/lib/customer-auth";
import { grantPhoneReward } from "@/lib/phone-reward";
import { getCartId } from "@/lib/cart-cookie";
import { applyPromotion } from "@/lib/medusa-store";

const schema = z.object({ phone: z.string().min(6).max(20), code: z.string().length(6) });

/** Verify OTP → auto-create + log in a real customer (passwordless).
 *  When the phone-reward is enabled, also issues the caller's personal
 *  one-time promo code and applies it to their cart (both best-effort). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 422 });

  const phone = parsed.data.phone.trim();
  const ok = await verifyOtp(phone, parsed.data.code);
  if (!ok) return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });

  await setPhoneSession(phone); // verified-phone hint (also used for checkout autofill)
  const login = await loginOrCreateByPhone(phone); // full customer session

  const reward = await grantPhoneReward(phone);
  if (reward) {
    const cartId = await getCartId().catch(() => undefined);
    if (cartId) await applyPromotion(cartId, reward.code).catch(() => undefined);
  }
  return NextResponse.json({ ok: true, loggedIn: login.ok, reward });
}
