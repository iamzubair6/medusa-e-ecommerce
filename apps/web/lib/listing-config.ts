import { z } from "zod";

/**
 * Admin-managed per-listing configuration, stored in CMS SiteSetting
 * "listingConfig" and keyed by listing handle (division / content-category /
 * marketing-collection handle, or "all" for the /products page). Controls:
 *  - whether the Category facet shows in the filter rail,
 *  - the order of the filter groups in the rail,
 *  - an optional curated "special" tile row above the grid (generalising the
 *    previously hardcoded Tops row to any listing).
 * Listings with no entry fall back to the derived defaults in build-listing.
 */

/** The filter groups that can appear in the listing rail, in any order. */
export const FACET_KEYS = ["category", "size", "color", "occasion", "style", "trend", "price"] as const;
export type FacetKey = (typeof FACET_KEYS)[number];
export const facetKeySchema = z.enum(FACET_KEYS);

/** Product attributes a special tile row can be generated from. */
export const SPECIAL_SOURCES = ["style", "occasion", "trend", "category"] as const;
export type SpecialSource = (typeof SPECIAL_SOURCES)[number];

export const specialSectionSchema = z.object({
  enabled: z.boolean().default(false),
  heading: z.string().max(60).default(""),
  source: z.enum(SPECIAL_SOURCES).default("style"),
  limit: z.number().int().min(1).max(12).default(7),
});

export const listingEntrySchema = z.object({
  /** "auto" keeps the derived behaviour; "show"/"hide" force the Category facet. */
  categoryFacet: z.enum(["auto", "show", "hide"]).default("auto"),
  /** Explicit filter-group order; empty array = derived default order. */
  facetOrder: z.array(facetKeySchema).max(FACET_KEYS.length).default([]),
  special: specialSectionSchema.default({}),
});

export const listingConfigSchema = z.object({
  entries: z.record(z.string(), listingEntrySchema).default({}),
});

export type SpecialSection = z.infer<typeof specialSectionSchema>;
export type ListingEntry = z.infer<typeof listingEntrySchema>;
export type ListingConfig = z.infer<typeof listingConfigSchema>;

export const DEFAULT_LISTING_ENTRY: ListingEntry = listingEntrySchema.parse({});
export const DEFAULT_LISTING_CONFIG: ListingConfig = listingConfigSchema.parse({});

export function parseListingConfig(raw: unknown): ListingConfig {
  const r = listingConfigSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_LISTING_CONFIG;
}

/** Resolve the entry for a listing handle ("all" for the all-products page). */
export function listingEntryFor(config: ListingConfig, handle: string | undefined): ListingEntry {
  return config.entries[handle ?? "all"] ?? DEFAULT_LISTING_ENTRY;
}
