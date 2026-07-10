import { NextResponse } from "next/server";
import { getSiteSetting } from "@ecom/cms";
import { completeCart, getCartPaymentInfo, initPayment, setCartMetadata } from "@/lib/medusa-store";
import { validateSslcommerzPayment } from "@/lib/sslcommerz";
import { parseCheckoutConfig } from "@/lib/checkout-config";
import { orderConfirmationHtml, sendEmail } from "@/lib/email";

/**
 * SSLCommerz posts the shopper's browser back here after the gateway page.
 * The cart cookie is NOT trusted/needed (cross-site POST strips it) — the cart
 * id travels in value_a and the payment is verified with the validator API.
 */
export async function POST(request: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const state = new URL(request.url).searchParams.get("state");
  const form = await request.formData().catch(() => null);
  const valId = form?.get("val_id");
  const cartId = form?.get("value_a");

  if (
    state !== "success" ||
    typeof valId !== "string" ||
    typeof cartId !== "string" ||
    !/^cart_[A-Za-z0-9]+$/.test(cartId)
  ) {
    const reason = state === "cancel" ? "cancelled" : "failed";
    return NextResponse.redirect(`${origin}/checkout?payment=${reason}`, 303);
  }

  // 1. Trust only the validator API — status, amount, currency and cart must all match.
  const [validation, cart] = await Promise.all([validateSslcommerzPayment(valId), getCartPaymentInfo(cartId)]);
  if (
    !validation ||
    !cart ||
    validation.value_a !== cartId ||
    Math.abs(validation.amount - cart.amount) > 0.01 ||
    (validation.currency_type != null && validation.currency_type !== cart.currency)
  ) {
    return NextResponse.redirect(`${origin}/checkout?payment=failed`, 303);
  }

  // 2. Mark + complete the order.
  try {
    await setCartMetadata(cartId, { payment_method: "sslcommerz", payment_ref: valId }).catch(() => undefined);
    await initPayment(cartId);
    const result = await completeCart(cartId);
    if (!result.ok) return NextResponse.redirect(`${origin}/checkout?payment=failed`, 303);

    if (result.order.email) {
      await sendEmail({
        to: result.order.email,
        subject: `Order #${result.order.displayId} confirmed — Maison`,
        html: orderConfirmationHtml(result.order),
      });
    }

    const config = parseCheckoutConfig(await getSiteSetting("checkout").catch(() => null));
    const label = config.paymentMethods.find((m) => m.id === "sslcommerz")?.label ?? "Paid Online";
    const params = new URLSearchParams({
      order: String(result.order.displayId),
      email: result.order.email,
      total: result.order.total,
      method: "sslcommerz",
      payLabel: label,
    });
    const response = NextResponse.redirect(`${origin}/checkout/success?${params}`, 303);
    // Clear the cart cookie on our own response (works even though the POST is cross-site).
    response.cookies.delete("cart_id");
    return response;
  } catch {
    return NextResponse.redirect(`${origin}/checkout?payment=failed`, 303);
  }
}
