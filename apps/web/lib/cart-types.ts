/** Pure cart/checkout types shared between server (medusa-store) and client UI. */

export interface CartLine {
  id: string;
  title: string;
  option?: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  thumbnail?: string;
  handle?: string;
}

export interface ShippingOptionView {
  id: string;
  name: string;
  amount: string;
  /** Optional admin-managed checkout helper copy (CMS "checkout" override). */
  note?: string;
}

export interface CartView {
  id: string;
  email?: string;
  currency: string;
  itemCount: number;
  items: CartLine[];
  subtotal: string;
  shippingTotal: string;
  discountTotal: string;
  /** non-zero discount? (drives whether the discount row shows) */
  hasDiscount: boolean;
  promoCodes: string[];
  total: string;
  hasShipping: boolean;
}

export interface CompletedOrder {
  id: string;
  displayId: number;
  email: string;
  total: string;
  currency: string;
}
