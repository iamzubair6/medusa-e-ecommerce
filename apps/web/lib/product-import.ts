import "server-only";
import ExcelJS from "exceljs";
import { z } from "zod";
import { productSchema } from "./product-schema";
import type { NewProductInput } from "./medusa-admin";
import { IMPORT_MAX_ROWS, type ImportRowSummary } from "./product-import-types";

/**
 * Bulk product import — Excel template generation + parsing/validation.
 * One spreadsheet row = one product. Multi-value cells (colors, sizes, images,
 * occasions…) are comma-separated. Parsed rows are validated with the same Zod
 * schema the manual product form uses (productSchema).
 */

// --- Vocabulary (mirrors the manual product form) -----------------------------

export const DIVISIONS = ["women", "plus", "men", "sport", "kids", "beauty"] as const;

export const SIZE_SETS = {
  CLOTHING: ["XS", "S", "M", "L", "XL", "XXL"],
  SHOES: ["36", "37", "38", "39", "40", "41", "42"],
} as const;
export type SizeSetName = keyof typeof SIZE_SETS;

export const OFFER_TYPES = ["none", "discount", "bogo", "custom"] as const;

/** Color name → swatch hex. Unknown names fall back to near-black ink. */
const SWATCHES: Record<string, string> = {
  black: "#1b1b1b", white: "#f5f2ec", "off white": "#f2efe9", ivory: "#f4efe4",
  cream: "#f1e8d8", bone: "#e8e2d4", beige: "#d9c9a8", tan: "#c8a878",
  camel: "#b98a4e", brown: "#6b4a2f", chocolate: "#4a2f21", taupe: "#a99884",
  stone: "#c6bfb2", grey: "#8a8a8a", gray: "#8a8a8a", charcoal: "#3a3a3a",
  silver: "#c0c0c0", navy: "#26324a", blue: "#3b5b87", denim: "#4a6485",
  "sky blue": "#9cc0e0", teal: "#2f6f6a", mint: "#b7d9c4", green: "#3f6b48",
  sage: "#a8b5a0", olive: "#5b6b3a", khaki: "#c2b280", yellow: "#e3c14f",
  mustard: "#c9962e", gold: "#b9975b", orange: "#d97a3d", rust: "#a5522e",
  coral: "#e0705d", red: "#a83232", claret: "#6e1e2a", maroon: "#5c1f26",
  burgundy: "#5e2129", wine: "#63252f", pink: "#dfa3ad", blush: "#e6c3c0",
  rose: "#c97b84", lavender: "#b9a8cf", lilac: "#c5b3d6", purple: "#5d3a6e",
  plum: "#5a3448",
};

export function swatchFor(colorName: string): string {
  return SWATCHES[colorName.trim().toLowerCase()] ?? "#1b1b1b";
}

// --- Column specification -----------------------------------------------------

interface ColumnSpec {
  key: string;
  header: string;
  width: number;
  required: "yes" | "no" | "recommended";
  explain: string;
  example: string;
}

