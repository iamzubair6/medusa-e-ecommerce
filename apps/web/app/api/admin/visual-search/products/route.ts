import { NextResponse } from "next/server";
import { countProductEmbeddings } from "@ecom/cms";
import { fetchProductsForIndex } from "@/lib/commerce";

/** Products to (re)index + current indexed count. Admin-gated by middleware. */
export async function GET() {
  const [products, indexed] = await Promise.all([fetchProductsForIndex(100), countProductEmbeddings()]);
  return NextResponse.json({ products, indexed });
}
