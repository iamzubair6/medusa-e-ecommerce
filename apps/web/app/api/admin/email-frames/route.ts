import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { emailFramesSchema } from "@/lib/email-frames";

/** Save the email frames library (full list; admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = emailFramesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid frames" }, { status: 422 });
  }
  const ids = new Set(parsed.data.frames.map((f) => f.id));
  if (ids.size !== parsed.data.frames.length) {
    return NextResponse.json({ error: "Duplicate frame ids" }, { status: 422 });
  }
  if (!ids.has(parsed.data.defaultFrameId)) {
    return NextResponse.json({ error: "The default frame must be one of the saved frames" }, { status: 422 });
  }
  await setSiteSetting("emailFrames", parsed.data);
  return NextResponse.json({ ok: true });
}