export const IMPORT_COLUMNS: ColumnSpec[] = [
  { key: "title", header: "Title *", width: 32, required: "yes",
    explain: "The product name shown to customers. Each row is one product.",
    example: "Satin Wrap Midi Dress" },
  { key: "description", header: "Description", width: 44, required: "no",
    explain: "Plain-text product description (a paragraph or two).",
    example: "A fluid satin midi with a true wrap waist." },
  { key: "division", header: "Division", width: 12, required: "recommended",
    explain: `Storefront division. Pick from the dropdown: ${DIVISIONS.join(", ")}.`,
    example: "women" },
  { key: "categories", header: "Category Handles", width: 24, required: "recommended",
    explain: "One or more category handles, comma-separated. The dropdown suggests single handles; type commas for several (ignore Excel's warning). Valid handles are listed below.",
    example: "dresses" },
  { key: "collection", header: "Collection Handle", width: 20, required: "no",
    explain: "One collection handle (dropdown). Leave blank for none.",
    example: "new-in" },
  { key: "colors", header: "Colors *", width: 18, required: "yes",
    explain: "Color names, comma-separated. Swatches are picked automatically from the name (Black, Ivory, Claret, Olive, Navy…). All colors share this row's price, sizes and images.",
    example: "Claret, Ivory" },
  { key: "sizeSet", header: "Size Set *", width: 12, required: "yes",
    explain: "CLOTHING (XS–XXL) or SHOES (36–42). Controls which sizes are allowed in the Sizes column.",
    example: "CLOTHING" },
  { key: "sizes", header: "Sizes *", width: 16, required: "yes",
    explain: `Comma-separated sizes from the chosen size set. CLOTHING: ${SIZE_SETS.CLOTHING.join(", ")}. SHOES: ${SIZE_SETS.SHOES.join(", ")}.`,
    example: "S, M, L" },
  { key: "stock", header: "Stock Per Size *", width: 15, required: "yes",
    explain: "One number (applies to every size), or a comma-separated list matching the Sizes column one-to-one.",
    example: "10  —  or  12, 18, 6" },
  { key: "price", header: "Price (BDT) *", width: 12, required: "yes",
    explain: "Selling price in Taka, whole number (no ৳ sign).",
    example: "1890" },
  { key: "originalPrice", header: "Original Price (BDT)", width: 18, required: "no",
    explain: "Pre-sale price. When higher than Price the storefront shows a markdown.",
    example: "2490" },
  { key: "images", header: "Image URLs *", width: 46, required: "yes",
    explain: "One or more full image URLs (https://…), comma-separated. At least one is required.",
    example: "https://images.unsplash.com/photo-…, https://…" },
  { key: "occasion", header: "Occasions", width: 20, required: "no",
    explain: "Comma-separated occasion tags (drive storefront filters).",
    example: "Going Out, Evening" },
  { key: "style", header: "Styles", width: 20, required: "no",
    explain: "Comma-separated style tags.",
    example: "Wrap, Satin" },
  { key: "trend", header: "Trends", width: 16, required: "no",
    explain: "Comma-separated trend tags.",
    example: "Summer" },
  { key: "tags", header: "Tags", width: 18, required: "no",
    explain: "Comma-separated free tags (search & merchandising).",
    example: "new, bestseller" },
  { key: "type", header: "Product Type", width: 14, required: "no",
    explain: "Free-text type, e.g. Clothing.",
    example: "Clothing" },
  { key: "material", header: "Material", width: 28, required: "no",
    explain: "Composition shown on the product page.",
    example: "95% polyester satin, 5% elastane" },
  { key: "care", header: "Care", width: 28, required: "no",
    explain: "Care instructions shown on the product page.",
    example: "Cold hand wash. Hang dry." },
  { key: "offerType", header: "Offer Type", width: 12, required: "no",
    explain: "none, discount, bogo, or custom (badge). Leave blank for none.",
    example: "discount" },
  { key: "offerLabel", header: "Offer Label", width: 18, required: "no",
    explain: "Badge text. Defaults: discount → “N% OFF”, bogo → “BUY 1 GET 1 FREE”, custom → “NEW”.",
    example: "24% OFF" },
  { key: "offerPercent", header: "Offer Percent", width: 13, required: "no",
    explain: "For discount offers: whole number 1–90.",
    example: "24" },
];

const COL_INDEX: Record<string, number> = Object.fromEntries(
  IMPORT_COLUMNS.map((c, i) => [c.key, i + 1]),
);

const colLetter = (n: number): string => String.fromCharCode(64 + n); // A..Z (≤26 cols)

// --- Cell coercion --------------------------------------------------------------

