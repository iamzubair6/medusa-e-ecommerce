import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAdmin, countAdminUsers, createAdminUser, markAdminLogin } from "@ecom/cms/admin-users";
import { ADMIN_COOKIE, SESSION_TTL_SECONDS } from "@/lib/admin-auth";
import { signSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not set");
  return secret;
}

/**
 * First-run bootstrap: when no admin users exist yet, the legacy
 * ADMIN_PASSWORD + ADMIN_BOOTSTRAP_EMAIL can create the first ADMIN account.
 * Once any user exists, this path is dead — login is per-user only.
 */
async function bootstrapFirstAdmin(email: string, password: string) {
  if ((await countAdminUsers()) > 0) return null;
  const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").toLowerCase();
  const bootstrapPassword = process.env.ADMIN_PASSWORD;
  if (!bootstrapEmail || !bootstrapPassword) return null;
  if (email.toLowerCase() !== bootstrapEmail || password !== bootstrapPassword) return null;
  return createAdminUser({
    email: bootstrapEmail,
    name: "Owner",
    password: bootstrapPassword,
    role: "ADMIN",
  });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password required" }, { status: 422 });
  }
  const { email, password } = parsed.data;

  const user = (await authenticateAdmin(email, password)) ?? (await bootstrapFirstAdmin(email, password));
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await markAdminLogin(user.id);

  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession(
    { uid: user.id, email: user.email, name: user.name, role: user.role, exp },
    sessionSecret(),
  );

  const res = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
