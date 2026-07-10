/**
 * Branded order numbers. Medusa's display_id is a bare sequence (1, 2, 3…);
 * customers see it formatted as e.g. "MSN-00042" everywhere (emails, success
 * page, tracking, admin). parse accepts anything a customer might type back.
 */
export const ORDER_ID_PREFIX = "MSN";

export function formatOrderId(displayId: number): string {
  return `${ORDER_ID_PREFIX}-${String(displayId).padStart(5, "0")}`;
}

/** "MSN-00042", "msn 42", "#42", "00042" → 42; null when nothing numeric. */
export function parseOrderId(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}
