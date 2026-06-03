/** Pure admin types shared between server (medusa-admin) and client admin UI. */

export interface AdminOrderSummary {
  id: string;
  displayId: number;
  email: string;
  total: string;
  createdAt: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paymentMethod?: string; // "cod" | "card" from cart metadata
  itemCount: number;
}

export interface AdminOrderItem {
  id: string;
  title: string;
  variant?: string;
  quantity: number;
  total: string;
  thumbnail?: string;
}

export interface AdminFulfillment {
  id: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumbers: string[];
}

export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: string;
  shippingTotal: string;
  items: AdminOrderItem[];
  address?: {
    name: string;
    line1?: string;
    city?: string;
    postalCode?: string;
    country?: string;
    phone?: string;
  };
  fulfillments: AdminFulfillment[];
  fulfilled: boolean;
  canceled: boolean;
}

export interface AdminPromotion {
  id: string;
  code: string;
  status: string;
  type: string;
  value?: number;
  valueType?: string;
}

export interface AdminCustomer {
  id: string;
  email: string;
  name: string;
  orders: number;
  createdAt: string;
}

export interface DashboardStats {
  revenue: string;
  orders: number;
  products: number;
  customers: number;
  pendingFulfilment: number;
}
