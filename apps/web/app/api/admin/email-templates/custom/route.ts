import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { customEmailTemplatesSchema } from "@/lib/email-templates";

/** Save the owner-created email templates (full list; admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = customEmailTemplatesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid templates" }, { status: 422 });
  }
  const ids = new Set(parsed.data.map((t) => t.id));
  if (ids.size !== parsed.data.length) {
    return NextResponse.json({ error: "Duplicate template ids" }, { status: 422 });
  }
  await setSiteSetting("customEmailTemplates", parsed.data);
  return NextResponse.json({ ok: true });
}
