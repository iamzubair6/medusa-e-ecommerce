import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { visualSearchSettingsSchema } from "@/lib/visual-search-settings";

/** Save the Search-By-Image behavior settings (garment → category mapping). */
export async function POST(request: Request) {
  const parsed = visualSearchSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid settings" },
      { status: 422 },
    );
  }
  await setSiteSetting("visualSearch", parsed.data);
  return NextResponse.json({ ok: true });
}
