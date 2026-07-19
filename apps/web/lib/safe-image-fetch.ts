import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Max bytes accepted from a remote image (shared with the upload paths). */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Private / link-local / reserved ranges an image link must never reach (SSRF). */
function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]!);
    return (
      v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") ||
      v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb")
    );
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts as [number, number, number, number];
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224 // multicast + reserved
  );
}

/**
 * Resolve + vet a remote image link: public http(s) only, and the hostname must
 * resolve to a public IP (blocks DNS-rebinding names, raw/encoded private IPs,
 * cloud metadata hosts). Returns null when unsafe.
 */
export async function safeImageUrl(raw: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPrivateIp(host) ? null : url;
  try {
    const { address } = await lookup(host);
    return isPrivateIp(address) ? null : url;
  } catch {
    return null;
  }
}

/** Fetch a vetted URL's image bytes (no redirects onto internal hosts, size-capped). */
export async function fetchImageBuffer(url: URL): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: "error" });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length <= MAX_IMAGE_BYTES ? buf : null;
  } catch {
    return null;
  }
}

/** Vet a raw URL string and fetch its image bytes in one step (null when unsafe/unreachable). */
export async function fetchSafeImage(raw: string): Promise<Buffer | null> {
  const url = await safeImageUrl(raw);
  return url ? fetchImageBuffer(url) : null;
}
