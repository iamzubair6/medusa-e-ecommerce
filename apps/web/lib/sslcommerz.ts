import "server-only";
import { z } from "zod";
import type { CartPaymentInfo } from "./medusa-store";

/**
 * SSLCommerz hosted checkout (Bangladesh) — free sandbox, no real money moves.
 * Docs: https://developer.sslcommerz.com/doc/v4/
 *
 * Env: SSLCOMMERZ_STORE_ID + SSLCOMMERZ_STORE_PASSWORD (free signup at
 * https://developer.sslcommerz.com/registration/). SSLCOMMERZ_LIVE="true"
 * switches to the production host; anything else = sandbox.
 *
 * Flow: create session → redirect shopper to GatewayPageURL → SSLCommerz POSTs
 * the shopper's browser back to our callback → we validate the payment
 * server-side (validator API — never trust the POST body alone) → complete the
 * Medusa order.
 */
export const sslcommerzMockMode = (): boolean =>
  !process.env.SSLCOMMERZ_STORE_ID || !process.env.SSLCOMMERZ_STORE_PASSWORD;

const BASE = () =>
  process.env.SSLCOMMERZ_LIVE === "true" ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com";

const sessionResponseSchema = z.object({
  status: z.string(),
  failedreason: z.string().optional(),
  GatewayPageURL: z.string().optional(),
});

export async function createSslcommerzSession(
  cart: CartPaymentInfo,
  urls: { success: string; fail: string; cancel: string },
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!storeId || !storePassword) return { ok: false, error: "Online payment is not configured yet." };

  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: cart.amount.toFixed(2),
    currency: cart.currency,
    // Unique per attempt (retries after a cancel need a fresh id); cart id travels in value_a.
    tran_id: `${cart.id.slice(-16)}-${Date.now().toString(36)}`,
    success_url: urls.success,
    fail_url: urls.fail,
    cancel_url: urls.cancel,
    // Server-to-server notification: completes the order even if the shopper's
    // browser never comes back after paying (closed tab, dead network).
    ipn_url: urls.success,
    value_a: cart.id,
    cus_name: cart.name,
    cus_email: cart.email || "guest@example.com",
    cus_add1: cart.address || "N/A",
    cus_city: cart.city || "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: cart.phone || "N/A",
    shipping_method: "NO",
    product_name: `Maison order (${cart.itemCount} items)`,
    product_category: "Fashion",
    product_profile: "physical-goods",
  });

  try {
    const res = await fetch(`${BASE()}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });
    const parsed = sessionResponseSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success || parsed.data.status !== "SUCCESS" || !parsed.data.GatewayPageURL) {
      return { ok: false, error: parsed.success ? (parsed.data.failedreason ?? "Gateway refused the session.") : "Unexpected gateway response." };
    }
    return { ok: true, url: parsed.data.GatewayPageURL };
  } catch {
    return { ok: false, error: "Could not reach the payment gateway. Try again." };
  }
}

const validationSchema = z.object({
  status: z.string(),
  amount: z.coerce.number(),
  currency_type: z.string().optional(),
  currency_amount: z.coerce.number().optional(),
  tran_id: z.string().optional(),
  value_a: z.string().optional(),
});

export type SslcommerzValidation = z.infer<typeof validationSchema>;

/** Server-to-server validation of a payment by its val_id. The only trusted check. */
export async function validateSslcommerzPayment(valId: string): Promise<SslcommerzValidation | null> {
  const storeId = process.env.SSLCOMMERZ_STORE_ID;
  const storePassword = process.env.SSLCOMMERZ_STORE_PASSWORD;
  if (!storeId || !storePassword) return null;
  const params = new URLSearchParams({
    val_id: valId,
    store_id: storeId,
    store_passwd: storePassword,
    format: "json",
  });
  try {
    const res = await fetch(`${BASE()}/validator/api/validationserverAPI.php?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    const parsed = validationSchema.safeParse(await res.json().catch(() => null));
    if (!parsed.success) return null;
    return parsed.data.status === "VALID" || parsed.data.status === "VALIDATED" ? parsed.data : null;
  } catch {
    return null;
  }
}
