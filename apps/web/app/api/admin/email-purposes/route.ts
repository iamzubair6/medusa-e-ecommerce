import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { EMAIL_TEMPLATE_TYPES } from "@/lib/email-templates";
import { emailPurposesSchema } from "@/lib/email-purposes";
import { sanitizePageHtml } from "@/lib/content-pages";

/** Save the per-purpose email configs (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = emailPurposesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid purposes" }, { status: 422 });
  }
  // Content re-opens in a contenteditable editor for every staff role — strip
  // script-capable markup so one editor can't plant XSS for another. (Design
  // skeletons with <style> belong in body templates, which are not sanitized.)
  const clean = { ...parsed.data };
  for (const type of EMAIL_TEMPLATE_TYPES) {
    clean[type] = { ...clean[type], content: sanitizePageHtml(clean[type].content) };
  }
  await setSiteSetting("emailPurposes", clean);
  return NextResponse.json({ ok: true });
}
