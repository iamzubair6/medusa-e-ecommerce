import { NextResponse } from "next/server";
import { getSiteSetting } from "@ecom/cms";
import { getCartId } from "@/lib/cart-cookie";
import { getCartPaymentInfo } from "@/lib/medusa-store";
import { createSslcommerzSession, sslcommerzMockMode } from "@/lib/sslcommerz";
import { parseCheckoutConfig, paymentMethodIds } from "@/lib/checkout-config";
import { requestOrigin } from "@/lib/origin";

/**
 * Start an online payment: creates an SSLCommerz session for the current cart
 * and returns the gateway URL to redirect the shopper to. The order itself is
 * completed only in the callback, after server-side validation.
 */
export async function POST(request: Request) {
  const id = await getCartId();
  if (!id) return NextResponse.json({ error: "No cart" }, { status: 404 });

  const config = parseCheckoutConfig(await getSiteSetting("checkout").catch(() => null));
  if (!paymentMethodIds(config).includes("sslcommerz")) {
    return NextResponse.json({ error: "Online payment is not enabled." }, { status: 409 });
  }
  if (sslcommerzMockMode()) {
    return NextResponse.json(
      { error: "Online payment is not configured (missing SSLCommerz credentials)." },
      { status: 503 },
    );
  }

  const cart = await getCartPaymentInfo(id);
  if (!cart || cart.amount <= 0) return NextResponse.json({ error: "Cart is empty." }, { status: 409 });

  // The origin the SHOPPER is on (localhost:3200 in dev, live domain in prod) —
  // env-based origins sent gateway redirects to the wrong port locally.
  const origin = requestOrigin(request);
  const callback = (state: string) => `${origin}/api/checkout/pay/callback?state=${state}`;
  const session = await createSslcommerzSession(cart, {
    success: callback("success"),
    fail: callback("fail"),
    cancel: callback("cancel"),
  });
  if (!session.ok) return NextResponse.json({ error: session.error }, { status: 502 });
  return NextResponse.json({ url: session.url });
}
