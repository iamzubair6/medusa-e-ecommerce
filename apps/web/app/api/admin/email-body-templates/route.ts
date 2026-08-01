import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { emailBodyTemplatesSchema, PLAIN_BODY_TEMPLATE_ID } from "@/lib/email-body-templates";

/**
 * Save the email body-template library (full list; admin-gated by middleware).
 * NOT run through sanitizePageHtml — skeletons are full email documents whose
 * <style> blocks must survive; they only ever open in the sandboxed preview
 * iframe or the HTML-source editor.
 */
export async function POST(request: Request) {
  const parsed = emailBodyTemplatesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid templates" }, { status: 422 });
  }
  const ids = new Set(parsed.data.templates.map((t) => t.id));
  if (ids.size !== parsed.data.templates.length) {
    return NextResponse.json({ error: "Duplicate template ids" }, { status: 422 });
  }
  if (!ids.has(PLAIN_BODY_TEMPLATE_ID)) {
    return NextResponse.json({ error: 'The "Plain" template must stay — it is the safe fallback.' }, { status: 422 });
  }
  await setSiteSetting("emailBodyTemplates", parsed.data);
  return NextResponse.json({ ok: true });
}
