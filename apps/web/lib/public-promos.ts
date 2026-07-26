import "server-only";
import { z } from "zod";
import { getSiteSetting, setSiteSetting } from "@ecom/cms";

/**
 * Which promo codes are shown PUBLICLY (offers page, guest surfaces) — #140.
 * Opt-in per code via the toggle in /admin/discounts; stored in the CMS
 * SiteSetting "publicPromoCodes" (Medusa 2.15's promo API has no free-form
 * flag field). Codes are stored uppercase.
 */

const schema = z.array(z.string().min(1).max(60)).max(500);

export async function getPublicPromoCodes(): Promise<Set<string>> {
  const r = schema.safeParse(await getSiteSetting("publicPromoCodes").catch(() => null));
  return new Set((r.success ? r.data : []).map((c) => c.toUpperCase()));
}

export async function setPromoPublic(code: string, isPublic: boolean): Promise<void> {
  const codes = await getPublicPromoCodes();
  const upper = code.toUpperCase();
  if (isPublic) codes.add(upper);
  else codes.delete(upper);
  await setSiteSetting("publicPromoCodes", [...codes]);
}

// --- Card-batch prefixes -----------------------------------------------------
// Generated one-time card codes (CARD-8F3K2A × 1000) would drown the discounts
// table — their prefixes are recorded here so the admin list can fold them.

const prefixSchema = z.array(z.string().min(2).max(13)).max(100);

export async function getBatchPrefixes(): Promise<string[]> {
  const r = prefixSchema.safeParse(await getSiteSetting("promoBatchPrefixes").catch(() => null));
  return r.success ? r.data : [];
}

export async function addBatchPrefix(prefix: string): Promise<void> {
  const prefixes = new Set(await getBatchPrefixes());
  prefixes.add(prefix.toUpperCase());
  await setSiteSetting("promoBatchPrefixes", [...prefixes]);
}
