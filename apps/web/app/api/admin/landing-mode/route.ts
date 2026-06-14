import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { landingModeSchema } from "@/lib/landing-mode";

/** Save the per-landing-page render mode map (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = landingModeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  await setSiteSetting("landingMode", parsed.data);
  return NextResponse.json({ ok: true });
}
