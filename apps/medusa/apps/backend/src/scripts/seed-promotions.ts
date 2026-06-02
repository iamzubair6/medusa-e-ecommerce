import { Modules } from "@medusajs/framework/utils";
import type { ExecArgs } from "@medusajs/framework/types";

/**
 * Seeds a sample promotion (WELCOME10 — 10% off order) used by the storefront
 * cart/checkout promo-code feature. Idempotent.
 *
 * Run: npx medusa exec ./src/scripts/seed-promotions.ts
 */
export default async function seedPromotions({ container }: ExecArgs) {
  const promotionModule = container.resolve(Modules.PROMOTION);

  const existing = await promotionModule.listPromotions({ code: "WELCOME10" });
  if (existing.length > 0) {
    console.log("Promotion WELCOME10 already exists — skipping.");
    return;
  }

  await promotionModule.createPromotions([
    {
      code: "WELCOME10",
      type: "standard",
      status: "active",
      application_method: {
        type: "percentage",
        target_type: "order",
        allocation: "across",
        value: 10,
        currency_code: "eur",
      },
    },
  ]);

  console.log("Created promotion WELCOME10 (10% off order).");
}
