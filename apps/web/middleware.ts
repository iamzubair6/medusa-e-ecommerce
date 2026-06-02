import { NextResponse, type NextRequest } from "next/server";

const ADMIN_COOKIE = "admin_session";

/**
 * Gate /admin behind the session cookie. The login page and login API are
 * exempt. Cookie value is compared to ADMIN_SESSION_SECRET (available to
 * middleware at runtime).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login" || pathname === "/api/admin/login";
  if (isLogin) return NextResponse.next();

  const authed = request.cookies.get(ADMIN_COOKIE)?.value === process.env.ADMIN_SESSION_SECRET;
  if (!authed) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
