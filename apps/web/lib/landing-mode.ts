import { z } from "zod";
import type { DIVISION_HANDLES } from "@/lib/commerce";

/**
 * Per-landing-page render mode (admin → /admin/landing-style, stored in CMS
 * SiteSetting "landingMode"). For each landing page (the home page + every
 * division page) the owner chooses between:
 *   - "sections" → render the published CMS PageLayout when it has sections,
 *                  otherwise fall back to the curated <Landing> (today's behavior).
 *   - "curated"  → ALWAYS render the curated Fashion-Nova <Landing>, ignoring any
 *                  published section page.
 *
 * Keys are "home" plus each division handle. Unset keys default to "sections"
 * (see `landingModeFor`) so existing pages keep their current behavior.
 */
export const LANDING_PAGE_KEYS = ["home", "women", "plus", "men", "sport", "kids", "beauty"] as const;

export type LandingPageKey = (typeof LANDING_PAGE_KEYS)[number];

/**
 * Compile-time guarantee that the inlined division keys above stay in sync with
 * the runtime `DIVISION_HANDLES` (imported as a type only, so this module never
 * pulls the server-only commerce module into client bundles).
 */
type _AssertDivisionsCovered = (typeof DIVISION_HANDLES)[number] extends LandingPageKey ? true : never;
const _assertDivisionsCovered: _AssertDivisionsCovered = true;
void _assertDivisionsCovered;

export const landingPageModeSchema = z.enum(["curated", "sections"]);

export type LandingPageMode = z.infer<typeof landingPageModeSchema>;

/** A record mapping page key → mode. Keys are optional; missing keys default to "sections". */
export const landingModeSchema = z.record(z.enum(LANDING_PAGE_KEYS), landingPageModeSchema);

export type LandingMode = z.infer<typeof landingModeSchema>;

export const DEFAULT_LANDING_MODE: LandingMode = {};

/** Parse the raw CMS value, falling back to {} on any failure (mirrors parseSiteSettings). */
export function parseLandingMode(raw: unknown): LandingMode {
  const r = landingModeSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_LANDING_MODE;
}

/**
 * Resolve the mode for a page key. Defaults to "sections" when unset, which
 * preserves today's behavior (CMS sections override curated when present).
 */
export function landingModeFor(modes: LandingMode, key: LandingPageKey): LandingPageMode {
  return modes[key] ?? "sections";
}
