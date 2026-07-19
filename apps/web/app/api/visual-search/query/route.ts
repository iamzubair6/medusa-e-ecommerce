import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { createVisualSearchQuery, pruneVisualSearchQueries, type VisualQueryPart } from "@ecom/cms";
import { catalogDivisions } from "@/lib/commerce";
import { EMBED_DIM, embedBufferServer } from "@/lib/embedding-server";
import { detectQueryContext } from "@/lib/garment-detect";
import { MAX_IMAGE_BYTES, fetchSafeImage } from "@/lib/safe-image-fetch";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const STORED_SIZE = 640;
/** Hotspots/division are best-effort extras — never let a cold model eat the whole budget. */
const DETECT_TIMEOUT_MS = 25_000;

// A cold instance loads the CLIP model on the first search (~10–30s).
export const maxDuration = 60;

const urlBodySchema = z.object({ url: z.string().trim().url().max(2048) });

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
    if (!body.success) {
      return NextResponse.json({ error: "Paste a valid image link (https://…)." }, { status: 422 });
    }
    raw = await fetchSafeImage(body.data.url);
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
  // Only auto-scope to a division this store actually carries — a client
  // selling e.g. only beauty must not get a phantom women/men filter.
  if (division) {
    const present = await catalogDivisions().catch(() => null);
    if (present && !present.has(division)) division = undefined;
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
