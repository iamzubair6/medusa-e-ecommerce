import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { createVisualSearchQuery, pruneVisualSearchQueries, type VisualQueryPart } from "@ecom/cms";
import { EMBED_DIM, embedBufferServer } from "@/lib/embedding-server";
import { detectQueryContext } from "@/lib/garment-detect";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const STORED_SIZE = 640;
/** Hotspots/division are best-effort extras — never let a cold model eat the whole budget. */
const DETECT_TIMEOUT_MS = 25_000;

// A cold instance loads the CLIP model on the first search (~10–30s).
export const maxDuration = 60;

const urlBodySchema = z.object({ url: z.string().trim().url().max(2048) });

/** Private / link-local / reserved ranges an image link must never reach (SSRF). */
function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    // v4-mapped v6 → recheck the embedded v4
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
 * Resolve + vet a pasted image link: public http(s) only, and the hostname must
 * resolve to a public IP (blocks DNS-rebinding names, raw/encoded private IPs,
 * cloud metadata hosts). Redirects are refused at fetch time.
 */
async function safeImageUrl(raw: string): Promise<URL | null> {
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

async function fetchImageBuffer(url: URL): Promise<Buffer | null> {
  try {
    // redirect:"error" — a vetted public URL must not 302 us onto an internal host.
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

/**
 * Create a persistent image-search query: the photo is resized + stored with
 * its CLIP vector so results live at a shareable /search?resourceId=… URL.
 * Accepts multipart (`image` file) or JSON (`{ url }` — the paste-a-link and
 * sample-style paths).
 */
export async function POST(request: Request) {
  const limit = rateLimit(`vsearch:${clientKey(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }

  let raw: Buffer | null = null;
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const image = form?.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return NextResponse.json({ error: "An image file is required." }, { status: 422 });
    }
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 422 });
    }
    raw = Buffer.from(await image.arrayBuffer());
  } else {
    const body = urlBodySchema.safeParse(await request.json().catch(() => null));
    const url = body.success ? await safeImageUrl(body.data.url) : null;
    if (!url) {
      return NextResponse.json({ error: "Paste a valid image link (https://…)." }, { status: 422 });
    }
    raw = await fetchImageBuffer(url);
    if (!raw) {
      return NextResponse.json({ error: "Couldn't load an image from that link." }, { status: 422 });
    }
  }

  // Normalize whatever arrived (HEIC/webp/PNG…) into a compact stored JPEG.
  let stored: Buffer;
  try {
    stored = await sharp(raw)
      .rotate()
      .resize(STORED_SIZE, STORED_SIZE, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Could not read that image — try a JPG/PNG/WebP." }, { status: 422 });
  }

  const vector = await embedBufferServer(stored);
  if (!vector) {
    return NextResponse.json({ error: "Could not read that image — try a JPG/PNG/WebP." }, { status: 422 });
  }

  // Garment hotspots + division (best-effort — a search works without them,
  // and a cold detector must not consume the route's whole time budget).
  let division: string | undefined;
  let parts: VisualQueryPart[] = [];
  try {
    const ctx = await Promise.race([
      detectQueryContext(stored),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), DETECT_TIMEOUT_MS)),
    ]);
    if (ctx) {
      division = ctx.division;
      parts = ctx.parts;
    }
  } catch {
    /* detection is optional */
  }

  const record = await createVisualSearchQuery({
    image: new Uint8Array(stored),
    division,
    dim: EMBED_DIM,
    vector,
    parts,
  });
  pruneVisualSearchQueries().catch(() => {});

  return NextResponse.json({ resourceId: record.id, division: division ?? null });
}
