import { z } from "zod";

/**
 * Admin-managed checkout configuration, stored in the CMS SiteSetting "checkout".
 *
 * WHY hybrid (CMS + Medusa): the *amounts* and *zones* of shipping options are
 * real Medusa data, edited live via the Admin API (see /admin/shipping →
 * medusa-admin.updateShippingRate). This CMS override layer governs only what is
 * NOT modelled in Medusa for our single-provider (manual / Cash-on-Delivery)
 * setup: which payment methods the storefront *offers*, their merchant-facing
 * labels/instructions, and per-shipping-option helper copy. Every offered method
 * still settles through Medusa's manual provider (pp_system_default) and is
 * distinguished on the order by metadata.payment_method — adding a real online
 * gateway later means enabling its provider in Medusa and pointing a method's
 * `providerId` at it; no storefront change required.
 *
 * The checkout proxy reads this to decide which payment radios render and how
 * they're labelled; `paymentMethodIds()` is the source of truth the /complete
 * route validates the chosen method against.
 */

/** A selectable payment method shown at checkout. `id` is carried onto the order. */
export const paymentMethodSchema = z.object({
  /** Stable key persisted to order metadata (e.g. "cod", "card", "bkash"). */
  id: z
    .string()
    .min(1)
    .max(24)
    .regex(/^[a-z0-9_-]+$/, "Use lowercase letters, numbers, - or _"),
  label: z.string().min(1).max(60),
  description: z.string().max(160).default(""),
  enabled: z.boolean().default(true),
});

/** Per-Medusa-shipping-option presentation override (amount/zone stay in Medusa). */
export const shippingMethodSchema = z.object({
  /** Medusa shipping_option id this override applies to. */
  optionId: z.string().min(1).max(64),
  /** Optional helper copy shown under the option at checkout. */
  note: z.string().max(160).default(""),
  /** Hide this option from checkout without deleting it in Medusa. */
  enabled: z.boolean().default(true),
});

export const checkoutConfigSchema = z.object({
  paymentMethods: z
    .array(paymentMethodSchema)
    .max(8)
    .default([
      { id: "cod", label: "Cash on Delivery", description: "Pay in cash when your order is delivered.", enabled: true },
      { id: "card", label: "Card / Online Payment", description: "Coming soon.", enabled: false },
    ]),
  shippingMethods: z.array(shippingMethodSchema).max(24).default([]),
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;
export type ShippingMethodOverride = z.infer<typeof shippingMethodSchema>;
export type CheckoutConfig = z.infer<typeof checkoutConfigSchema>;

export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = checkoutConfigSchema.parse({});

export function parseCheckoutConfig(raw: unknown): CheckoutConfig {
  const r = checkoutConfigSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_CHECKOUT_CONFIG;
}

/** Enabled payment methods only — what the storefront should display. */
export function enabledPaymentMethods(config: CheckoutConfig): PaymentMethod[] {
  return config.paymentMethods.filter((m) => m.enabled);
}

/** Valid (enabled) payment-method ids, for server-side validation at /complete. */
export function paymentMethodIds(config: CheckoutConfig): string[] {
  return enabledPaymentMethods(config).map((m) => m.id);
}

/** Resolve a shipping-option override by Medusa option id (undefined = no override). */
export function shippingOverrideFor(
  config: CheckoutConfig,
  optionId: string,
): ShippingMethodOverride | undefined {
  return config.shippingMethods.find((s) => s.optionId === optionId);
}
