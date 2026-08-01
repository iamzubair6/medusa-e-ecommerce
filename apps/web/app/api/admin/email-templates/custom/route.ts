import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { campaignPresetsSchema } from "@/lib/email-campaigns";

/** Save the campaign content presets (full list; admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = campaignPresetsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid presets" }, { status: 422 });
  }
  const ids = new Set(parsed.data.map((t) => t.id));
  if (ids.size !== parsed.data.length) {
    return NextResponse.json({ error: "Duplicate preset ids" }, { status: 422 });
  }
  await setSiteSetting("customEmailTemplates", parsed.data);
  return NextResponse.json({ ok: true });
}