/** Coerce any exceljs cell value (rich text, hyperlink, formula…) to a trimmed string. */
export function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("hyperlink" in value) return (value.text || value.hyperlink || "").trim();
    if ("result" in value) {
      // formula / shared-formula cell — use the cached result
      const r = value.result;
      if (r === null || r === undefined) return "";
      if (r instanceof Date) return r.toISOString();
      if (typeof r === "object") return ""; // formula error result
      return String(r).trim();
    }
    if ("error" in value) return "";
  }
  return "";
}

const splitList = (s: string): string[] => s.split(",").map((t) => t.trim()).filter(Boolean);

// --- Row parsing / validation ---------------------------------------------------

export interface ImportContext {
  /** category handle (lowercase) → { id, name } */
  categories: Map<string, { id: string; name: string }>;
  /** collection handle (lowercase) → { id, title } */
  collections: Map<string, { id: string; title: string }>;
}

/** A product ready to create — NewProductInput plus its resolved collection. */
export interface ImportProduct extends NewProductInput {
  collectionId?: string;
}

export type ParsedImportRow =
  | { rowNumber: number; ok: true; product: ImportProduct; summary: ImportRowSummary }
  | { rowNumber: number; ok: false; title?: string; errors: string[] };

const intSchema = (label: string, min: number, max = 10_000_000) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Example rows are shipped in the template; skip them so they never import. */
const isExampleRow = (title: string): boolean => /^example\b/i.test(title);

