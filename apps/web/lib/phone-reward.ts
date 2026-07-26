import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import { getSiteSetting } from "@ecom/cms";
import { ensurePersonalPromo } from "./medusa-admin";

/**
 * Personal discount for verified phone numbers (#132): on OTP verification,
 * each phone gets a unique one-time promo code (deterministic from the phone —
 * verifying again re-issues the SAME code, so nobody can farm codes).
 */

export const phoneRewardSchema = z.object({
  enabled: z.boolean().default(false),
  kind: z.enum(["percentage", "fixed"]).default("percentage"),
  value: z.number().int().min(1).max(100_000).default(5),
  message: z.string().max(140).default("A welcome treat for verifying your number"),
});
export type PhoneReward = z.infer<typeof phoneRewardSchema>;

export function parsePhoneReward(raw: unknown): PhoneReward {
  const r = phoneRewardSchema.safeParse(raw ?? {});
  return r.success ? r.data : phoneRewardSchema.parse({});
}

export async function getPhoneReward(): Promise<PhoneReward> {
  return parsePhoneReward(await getSiteSetting("phoneReward").catch(() => null));
}

const SECRET = process.env.ADMIN_SESSION_SECRET || "dev-phone-secret";

/** Deterministic personal code for a phone (PH-XXXXXX). */
export function codeForPhone(phone: string): string {
  const normalized = phone.replace(/[^0-9]/g, "");
  const digest = crypto.createHmac("sha256", SECRET).update(`reward:${normalized}`).digest("hex");
  return `PH-${digest.slice(0, 6).toUpperCase()}`;
}

export interface GrantedReward {
  code: string;
  display: string; // "5% off" | "৳100 off"
  message: string;
}

/** Ensure the personal one-time promo exists for this phone. Returns null when
 *  the feature is disabled. Never throws — reward failures must not block login. */
export async function grantPhoneReward(phone: string): Promise<GrantedReward | null> {
  try {
    const config = await getPhoneReward();
    if (!config.enabled) return null;
    const code = codeForPhone(phone);
    const display = config.kind === "percentage" ? `${config.value}% off` : `৳${config.value} off`;
    await ensurePersonalPromo(code, config.kind, config.value);
    return { code, display, message: config.message };
  } catch {
    return null;
  }
}
