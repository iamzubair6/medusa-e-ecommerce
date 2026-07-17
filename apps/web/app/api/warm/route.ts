import { NextResponse } from "next/server";
import { getSiteSetting } from "@ecom/cms";

export const dynamic = "force-dynamic";

/**
 * Keep-warm ping (hit by .github/workflows/keep-warm.yml every few minutes).
 * Touches the two things that sleep on free tiers so real visitors never pay
 * the wake-up cost: the Neon CMS database and the Render Medusa backend.
 */
export async function GET() {
  const backend = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "";
  const [cms, medusa] = await Promise.allSettled([
    getSiteSetting("site"),
    backend
      ? fetch(`${backend}/health`, { cache: "no-store", signal: AbortSignal.timeout(8_000) })
      : Promise.reject(new Error("no backend url")),
  ]);
  return NextResponse.json({
    cms: cms.status === "fulfilled" ? "warm" : "error",
    medusa: medusa.status === "fulfilled" ? "warm" : "waking",
  });
}
