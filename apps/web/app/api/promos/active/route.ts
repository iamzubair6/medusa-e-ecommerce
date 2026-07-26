import { NextResponse } from "next/server";
import { getPromoSuggestions } from "@/lib/active-promos";

/** Public: currently advertisable promo codes (marketing info by design —
 *  personal/bundle/persona codes are filtered out server-side). */
export async function GET() {
  const suggestions = await getPromoSuggestions();
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
