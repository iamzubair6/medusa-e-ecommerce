/**
 * The site origin as the CUSTOMER reached it — so links in emails point at
 * localhost:3200 during local testing and at the live domain in production.
 *
 * Forwarded/Host headers are client-influenced, and this value feeds payment
 * gateway callback URLs and emailed links — so a header host is honored ONLY
 * when it's local or matches the canonical NEXT_PUBLIC_SITE_URL host (Vercel
 * rewrites x-forwarded-host itself, but Render/next start would not).
 */
export function requestOrigin(request: Request): string {
  const canonical = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const canonicalHost = (() => {
    try {
      return canonical ? new URL(canonical).host : "";
    } catch {
      return "";
    }
  })();

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.");
    if (isLocal || host === canonicalHost) {
      const proto = request.headers.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
      return `${proto}://${host}`;
    }
  }
  if (canonical) return canonical.replace(/\/$/, "");
  try {
    return new URL(request.url).origin;
  } catch {
    return "";
  }
}
