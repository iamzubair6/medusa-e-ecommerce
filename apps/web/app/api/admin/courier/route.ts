import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { courierSettingsSchema } from "@/lib/courier-settings";

/** Save the delivery-partner choice (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = courierSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  await setSiteSetting("courier", parsed.data);
  return NextResponse.json({ ok: true });
}
