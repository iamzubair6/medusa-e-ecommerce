import { z } from "zod";

/**
 * Structured, Fashion-Nova-style size guides (admin → /admin/size-guides,
 * stored in CMS SiteSetting "sizeGuides"). A guide targets category handles
 * (optionally one division) and renders as the FN modal: How-It-Fits bar,
 * Fit Reference photos, a Measurements table with an in./cm toggle, and
 * How-To-Measure points. Every section is optional — empty sections hide, so
 * a minimal guide is just a title and a table.
 *
 * Resolution on the PDP: per-product rich-text override → first structured
 * guide matching the product's categories/division → global fallback text.
 */

export const fitReferenceSchema = z.object({
  image: z.string().default(""),
  label: z.string().max(30).default(""),
  caption: z.string().max(80).default(""),
});

export const measureRowSchema = z.object({
  size: z.string().max(12),
  /** One value per column, in INCHES (the cm toggle converts numerics). */
  values: z.array(z.string().max(20)).default([]),
});

export const measurePointSchema = z.object({
  label: z.string().max(30),
  text: z.string().max(200),
});

export const sizeGuideSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(60),
  /** Category handles this guide applies to (any match). */
  categories: z.array(z.string()).default([]),
  /** Restrict to one division; empty = any. */
  division: z.string().default(""),
  /** 1–5 position on the Small ↔ True to size ↔ Large customer-feedback bar. */
  fitFeedback: z.number().int().min(1).max(5).default(3),
  fitReference: z.array(fitReferenceSchema).max(4).default([]),
  columns: z.array(z.string().max(24)).default([]),
  rows: z.array(measureRowSchema).default([]),
  measureImage: z.string().default(""),
  measurePoints: z.array(measurePointSchema).max(6).default([]),
});

export type SizeGuide = z.infer<typeof sizeGuideSchema>;

export const sizeGuidesSettingSchema = z.object({
  guides: z.array(sizeGuideSchema).default([
    // Order matters: the FIRST matching guide wins, so the more specific
    // bottoms guide sits before tops (gym shorts carry activewear+bottoms).
    {
      id: "bottoms",
      title: "Bottoms Size Guide",
      categories: ["bottoms", "jeans"],
      division: "",
      fitFeedback: 3,
      fitReference: [],
      columns: ["Waist (in)", "Hip (in)", "Inseam (in)"],
      rows: [
        { size: "XS", values: ["24-25", "34-35", "30"] },
        { size: "S", values: ["26-27", "36-37", "30"] },
        { size: "M", values: ["28-30", "38-40", "31"] },
        { size: "L", values: ["31-33", "41-44", "31"] },
        { size: "XL", values: ["34-37", "45-48", "32"] },
      ],
      measureImage: "",
      measurePoints: [
        { label: "Waist", text: "Measure around your waist in line with where the top of the garment would sit." },
        { label: "Inseam", text: "Measure from the crotch seam straight down the inside of your leg to the ankle." },
      ],
    },
    {
      id: "tops",
      title: "Tops Size Guide",
      categories: ["tops", "bodysuits", "dresses", "outerwear", "matching-sets", "swim"],
      division: "",
      fitFeedback: 3,
      fitReference: [],
      columns: ["Bust (in)", "Waist (in)"],
      rows: [
        { size: "XS", values: ["30-32", "24-26"] },
        { size: "S", values: ["33-35", "27-29"] },
        { size: "M", values: ["36-38", "30-32"] },
        { size: "L", values: ["39-42", "33-36"] },
        { size: "XL", values: ["43-46", "37-40"] },
      ],
      measureImage: "",
      measurePoints: [
        { label: "Bust", text: "Measure around the fullest part of your chest, keeping the tape level." },
        { label: "Waist", text: "Measure around the narrowest part of your natural waistline." },
      ],
    },
  ]),
});

export type SizeGuidesSetting = z.infer<typeof sizeGuidesSettingSchema>;

export const DEFAULT_SIZE_GUIDES: SizeGuidesSetting = sizeGuidesSettingSchema.parse({});

export function parseSizeGuides(raw: unknown): SizeGuidesSetting {
  const r = sizeGuidesSettingSchema.safeParse(raw);
  return r.success ? r.data : DEFAULT_SIZE_GUIDES;
}

/** First guide whose categories intersect the product's (division must agree when set). */
export function resolveSizeGuide(
  setting: SizeGuidesSetting,
  categoryHandles: string[],
  division?: string,
): SizeGuide | undefined {
  const cats = new Set(categoryHandles);
  return setting.guides.find(
    (g) =>
      g.categories.some((c) => cats.has(c)) &&
      (!g.division || !division || g.division === division),
  );
}

/** "28-30" → "71-76": converts every number in a cell to centimetres. */
export function toCm(value: string): string {
  return value.replace(/\d+(\.\d+)?/g, (n) => String(Math.round(Number(n) * 2.54)));
}
