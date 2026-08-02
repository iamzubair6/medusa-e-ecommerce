import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setSiteSetting } from "@ecom/cms";
import { landingModeSchema } from "@/lib/landing-mode";

/** Save the per-landing-page render mode map (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = landingModeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  await setSiteSetting("landingMode", parsed.data);
  // The landing pages are ISR-cached (`revalidate = 600`) — without an explicit
  // revalidate a mode switch keeps serving the OLD style for up to 10 minutes,
  // and in prod the stale copy can linger per edge region, so one device shows
  // curated while another still shows CMS sections. Purge them all now.
  revalidatePath("/");
  revalidatePath("/pages/[division]", "page");
  return NextResponse.json({ ok: true });
}
