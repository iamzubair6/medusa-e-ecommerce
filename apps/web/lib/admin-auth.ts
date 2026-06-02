import "server-only";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

/** The opaque session value set after a successful login (httpOnly cookie). */
function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

/** Verify the submitted password against ADMIN_PASSWORD. */
export function verifyPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  return !!expected && password === expected;
}

/** The value to store in the session cookie. */
export function sessionValue(): string {
  return sessionSecret();
}

/** Whether the current request carries a valid admin session. */
export async function isAuthed(): Promise<boolean> {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === sessionSecret();
}
