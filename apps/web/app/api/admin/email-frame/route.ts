import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { emailFrameSchema } from "@/lib/email-frame";

/** Save the shared email frame content (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = emailFrameSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid frame" }, { status: 422 });
  }
  await setSiteSetting("emailFrame", parsed.data);
  return NextResponse.json({ ok: true });
}
