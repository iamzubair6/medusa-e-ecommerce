import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { campaignPresetsSchema } from "@/lib/email-campaigns";
import { isFullHtmlDocument } from "@/lib/email-templates";
import { sanitizePageHtml } from "@/lib/content-pages";

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
  // Fragment content re-enters the contenteditable visual editor on other
  // admins' machines — strip active markup there (same guard as purposes).
  // Full documents only ever open in the source textarea / sandboxed preview,
  // and legitimately need their <style> blocks, so they pass through.
  const presets = parsed.data.map((p) => ({
    ...p,
    content: isFullHtmlDocument(p.content) ? p.content : sanitizePageHtml(p.content),
  }));
  await setSiteSetting("customEmailTemplates", presets);
  return NextResponse.json({ ok: true });
}
