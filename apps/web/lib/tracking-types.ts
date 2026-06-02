/** Sanitized order/parcel status for the public tracker (no PII beyond what
 * the requester already supplied to look it up). */

export interface TrackingNumber {
  number: string;
  url?: string;
}

export interface TrackingFulfillment {
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingNumbers: TrackingNumber[];
}

export interface OrderTracking {
  displayId: number;
  placedAt: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  total: string;
  items: { title: string; quantity: number; thumbnail?: string }[];
  fulfillments: TrackingFulfillment[];
}