function parseRow(rowNumber: number, raw: Record<string, string>, ctx: ImportContext): ParsedImportRow {
  const errors: string[] = [];
  const get = (key: string): string => raw[key] ?? "";

  const title = get("title");
  if (!title) errors.push("Title is required.");
  else if (title.length > 120) errors.push("Title must be 120 characters or fewer.");

  // Division
  const division = get("division").toLowerCase();
  if (division && !DIVISIONS.includes(division as (typeof DIVISIONS)[number])) {
    errors.push(`Division "${get("division")}" is not one of: ${DIVISIONS.join(", ")}.`);
  }

  // Categories (handles → ids)
  const categoryHandles = splitList(get("categories")).map((h) => h.toLowerCase());
  const categoryIds: string[] = [];
  const categoryNames: string[] = [];
  for (const handle of categoryHandles) {
    const match = ctx.categories.get(handle);
    if (!match) errors.push(`Category handle "${handle}" not found. Valid handles: ${[...ctx.categories.keys()].join(", ") || "(none)"}.`);
    else {
      categoryIds.push(match.id);
      categoryNames.push(match.name);
    }
  }

  // Collection
  const collectionHandle = get("collection").toLowerCase();
  let collectionId: string | undefined;
  let collectionTitle: string | undefined;
  if (collectionHandle) {
    const match = ctx.collections.get(collectionHandle);
    if (!match) errors.push(`Collection handle "${get("collection")}" not found. Valid handles: ${[...ctx.collections.keys()].join(", ") || "(none)"}.`);
    else {
      collectionId = match.id;
      collectionTitle = match.title;
    }
  }

  // Colors
  const colorNames = splitList(get("colors"));
  if (colorNames.length === 0) errors.push("Colors is required — add at least one color name.");
  if (colorNames.length > 8) errors.push("At most 8 colors per product.");

  // Size set + sizes
  const sizeSetRaw = get("sizeSet").toUpperCase();
  const sizeSet: SizeSetName | undefined =
    sizeSetRaw === "CLOTHING" || sizeSetRaw === "SHOES" ? sizeSetRaw : undefined;
  if (!sizeSet) errors.push(`Size Set must be CLOTHING or SHOES (got "${get("sizeSet") || "blank"}").`);

  const sizes = splitList(get("sizes")).map((s) => s.toUpperCase());
  if (sizes.length === 0) errors.push("Sizes is required — e.g. “S, M, L”.");
  if (sizeSet) {
    const allowed: readonly string[] = SIZE_SETS[sizeSet];
    for (const s of sizes) {
      if (!allowed.includes(s)) errors.push(`Size "${s}" is not in the ${sizeSet} set (${allowed.join(", ")}).`);
    }
  }

  // Stock: one number for all sizes, or a list matching sizes 1:1
  const stockParts = splitList(get("stock"));
  let stocks: number[] = [];
  if (stockParts.length === 0) {
    errors.push("Stock Per Size is required — one number, or one per size.");
  } else if (stockParts.length !== 1 && stockParts.length !== sizes.length) {
    errors.push(`Stock has ${stockParts.length} values but there are ${sizes.length} sizes — give one number or exactly one per size.`);
  } else {
    const parsed = stockParts.map((s) => intSchema("Stock", 0, 9999).safeParse(s));
    const bad = parsed.find((p) => !p.success);
    if (bad && !bad.success) errors.push(bad.error.issues[0]?.message ?? "Stock must be a whole number.");
    else {
      const nums = parsed.flatMap((p) => (p.success ? [p.data] : []));
      stocks = stockParts.length === 1 ? sizes.map(() => nums[0] ?? 0) : nums;
    }
  }

  // Prices
  let price = 0;
  const priceParsed = intSchema("Price (BDT)", 1).safeParse(get("price") || undefined);
  if (!priceParsed.success) errors.push(get("price") ? (priceParsed.error.issues[0]?.message ?? "Price must be a whole number.") : "Price (BDT) is required.");
  else price = priceParsed.data;

  let originalPrice: number | undefined;
  if (get("originalPrice")) {
    const op = intSchema("Original Price (BDT)", 1).safeParse(get("originalPrice"));
    if (!op.success) errors.push(op.error.issues[0]?.message ?? "Original Price must be a whole number.");
    else originalPrice = op.data;
  }
  if (originalPrice !== undefined && price > 0 && originalPrice <= price) {
    errors.push("Original Price must be higher than Price (it marks a markdown).");
  }

  // Images
  const images = splitList(get("images"));
  if (images.length === 0) errors.push("Image URLs is required — at least one https:// image URL.");
  if (images.length > 12) errors.push("At most 12 images per product.");
  for (const url of images) {
    if (!isHttpUrl(url)) errors.push(`"${url.slice(0, 80)}" is not a valid http(s) image URL.`);
  }

  // Offer
  const offerTypeRaw = get("offerType").toLowerCase();
  const offerType = offerTypeRaw === "" ? "none" : offerTypeRaw;
  if (!OFFER_TYPES.includes(offerType as (typeof OFFER_TYPES)[number])) {
    errors.push(`Offer Type "${get("offerType")}" is not one of: ${OFFER_TYPES.join(", ")}.`);
  }
  let offerPercent: number | undefined;
  if (get("offerPercent")) {
    const op = intSchema("Offer Percent", 1, 90).safeParse(get("offerPercent"));
    if (!op.success) errors.push(op.error.issues[0]?.message ?? "Offer Percent must be 1–90.");
    else offerPercent = op.data;
  }
  // Derive a discount % from the markdown when not given (same as the manual form).
  if (offerPercent === undefined && originalPrice && price > 0 && originalPrice > price) {
    offerPercent = Math.round(((originalPrice - price) / originalPrice) * 100);
  }

  const offer: NewProductInput["offer"] =
    offerType === "none"
      ? undefined
      : {
          type: offerType as "bogo" | "discount" | "custom",
          label:
            get("offerLabel") ||
            (offerType === "bogo"
              ? "BUY 1 GET 1 FREE"
              : offerType === "custom"
                ? "NEW"
                : offerPercent
                  ? `${offerPercent}% OFF`
                  : "SALE"),
          ...(offerType === "discount" && offerPercent ? { percent: offerPercent } : {}),
        };

  if (errors.length > 0) return { rowNumber, ok: false, title: title || undefined, errors };

  const candidate: NewProductInput = {
    title,
    description: get("description") || undefined,
    ...(offer ? { offer } : {}),
    ...(categoryIds.length ? { categoryIds } : {}),
    tags: splitList(get("tags")),
    type: get("type") || undefined,
    division: division || undefined,
    occasion: splitList(get("occasion")),
    style: splitList(get("style")),
    trend: splitList(get("trend")),
    material: get("material") || undefined,
    care: get("care") || undefined,
    colors: colorNames.map((name) => ({
      name,
      swatch: swatchFor(name),
      price,
      ...(originalPrice !== undefined ? { originalPrice } : {}),
      images,
      sizes: sizes.map((size, i) => ({ size, stock: stocks[i] ?? 0 })),
    })),
  };

  // Final gate: the exact schema the manual product form is validated with.
  const checked = productSchema.safeParse(candidate);
  if (!checked.success) {
    return {
      rowNumber,
      ok: false,
      title,
      errors: checked.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  return {
    rowNumber,
    ok: true,
    product: { ...checked.data, ...(collectionId ? { collectionId } : {}) },
    summary: {
      title,
      division: division || undefined,
      categories: categoryNames,
      collection: collectionTitle,
      colors: colorNames,
      sizes,
      price,
      originalPrice,
      images: images.length,
      offer: offer?.label,
    },
  };
}

export class ImportFileError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

/** Parse an uploaded .xlsx into per-row results. Throws ImportFileError on file-level problems. */
export async function parseImportFile(data: ArrayBuffer, ctx: ImportContext): Promise<ParsedImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(data);
  } catch {
    throw new ImportFileError("That file is not a readable .xlsx workbook. Download the template and try again.");
  }
  const ws = workbook.getWorksheet("Products");
  if (!ws) {
    throw new ImportFileError('No "Products" sheet found — use the downloaded template.');
  }
  // The 5MB cap is on the COMPRESSED file — refuse absurd decompressed shapes
  // (zip-bomb style) before walking millions of rows. Template tops out ~203.
  if (workbook.worksheets.length > 10 || ws.rowCount > 5000) {
    throw new ImportFileError("That workbook is far larger than the template allows — download a fresh template.");
  }
  const headerCheck = cellText(ws.getCell(1, COL_INDEX.title!).value);
  if (!headerCheck.toLowerCase().startsWith("title")) {
    throw new ImportFileError("The header row doesn't match the template. Download a fresh template and paste your rows in.");
  }

  const rows: ParsedImportRow[] = [];
  let filled = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const raw: Record<string, string> = {};
    let hasContent = false;
    for (const col of IMPORT_COLUMNS) {
      const text = cellText(ws.getCell(r, COL_INDEX[col.key]!).value);
      raw[col.key] = text;
      if (text) hasContent = true;
    }
    if (!hasContent) continue;
    if (isExampleRow(raw.title ?? "")) continue; // template example rows never import
    filled++;
    if (filled > IMPORT_MAX_ROWS) {
      throw new ImportFileError(
        `The file has more than ${IMPORT_MAX_ROWS} filled rows — split it into files of at most ${IMPORT_MAX_ROWS} products.`,
        400,
      );
    }
    rows.push(parseRow(r, raw, ctx));
  }
  return rows;
}

