import { NextResponse } from "next/server";
import { getOrderDetail, markDelivered } from "@/lib/medusa-admin";
import { sendTemplateEmail } from "@/lib/email";
import { formatOrderId } from "@/lib/order-id";
import { requestOrigin } from "@/lib/origin";

/** Mark the order delivered (COD cash collected). Admin-gated by middleware. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await markDelivered(id);

    // "Delivered" email (admin-editable template) — best-effort.
    const order = await getOrderDetail(id).catch(() => null);
    if (order?.email) {
      await sendTemplateEmail("orderDelivered", order.email, {
        orderId: formatOrderId(order.displayId),
        trackUrl: `${requestOrigin(request)}/track`,
        name: "there",
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
