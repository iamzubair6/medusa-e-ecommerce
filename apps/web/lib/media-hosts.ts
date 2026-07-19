/**
 * Hosts our own uploads live on (mirrors next.config image remotePatterns).
 * Used to reject arbitrary external image URLs in user-submitted content —
 * a review photo must be one WE stored via /api/reviews/upload.
 */
const ALLOWED_SUFFIXES = [".r2.dev", ".amazonaws.com", ".medusajs.com"];
const ALLOWED_HOSTS = ["localhost", "127.0.0.1"];

/** True only for http(s) URLs whose host is one of our storage hosts. */
export function isOwnMediaUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.includes(host) || ALLOWED_SUFFIXES.some((s) => host.endsWith(s));
}
