import { NextResponse } from "next/server";
import sharp from "sharp";
import { createVisualSearchQuery, pruneVisualSearchQueries, type VisualQueryPart } from "@ecom/cms";
import { EMBED_DIM, embedBufferServer } from "@/lib/embedding-server";
import { detectQueryContext } from "@/lib/garment-detect";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const STORED_SIZE = 640;

// A cold instance loads the CLIP model on the first search (~10–30s).
export const maxDuration = 60;

/** Only plain public http(s) URLs — no localhost/private hosts. */
function safeImageUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]"
  ) {
    return null;
  }
  return url;
}

async function fetchImageBuffer(url: URL): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
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
    const body = (await request.json().catch(() => null)) as { url?: string } | null;
    const url = typeof body?.url === "string" ? safeImageUrl(body.url.trim()) : null;
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

  // Garment hotspots + division (best-effort — a search works without them).
  let division: string | undefined;
  let parts: VisualQueryPart[] = [];
  try {
    const ctx = await detectQueryContext(stored);
    division = ctx.division;
    parts = ctx.parts;
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
