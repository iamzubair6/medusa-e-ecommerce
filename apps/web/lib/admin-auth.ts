import "server-only";
import { cookies } from "next/headers";
import { verifySession, type AdminSession } from "./session";

export const ADMIN_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8h

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

/** The verified admin session for the current request, or null. */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value, sessionSecret());
}

/** Whether the current request carries any valid admin session. */
export async function isAuthed(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** The session only if the user is an ADMIN (user management), else null. */
export async function requireAdmin(): Promise<AdminSession | null> {
  const session = await getAdminSession();
  return session?.role === "ADMIN" ? session : null;
}
