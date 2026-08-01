import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateAdmin, markAdminLogin } from "@ecom/cms/admin-users";
import { POS_COOKIE, POS_SESSION_TTL_SECONDS } from "@/lib/pos-auth";
import { clientKey, rateLimit } from "@/lib/rate-limit";
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

/** Counter sign-in. Any active back-office user (STAFF/EDITOR/ADMIN) can sell;
 *  ADMIN-only counter actions are enforced per route via the session role. */
export async function POST(request: Request) {
  const limited = rateLimit(`pos-login:${clientKey(request)}`, 10, 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attempts — wait a minute." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Email and password required" }, { status: 422 });
  }
  const user = await authenticateAdmin(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await markAdminLogin(user.id);

  const exp = Math.floor(Date.now() / 1000) + POS_SESSION_TTL_SECONDS;
  const token = await signSession(
    { uid: user.id, email: user.email, name: user.name, role: user.role, exp },
    sessionSecret(),
  );

  const res = NextResponse.json({ ok: true, user: { name: user.name, role: user.role } });
  res.cookies.set(POS_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: POS_SESSION_TTL_SECONDS,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(POS_COOKIE);
  return res;
}