// --- Template generation ----------------------------------------------------------

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B1B1B" } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: "FFF5F2EC" }, size: 11 };

const TEMPLATE_DATA_ROWS = 200;
/** Example rows sit in rows 2–3; user data starts at row 4. */
const LAST_TEMPLATE_ROW = 3 + TEMPLATE_DATA_ROWS;

interface TemplateTaxonomy {
  categories: { handle: string; name: string }[];
  collections: { handle: string; title: string }[];
}

const listValidation = (
  range: string,
  strict: boolean,
  message: string,
): ExcelJS.DataValidation => ({
  type: "list",
  allowBlank: true,
  formulae: [range],
  showErrorMessage: strict,
  ...(strict ? { errorStyle: "stop", errorTitle: "Invalid value", error: message } : {}),
});

const wholeValidation = (min: number, max: number, message: string): ExcelJS.DataValidation => ({
  type: "whole",
  operator: "between",
  allowBlank: true,
  formulae: [min, max],
  showErrorMessage: true,
  errorStyle: "stop",
  errorTitle: "Invalid number",
  error: message,
});

function pickHandle(categories: { handle: string; name: string }[], ...preferred: string[]): string {
  for (const p of preferred) {
    const hit = categories.find((c) => c.handle.includes(p));
    if (hit) return hit.handle;
  }
  return categories[0]?.handle ?? "";
}

