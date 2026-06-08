import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { siteSettingsSchema } from "@/lib/site-settings";

/** Save editable storefront content (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = siteSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  await setSiteSetting("site", parsed.data);
  return NextResponse.json({ ok: true });
}
