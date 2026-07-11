import { NextResponse } from "next/server";
import { z } from "zod";
import { getSiteSetting } from "@ecom/cms";
import { clearCartId, getCartId } from "@/lib/cart-cookie";
import { completeCart, getCartPaymentInfo, initPayment, setCartMetadata } from "@/lib/medusa-store";
import { sendTransactionalSms } from "@/lib/otp-sms";
import { transferCartToCustomer } from "@/lib/customer-auth";
import { parseCheckoutConfig, paymentMethodIds } from "@/lib/checkout-config";
import { sendTemplateEmail } from "@/lib/email";
import { formatOrderId } from "@/lib/order-id";
import { requestOrigin } from "@/lib/origin";

const schema = z.object({ method: z.string().min(1).max(24).optional() });

/** Set the payment method, then complete the order. The chosen method must be an
 *  admin-enabled payment method (CMS "checkout"); the default is the first one.
 *  All methods settle through Medusa's manual provider for now — funds are
 *  collected on delivery (COD) until a real gateway is wired. */
export async function POST(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  const requested = parsed.success ? parsed.data.method : undefined;

  const config = parseCheckoutConfig(await getSiteSetting("checkout").catch(() => null));
  const allowed = paymentMethodIds(config);
  if (allowed.length === 0) {
    return NextResponse.json({ error: "No payment methods are enabled." }, { status: 409 });
  }
  // Use the requested method only if it's currently enabled; else the first one.
  const method = requested && allowed.includes(requested) ? requested : allowed[0]!;
  // Gateway methods must go through /api/checkout/pay (validated payment) —
  // completing here would place an unpaid order marked as paid online.
  if (method === "sslcommerz") {
    return NextResponse.json({ error: "Online payments start at /api/checkout/pay." }, { status: 409 });
  }

  try {
    // Link the order to the signed-in customer (no-op for guests).
    await transferCartToCustomer(id).catch(() => undefined);
    await setCartMetadata(id, { payment_method: method }).catch(() => undefined);
    // Phone captured before completion — the cart is gone afterwards.
    const phone = (await getCartPaymentInfo(id).catch(() => null))?.phone ?? "";
    await initPayment(id);
    const result = await completeCart(id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }
    await clearCartId();

    // Confirmation email + SMS (both best-effort; false/ignored on failure).
    const orderId = formatOrderId(result.order.displayId);
    const trackUrl = `${requestOrigin(request)}/track`;
    if (result.order.email) {
      await sendTemplateEmail("orderConfirmation", result.order.email, {
        orderId,
        total: result.order.total,
        trackUrl,
        name: "there",
      });
    }
    if (phone) {
      await sendTransactionalSms(
        phone,
        `Maison: order ${orderId} confirmed (${result.order.total.replace("৳", "Tk ")}). Track: ${trackUrl}`,
      );
    }
    return NextResponse.json({ order: result.order, method });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
