import { NextResponse } from "next/server";
import { similarProductCards } from "@/lib/visual-search";
import { clientKey, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

/** Similar-product CARDS for the Shop Similar modal's initial grid (?productId=). */
export async function GET(request: Request) {
  const limit = rateLimit(`similar:${clientKey(request)}`, 60, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const productId = new URL(request.url).searchParams.get("productId");
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 422 });
  const products = await similarProductCards(productId, 24);
  return NextResponse.json({ products });
}
