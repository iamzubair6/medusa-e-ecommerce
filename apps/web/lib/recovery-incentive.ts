import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { getSiteSetting } from "@ecom/cms";
import { ensurePersonalPromo } from "./medusa-admin";

/** Abandoned-cart recovery incentive (#133): optionally sweeten every recovery
 *  email with a one-time percent-off code unique to that cart. */

export const abandonedRecoverySchema = z.object({
  /** 0 = no discount in recovery emails. */
  discountPercent: z.number().int().min(0).max(90).default(0),
});
export type AbandonedRecovery = z.infer<typeof abandonedRecoverySchema>;

export function parseAbandonedRecovery(raw: unknown): AbandonedRecovery {
  const r = abandonedRecoverySchema.safeParse(raw ?? {});
  return r.success ? r.data : abandonedRecoverySchema.parse({});
}

export async function getAbandonedRecovery(): Promise<AbandonedRecovery> {
  return parseAbandonedRecovery(await getSiteSetting("abandonedRecovery").catch(() => null));
}

const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-phone-secret";

/** The cart's one-time AB-XXXXXX code at the configured percent, creating the
 *  promo if needed. Null when the incentive is off. Used by the recovery email
 *  AND by support staff reading the code out over the phone (#141). */
export async function recoveryCodeForCart(
  cartRecordId: string,
): Promise<{ code: string; percent: number } | null> {
  const { discountPercent } = await getAbandonedRecovery();
  if (discountPercent <= 0) return null;
  const digest = crypto.createHmac("sha256", SECRET).update(`recovery:${cartRecordId}`).digest("hex");
  const code = `AB-${digest.slice(0, 6).toUpperCase()}`;
  await ensurePersonalPromo(code, "percentage", discountPercent);
  return { code, percent: discountPercent };
}

/** Ready-to-embed sentence for the recovery email, or "" when off/failed. */
export async function recoveryIncentiveText(cartRecordId: string): Promise<string> {
  try {
    const reward = await recoveryCodeForCart(cartRecordId);
    if (!reward) return "";
    return `Come back today and take ${reward.percent}% off — use code ${reward.code} at checkout (one-time, just for you).`;
  } catch {
    return "";
  }
}
