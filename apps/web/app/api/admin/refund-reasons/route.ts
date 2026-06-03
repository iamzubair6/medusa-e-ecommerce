import { NextResponse } from "next/server";
import { z } from "zod";
import { createRefundReason } from "@/lib/medusa-admin";

const schema = z.object({ label: z.string().min(1).max(60), description: z.string().max(200).optional() });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Label is required" }, { status: 422 });
  try {
    await createRefundReason(parsed.data.label, parsed.data.description);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
