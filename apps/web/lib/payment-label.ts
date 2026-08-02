/**
 * Admin display for an order's payment. Counter sales settle at the till
 * (cash/wallet/card terminal) — Medusa's payment_status stays "not_paid"
 * because no gateway payment exists, so the label comes from the POS
 * payment_method metadata instead.
 */
const POS_METHODS: Record<string, string> = {
  pos_cash: "Paid at counter — Cash",
  pos_bkash: "Paid at counter — bKash",
  pos_nagad: "Paid at counter — Nagad",
  pos_card: "Paid at counter — Card",
};

export function paymentLabel(method: string | undefined, status: string): string {
  if (method === "cod") return "COD";
  if (method && POS_METHODS[method]) return POS_METHODS[method];
  return status;
}

/** Short badge form for dense tables. */
export function paymentBadge(method: string | undefined, status: string): string {
  if (method === "cod") return "COD";
  if (method?.startsWith("pos_")) return `POS ${method.slice(4)} ✓`;
  return status;
}

export const isPosPaid = (method: string | undefined): boolean => !!method && method in POS_METHODS;
