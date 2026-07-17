import { NextResponse } from "next/server";
import { rankByVector, similarToProduct } from "@/lib/visual-search";
import { embedBufferServer } from "@/lib/embedding-server";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Visual search by an uploaded image. The image is embedded HERE with the same
 * descriptor the index uses — the old client-computed vectors were produced by
 * a different downscaler and never matched the index cleanly.
 */
export async function POST(request: Request) {
  const limit = rateLimit(`vsearch:${clientKey(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }
  const form = await request.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "An image file is required." }, { status: 422 });
  }
  if (image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image is too large (max 8 MB)." }, { status: 422 });
  }
  const vector = await embedBufferServer(Buffer.from(await image.arrayBuffer()));
  if (!vector) {
    return NextResponse.json({ error: "Could not read that image — try a JPG/PNG/WebP." }, { status: 422 });
  }
  const results = await rankByVector(vector, 24);
  return NextResponse.json({ results });
}

/** Visual search relative to an indexed product (?productId=...). */
export async function GET(request: Request) {
  const limit = rateLimit(`vsearch:${clientKey(request)}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many searches." }, { status: 429 });
  }
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 422 });
  const results = await similarToProduct(productId, 24);
  return NextResponse.json({ results });
}
