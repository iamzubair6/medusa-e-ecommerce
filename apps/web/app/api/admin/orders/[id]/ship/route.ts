import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrderDetail, shipOrder } from "@/lib/medusa-admin";
import { sendTemplateEmail } from "@/lib/email";
import { formatOrderId } from "@/lib/order-id";
import { requestOrigin } from "@/lib/origin";

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

    // "Your order shipped" email (admin-editable template) — best-effort.
    const order = await getOrderDetail(id).catch(() => null);
    if (order?.email) {
      await sendTemplateEmail("orderShipped", order.email, {
        orderId: formatOrderId(order.displayId),
        trackingNumber: parsed.data.trackingNumber,
        trackUrl: `${requestOrigin(request)}/track`,
        name: "there",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
