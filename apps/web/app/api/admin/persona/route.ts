import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { personaSchema } from "@/lib/persona";

/** Save the persona section config (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = personaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid persona config" }, { status: 422 });
  }
  await setSiteSetting("persona", parsed.data);
  return NextResponse.json({ ok: true });
}
