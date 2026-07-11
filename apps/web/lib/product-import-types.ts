/**
 * Client-safe types shared between the bulk product import API routes and the
 * admin import UI. Keep this file free of server-only imports (exceljs lives
 * in lib/product-import.ts).
 */

/** Compact, display-ready description of a parsed row (shown in the preview table). */
export interface ImportRowSummary {
  title: string;
  division?: string;
  categories: string[];
  collection?: string;
  colors: string[];
  sizes: string[];
  price: number;
  originalPrice?: number;
  images: number;
  offer?: string;
}

export type ImportPreviewRow =
  | { rowNumber: number; ok: true; product: ImportRowSummary }
  | { rowNumber: number; ok: false; title?: string; errors: string[] };

export interface ImportPreviewResponse {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportPreviewRow[];
}

export interface ImportCommitResponse {
  created: { rowNumber: number; id: string; title: string }[];
  failed: { rowNumber: number; title: string; errors: string[] }[];
}

/** Hard caps enforced by the API (and pre-checked client-side). */
export const IMPORT_MAX_ROWS = 200;
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
