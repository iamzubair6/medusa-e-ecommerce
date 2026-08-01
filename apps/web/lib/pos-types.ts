/**
 * POS shapes shared between the server domain layer (lib/pos.ts) and the
 * client counter UI. Pure types/constants only — no server imports.
 */

export interface PosSize {
  size: string;
  /** null = untracked (admin never set stock for this combination) */
  stock: number | null;
  variantId: string;
  sku?: string;
}
export interface PosColor {
  name: string;
  swatch?: string;
  price: number;
  sizes: PosSize[];
}
export interface PosProduct {
  id: string;
  title: string;
  handle: string;
  thumbnail?: string;
  colors: PosColor[];
}

export interface PosSaleLine {
  productId: string;
  variantId: string;
  title: string;
  color: string;
  size: string;
  quantity: number;
}

export interface OversellWarning {
  title: string;
  color: string;
  size: string;
  requested: number;
  available: number;
}

export interface PosCustomerMatch {
  customerId: string;
  email: string | null;
  name: string;
  phone: string | null;
}

export type PosPaymentMethod = "cash" | "bkash" | "nagad";

export interface PosSaleSuccess {
  orderId: string;
  displayId: number;
  total: number;
  discountTotal: number;
  currency: string;
}

/** BDT money for counter surfaces (server totals are plain decimal amounts). */
export function posMoney(amount: number): string {
  return `৳${Math.round(amount).toLocaleString("en-US")}`;
}

// --- Order lookup, returns & day report -------------------------------------

export interface PosRefundLine {
  productId: string | null;
  title: string;
  color: string;
  size: string;
  quantity: number;
}

export interface PosRefund {
  /** ISO timestamp of the refund. */
  at: string;
  /** Cashier (admin) who processed it. */
  by: string;
  amount: number;
  lines: PosRefundLine[];
}

export interface PosOrderItem {
  itemId: string;
  productId: string | null;
  title: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PosOrderView {
  orderId: string;
  displayId: number;
  createdAt: string;
  total: number;
  discountTotal: number;
  email: string;
  /** "pos" for counter sales; online orders are viewable too (for returns). */
  channel: string;
  paymentMethod?: string;
  txnId?: string;
  cashierName?: string;
  items: PosOrderItem[];
  refunds: PosRefund[];
  refundedTotal: number;
}

export interface PosDayRow {
  displayId: number;
  createdAt: string;
  total: number;
  method: string;
  txnId?: string;
  cashier: string;
}

export interface PosDayReport {
  /** YYYY-MM-DD in Asia/Dhaka. */
  date: string;
  rows: PosDayRow[];
  refunds: (PosRefund & { displayId: number })[];
  totals: {
    gross: number;
    cash: number;
    bkash: number;
    nagad: number;
    refunded: number;
    net: number;
    count: number;
  };
  byCashier: { name: string; count: number; total: number }[];
}
