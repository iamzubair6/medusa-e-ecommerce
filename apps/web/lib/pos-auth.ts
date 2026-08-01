import "server-only";
import { cookies } from "next/headers";
import { verifySession, type AdminSession } from "./session";

/**
 * POS sessions reuse the admin session token format (same HMAC secret) under a
 * SEPARATE cookie, so a cashier signed into /pos can never reach /admin and an
 * admin panel session doesn't silently open the counter.
 */
export const POS_COOKIE = "pos_session";
export const POS_SESSION_TTL_SECONDS = 60 * 60 * 14; // a full shop day

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

/** The verified POS session for the current request, or null. */
export async function getPosSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySession(store.get(POS_COOKIE)?.value, sessionSecret());
}

/** ADMIN-role POS session only (manual discounts, returns, day reports). */
export async function requirePosAdmin(): Promise<AdminSession | null> {
  const session = await getPosSession();
  return session?.role === "ADMIN" ? session : null;
}
