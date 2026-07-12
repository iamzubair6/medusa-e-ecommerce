import { NextResponse } from "next/server";
import { getOrderDetail, setOrderMetadata, shipOrder } from "@/lib/medusa-admin";
import {
  createConsignment,
  getConsignmentStatus,
  steadfastConfigured,
  steadfastTrackingUrl,
} from "@/lib/steadfast";
import { sendTemplateEmail } from "@/lib/email";
import { formatOrderId } from "@/lib/order-id";
import { requestOrigin } from "@/lib/origin";
import { getSiteSetting } from "@ecom/cms";
import { parseCourierSettings } from "@/lib/courier-settings";

/**
 * Steadfast handover for an order (admin-gated by middleware).
 * POST — create the consignment, store its ids in order metadata, then run the
 *        normal ship flow (tracking code + steadfast.com.bd/t/ URL + email).
 * GET  — live courier status for the order's stored consignment.
 */

/** "+8801712345678" / "8801712-345678" / "01712345678" → "01712345678"; null if not a BD mobile. */
function normalizeBdPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("880")) digits = `0${digits.slice(3)}`;
  return digits.length === 11 && digits.startsWith("01") ? digits : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!steadfastConfigured()) {
    return NextResponse.json({ error: "Steadfast is not configured." }, { status: 503 });
  }
  const courier = parseCourierSettings(await getSiteSetting("courier").catch(() => null));
  if (courier.partner !== "steadfast") {
    return NextResponse.json(
      { error: "Steadfast is switched off in Shipping → Delivery partner." },
      { status: 409 },
    );
  }

  const order = await getOrderDetail(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.canceled) return NextResponse.json({ error: "Order is canceled." }, { status: 409 });
  if (!order.fulfilled) {
    return NextResponse.json({ error: "Start processing (fulfil the items) first." }, { status: 409 });
  }
  if (order.fulfillments.some((f) => f.shippedAt)) {
    return NextResponse.json({ error: "Order is already shipped." }, { status: 409 });
  }
  if (order.courier) {
    return NextResponse.json({ error: "Order was already sent to Steadfast." }, { status: 409 });
  }

  const phone = order.address?.phone ? normalizeBdPhone(order.address.phone) : null;
  if (!phone) {
    return NextResponse.json(
      { error: "Order has no valid BD mobile number (01XXXXXXXXX) — use manual handover." },
      { status: 422 },
    );
  }
  const addressLine = [order.address?.line1, order.address?.city, order.address?.postalCode]
    .filter(Boolean)
    .join(", ");
  if (!addressLine) {
    return NextResponse.json({ error: "Order has no shipping address." }, { status: 422 });
  }

  // FAIL CLOSED on the collection amount: paymentMethod comes from metadata
  // written best-effort at checkout. Missing → we cannot know whether the
  // courier must collect cash, and a wrong 0 silently loses the order value.
  if (order.paymentMethod !== "cod" && order.paymentMethod !== "sslcommerz") {
    return NextResponse.json(
      { error: "Payment method unknown for this order — hand it over manually instead." },
      { status: 409 },
    );
  }

  const invoice = formatOrderId(order.displayId);
  const result = await createConsignment(
    {
      invoice,
      name: order.address?.name || order.email,
      phone,
      address: addressLine,
      // COD orders: courier collects the full total; prepaid (sslcommerz): nothing.
      codAmount: order.paymentMethod === "cod" ? order.totalAmount : 0,
      note: `Order ${invoice}`,
    },
    // Admin test-mode toggle wins alongside the STEADFAST_MOCK env fallback.
    { mock: courier.testMode || undefined },
  );
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  const { consignment } = result;
  // Persist the consignment on the order BEFORE shipping — it already exists at
  // Steadfast, so we must not lose the id even if a later step fails.
  await setOrderMetadata(id, {
    steadfast_consignment_id: consignment.consignmentId,
    steadfast_tracking_code: consignment.trackingCode,
  }).catch(() => undefined); // best-effort: handover still proceeds

  try {
    await shipOrder(id, consignment.trackingCode, steadfastTrackingUrl(consignment.trackingCode));
  } catch (error) {
    return NextResponse.json(
      {
        error: `Consignment ${consignment.consignmentId} was created at Steadfast, but marking the order shipped failed: ${(error as Error).message}`,
      },
      { status: 502 },
    );
  }

  // "Your order shipped" email (admin-editable template) — best-effort.
  if (order.email) {
    await sendTemplateEmail("orderShipped", order.email, {
      orderId: invoice,
      trackingNumber: consignment.trackingCode,
      trackUrl: `${requestOrigin(request)}/track`,
      name: "there",
    }).catch(() => undefined);
  }

  return NextResponse.json({
    ok: true,
    consignmentId: consignment.consignmentId,
    trackingCode: consignment.trackingCode,
    status: consignment.status,
    rawStatus: consignment.rawStatus,
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!steadfastConfigured()) {
    return NextResponse.json({ error: "Steadfast is not configured." }, { status: 503 });
  }
  const order = await getOrderDetail(id);
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (!order.courier) {
    return NextResponse.json({ error: "No Steadfast consignment on this order." }, { status: 404 });
  }
  const result = await getConsignmentStatus(order.courier.consignmentId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({ status: result.status, rawStatus: result.rawStatus });
}
