import { z } from "zod";

/**
 * Configurable behavior for Search-By-Image (admin → /admin/visual-search,
 * stored in CMS SiteSetting "visualSearch"). Kept out of code so the feature
 * adapts to any catalog — a store selling only beauty or baby items simply
 * remaps (or clears) the garment→category rows; nothing is hardcoded to this
 * store's taxonomy.
 *
 * `partCategories`: detected garment group → category handles that scope the
 * results when that hotspot is selected. A group with no row (or none of its
 * handles present in the live catalog) falls back to pure visual ranking.
 */
export const PART_GROUPS = ["top", "bottom", "dress", "outerwear", "shoes", "bag", "accessory"] as const;

export const visualSearchSettingsSchema = z.object({
  partCategories: z.record(z.array(z.string())).default({
    // Defaults match the seeded catalog. No "activewear" on top/bottom — gym
    // items carry activewear+tops or activewear+bottoms, so the broad handle
    // would leak leggings into a top search (and vice versa).
    top: ["tops", "bodysuits", "swim"],
    bottom: ["bottoms", "jeans", "swim"],
    dress: ["dresses", "matching-sets"],
    outerwear: ["outerwear"],
    shoes: ["shoes"],
    bag: ["accessories"],
    accessory: ["accessories"],
  }),
});

export type VisualSearchSettings = z.infer<typeof visualSearchSettingsSchema>;

export const DEFAULT_VISUAL_SEARCH_SETTINGS: VisualSearchSettings = visualSearchSettingsSchema.parse({});

/** Parse the raw CMS value, falling back to defaults on any failure. */
export function parseVisualSearchSettings(raw: unknown): VisualSearchSettings {
  const r = visualSearchSettingsSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_VISUAL_SEARCH_SETTINGS;
}
