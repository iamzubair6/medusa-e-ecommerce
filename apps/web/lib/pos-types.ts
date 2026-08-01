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
