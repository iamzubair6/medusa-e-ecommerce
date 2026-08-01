import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/session";

const ADMIN_COOKIE = "admin_session";
const POS_COOKIE = "pos_session";

/** Paths that only an ADMIN-role user may reach: user management, plus every
 *  customer API surface (bulk SMS spends money, CSV export + delete touch PII). */
const ADMIN_ONLY = [
  "/admin/users",
  "/api/admin/users",
  "/api/admin/customers",
  // Bulk publish/unpublish/DELETE across the catalog — editors edit one product
  // at a time; mass catalog mutation is an owner action.
  "/api/admin/products/bulk",
];

function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * Gate /admin behind a signed session cookie. The login page and login API are
 * exempt. The cookie is an HMAC-signed token carrying the user's id + role;
 * user-management routes additionally require the ADMIN role.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isLogin) return NextResponse.next();

  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  const isApi = pathname.startsWith("/api/");

  // POS surfaces are gated by their own cookie (any active back-office user;
  // ADMIN-only actions are enforced inside the POS routes themselves).
  if (isUnder(pathname, "/pos") || isUnder(pathname, "/api/pos")) {
    const isPosLogin = pathname === "/pos/login" || pathname === "/api/pos/login";
    if (isPosLogin) return NextResponse.next();
    const posSession = await verifySession(request.cookies.get(POS_COOKIE)?.value, secret);
    if (!posSession) {
      if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const url = request.nextUrl.clone();
      url.pathname = "/pos/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const session = await verifySession(request.cookies.get(ADMIN_COOKIE)?.value, secret);

  if (!session) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // STAFF is a counter-only role — it can never operate the admin panel.
  if (session.role === "STAFF") {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const url = request.nextUrl.clone();
    url.pathname = "/pos";
    return NextResponse.redirect(url);
  }

  if (session.role !== "ADMIN" && ADMIN_ONLY.some((base) => isUnder(pathname, base))) {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/pos/:path*", "/api/pos/:path*"],
};
