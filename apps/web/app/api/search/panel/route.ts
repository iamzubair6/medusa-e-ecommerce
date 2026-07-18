import { NextResponse } from "next/server";
import { DIVISION_HANDLES } from "@/lib/commerce";
import { buildSearchPanel } from "@/lib/search-panel";

export const revalidate = 300;

/** Discovery content for the search dropdown, per division tab. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("division") ?? "women";
  const division = (DIVISION_HANDLES as readonly string[]).includes(raw) ? raw : "women";
  const panel = await buildSearchPanel(division);
  return NextResponse.json(panel);
}
