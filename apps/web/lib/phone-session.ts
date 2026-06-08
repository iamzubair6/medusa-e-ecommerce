import "server-only";
import { cookies } from "next/headers";
import crypto from "node:crypto";

/**
 * Lightweight "verified phone" session (separate from the Medusa customer JWT).
 * Set after a successful OTP verify; used for the first-visit capture + checkout
 * phone auto-fill. Signed with HMAC so it can't be forged.
 */
const COOKIE = "maison_phone";
const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-phone-secret";

const sign = (phone: string) => crypto.createHmac("sha256", SECRET).update(phone).digest("base64url");

export async function setPhoneSession(phone: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, `${phone}.${sign(phone)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function getPhoneSession(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return null;
  const phone = raw.slice(0, idx);
  const sig = raw.slice(idx + 1);
  return sign(phone) === sig ? phone : null;
}

export async function clearPhoneSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
