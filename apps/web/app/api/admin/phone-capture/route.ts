import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { phoneCaptureSettingsSchema } from "@/lib/phone-capture-settings";

/** Save the editable phone-capture popup copy (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = phoneCaptureSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  await setSiteSetting("phoneCapture", parsed.data);
  return NextResponse.json({ ok: true });
}
