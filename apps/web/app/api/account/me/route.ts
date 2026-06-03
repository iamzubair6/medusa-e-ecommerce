import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/customer-auth";

/** Lightweight auth-state probe for the client navbar (cookie presence only). */
export async function GET() {
  return NextResponse.json({ loggedIn: await isLoggedIn() }, { headers: { "Cache-Control": "no-store" } });
}