const UNSPLASH = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80`;

/** Build the downloadable .xlsx template (Products + Instructions + hidden Lists). */
export function buildTemplateWorkbook(taxonomy: TemplateTaxonomy): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Maison Admin";
  wb.created = new Date();

  // -- Lists sheet (validation sources; hidden) --
  const lists = wb.addWorksheet("Lists");
  const listCols: { letter: string; values: string[] }[] = [
    { letter: "A", values: [...DIVISIONS] },
    { letter: "B", values: taxonomy.categories.map((c) => c.handle) },
    { letter: "C", values: taxonomy.collections.map((c) => c.handle) },
    { letter: "D", values: Object.keys(SIZE_SETS) },
    { letter: "E", values: [...OFFER_TYPES] },
  ];
  for (const { letter, values } of listCols) {
    values.forEach((v, i) => {
      lists.getCell(`${letter}${i + 1}`).value = v;
    });
  }
  lists.state = "hidden";
  const listRange = (letter: string, count: number) => `Lists!$${letter}$1:$${letter}$${Math.max(count, 1)}`;

  // -- Products sheet --
  const ws = wb.addWorksheet("Products", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = IMPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
    cell.protection = { locked: true };
  });

  // -- Example rows (titles start with EXAMPLE so the importer skips them) --
  const dressCat = pickHandle(taxonomy.categories, "dress", "tops");
  const teeCat = pickHandle(taxonomy.categories, "t-shirt", "tee", "shirt", "tops");
  const exampleCollection = taxonomy.collections[0]?.handle ?? "";
  ws.addRow({
    title: "EXAMPLE — Satin Wrap Midi Dress (delete or overwrite; rows starting with EXAMPLE are skipped)",
    description: "A fluid satin midi with a true wrap waist and a soft cowl back. Falls to mid-calf.",
    division: "women",
    categories: dressCat,
    collection: exampleCollection,
    colors: "Claret, Ivory",
    sizeSet: "CLOTHING",
    sizes: "S, M, L",
    stock: "12, 18, 6",
    price: 1890,
    originalPrice: 2490,
    images: `${UNSPLASH("1566174053879-31528523f8ae")}, ${UNSPLASH("1595777457583-95e059d581b8")}`,
    occasion: "Going Out, Evening",
    style: "Wrap, Satin",
    trend: "Summer",
    tags: "new, bestseller",
    type: "Clothing",
    material: "95% polyester satin, 5% elastane",
    care: "Cold hand wash. Hang dry. Cool iron on reverse.",
    offerType: "discount",
    offerLabel: "24% OFF",
    offerPercent: 24,
  });
  ws.addRow({
    title: "EXAMPLE — Everyday Cotton Tee",
    description: "A relaxed-fit heavyweight tee in combed cotton.",
    division: "men",
    categories: teeCat,
    colors: "Black, White",
    sizeSet: "CLOTHING",
    sizes: "M, L, XL",
    stock: 20,
    price: 640,
    images: UNSPLASH("1521572163474-6864f9cf17ab"),
    tags: "basics",
    type: "Clothing",
    material: "100% combed cotton, 220gsm",
    care: "Machine wash cold with like colors.",
  });
  for (const r of [2, 3]) {
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell) => {
      cell.font = { italic: true, color: { argb: "FF8A8A8A" } };
    });
  }

  // -- Data validations on rows 2..LAST_TEMPLATE_ROW --
  const strictList = (key: string, range: string, message: string) => ({ key, dv: listValidation(range, true, message) });
  const looseList = (key: string, range: string) => ({ key, dv: listValidation(range, false, "") });
  const validations: { key: string; dv: ExcelJS.DataValidation }[] = [
    strictList("division", listRange("A", DIVISIONS.length), `Pick one of: ${DIVISIONS.join(", ")}`),
    // categories allow comma-separated multi-values → suggest, don't enforce
    ...(taxonomy.categories.length ? [looseList("categories", listRange("B", taxonomy.categories.length))] : []),
    ...(taxonomy.collections.length
      ? [strictList("collection", listRange("C", taxonomy.collections.length), "Pick a collection handle from the list (or leave blank).")]
      : []),
    strictList("sizeSet", listRange("D", Object.keys(SIZE_SETS).length), "Pick CLOTHING or SHOES."),
    strictList("offerType", listRange("E", OFFER_TYPES.length), `Pick one of: ${OFFER_TYPES.join(", ")} (or leave blank).`),
    { key: "price", dv: wholeValidation(1, 10_000_000, "Whole Taka amount, at least 1.") },
    { key: "originalPrice", dv: wholeValidation(1, 10_000_000, "Whole Taka amount, at least 1.") },
    { key: "offerPercent", dv: wholeValidation(1, 90, "Whole number between 1 and 90.") },
  ];
  for (const { key, dv } of validations) {
    const letter = colLetter(COL_INDEX[key]!);
    for (let r = 2; r <= LAST_TEMPLATE_ROW; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = dv;
    }
  }

  // -- Instructions sheet --
  const info = wb.addWorksheet("Instructions");
  info.columns = [{ width: 24 }, { width: 12 }, { width: 90 }, { width: 44 }];
  const addInfo = (values: (string | number)[], style?: (row: ExcelJS.Row) => void) => {
    const row = info.addRow(values);
    row.getCell(3).alignment = { wrapText: true, vertical: "top" };
    row.getCell(4).alignment = { wrapText: true, vertical: "top" };
    style?.(row);
    return row;
  };
  addInfo(["HOW TO BULK-IMPORT PRODUCTS"], (r) => {
    r.font = { bold: true, size: 14 };
  });
  addInfo([]);
  const guidance = [
    "1. Fill one row per product on the “Products” sheet. Columns marked * are required.",
    "2. Cells that hold several values (Colors, Sizes, Image URLs, Occasions…) are comma-separated: e.g. “S, M, L”.",
    "3. Grey dropdown columns (Division, Size Set, Offer Type, Collection) only accept listed values — pick from the dropdown.",
    "4. Category Handles suggests one handle in its dropdown; to assign several, type them comma-separated and ignore Excel's warning.",
    "5. The two grey EXAMPLE rows are skipped automatically — overwrite or delete them.",
    "6. All colors in a row share the row's price, sizes, stock and images. Need per-color prices? Import, then edit the product in the admin.",
    `7. Limits: at most ${IMPORT_MAX_ROWS} products per file, file size at most 5MB.`,
    "8. When done: Admin → Catalog → Import Products → drop this file → review the preview → Import.",
  ];
  for (const g of guidance) addInfo([g]);
  addInfo([]);
  addInfo(["Column", "Required", "What it is", "Example"], (r) => {
    r.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
    });
  });
  for (const c of IMPORT_COLUMNS) {
    addInfo([c.header.replace(" *", ""), c.required, c.explain, c.example]);
  }
  addInfo([]);
  addInfo(["Valid category handles", "", taxonomy.categories.map((c) => c.handle).join(", ") || "(none yet — create categories first)"]);
  addInfo(["Valid collection handles", "", taxonomy.collections.map((c) => c.handle).join(", ") || "(none)"]);
  addInfo(["Clothing sizes", "", SIZE_SETS.CLOTHING.join(", ")]);
  addInfo(["Shoe sizes", "", SIZE_SETS.SHOES.join(", ")]);

  return wb;
}
