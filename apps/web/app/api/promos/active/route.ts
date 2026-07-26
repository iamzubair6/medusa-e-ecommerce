import { NextResponse } from "next/server";
import { getCartIncentives } from "@/lib/active-promos";

/** Public: currently advertisable promo codes + free-delivery threshold
 *  (marketing info by design — personal/bundle/persona codes are filtered
 *  out server-side). */
export async function GET() {
  const { suggestions, freeOver } = await getCartIncentives();
  return NextResponse.json(
    { suggestions, freeOver },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
