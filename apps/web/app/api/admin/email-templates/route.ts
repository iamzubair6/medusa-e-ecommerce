import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { EMAIL_TEMPLATE_TYPES, emailTemplatesSchema } from "@/lib/email-templates";
import { sanitizePageHtml } from "@/lib/content-pages";

/** Save the transactional email templates (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = emailTemplatesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid templates" }, { status: 422 });
  }
  // Bodies re-open in a contenteditable editor for every staff role — strip
  // script-capable markup so one editor can't plant XSS for another.
  const clean = { ...parsed.data };
  for (const type of EMAIL_TEMPLATE_TYPES) {
    clean[type] = { ...clean[type], body: sanitizePageHtml(clean[type].body) };
  }
  await setSiteSetting("emailTemplates", clean);
  return NextResponse.json({ ok: true });
}
