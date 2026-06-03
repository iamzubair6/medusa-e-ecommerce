import { NextResponse } from "next/server";
import { z } from "zod";
import { rankByVector, similarToProduct } from "@/lib/visual-search";
import { EMBED_DIM } from "@/lib/embedding-client";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const uploadSchema = z.object({
  vector: z.array(z.number()).length(EMBED_DIM),
  limit: z.number().int().min(1).max(50).optional(),
});

/** Visual search by an uploaded image's (client-computed) vector. */
export async function POST(request: Request) {
  const limit = rateLimit(`vsearch:${clientKey(request)}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });
  }
  const parsed = uploadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid image vector is required." }, { status: 422 });
  }
  const results = await rankByVector(parsed.data.vector, parsed.data.limit ?? 24);
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
