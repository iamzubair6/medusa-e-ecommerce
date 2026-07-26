import { NextResponse } from "next/server";
import { getSiteSetting, setSiteSetting } from "@ecom/cms";
import { siteSettingsSchema, parseSiteSettings } from "@/lib/site-settings";

/** Save editable storefront content (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = siteSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  await setSiteSetting("site", parsed.data);
  return NextResponse.json({ ok: true });
}

const partialSchema = siteSettingsSchema.pick({ deliveryLine: true, shippingReturns: true }).partial();

/** Partial update — merges the sent fields into the stored settings (used by
 *  the Shipping page's Delivery content card). */
export async function PATCH(request: Request) {
  const parsed = partialSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 422 });
  }
  const current = parseSiteSettings(await getSiteSetting("site").catch(() => null));
  await setSiteSetting("site", { ...current, ...parsed.data });
  return NextResponse.json({ ok: true });
}
