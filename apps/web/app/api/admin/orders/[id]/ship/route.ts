import { NextResponse } from "next/server";
import { z } from "zod";
import { shipOrder } from "@/lib/medusa-admin";

const schema = z.object({
  trackingNumber: z.string().min(1).max(80),
  trackingUrl: z.string().url().optional().or(z.literal("")),
});

/** Mark the order's fulfillment shipped with a tracking number (admin-gated). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Tracking number required" }, { status: 422 });
  }
  try {
    await shipOrder(id, parsed.data.trackingNumber, parsed.data.trackingUrl || undefined);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
