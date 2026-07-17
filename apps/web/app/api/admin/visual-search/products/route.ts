import { NextResponse } from "next/server";
import { countProductEmbeddings } from "@ecom/cms";
import { fetchProductsForIndex } from "@/lib/commerce";
import { INDEX_LIMIT } from "@/lib/visual-search";

/** Products to (re)index + current indexed count. Admin-gated by middleware. */
export async function GET() {
  const [products, indexed] = await Promise.all([fetchProductsForIndex(INDEX_LIMIT), countProductEmbeddings()]);
  return NextResponse.json({ products, indexed });
}
