"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag, Tag, Trash2, UserRound, X } from "lucide-react";
import { Badge, Button, ConfirmDialog, cn } from "@ecom/ui";
import { useToast } from "@/components/admin/toast";
import type { FinishedSale } from "./counter";
import {
  posMoney,
  type OversellWarning,
  type PosCustomerMatch,
  type PosPaymentMethod,
  type PosSaleLine,
  type PosSaleSuccess,
} from "@/lib/pos-types";

export interface PosCartLine extends PosSaleLine {
  unitPrice: number;
  thumbnail?: string;
}

interface Props {
  cart: PosCartLine[];
  setCart: React.Dispatch<React.SetStateAction<PosCartLine[]>>;
  isAdmin: boolean;
  onComplete: (sale: FinishedSale) => void;
}

const METHODS: { id: PosPaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "card", label: "Card" },
];

const TXN_PLACEHOLDER: Record<Exclude<PosPaymentMethod, "cash">, string> = {
  bkash: "bKash TXN id",
  nagad: "Nagad TXN id",
  card: "Card approval ref / last 4",
};

export function CartPanel({ cart, setCart, isAdmin, onComplete }: Props) {
  const toast = useToast();
  // Phone (< md): the panel is a slide-up sheet opened from a bottom summary
  // bar. Desktop (md+): it is the always-visible right pane; `open` is ignored.
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<PosPaymentMethod>("cash");
  const [txnId, setTxnId] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoCodes, setPromoCodes] = useState<string[]>([]);
  const [manualPct, setManualPct] = useState("");
  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<PosCustomerMatch | null>(null);
  const [customerMiss, setCustomerMiss] = useState(false);
  const [warnings, setWarnings] = useState<OversellWarning[] | null>(null);

  const pct = isAdmin ? Math.min(90, Math.max(0, Number.parseInt(manualPct, 10) || 0)) : 0;
  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const estimated = pct > 0 ? Math.round((subtotal * (100 - pct)) / 100) : subtotal;

  const lookup = useMutation({
    mutationFn: async (p: string): Promise<PosCustomerMatch | null> => {
      const res = await fetch(`/api/pos/customer?phone=${encodeURIComponent(p)}`);
      if (!res.ok) throw new Error("lookup");
      return ((await res.json()) as { customer: PosCustomerMatch | null }).customer;
    },
    onSuccess: (match) => {
      setCustomer(match);
      setCustomerMiss(match === null);
    },
    onError: () => toast.error("Customer lookup failed."),
  });

  const checkout = useMutation({
    mutationFn: async (force: boolean): Promise<PosSaleSuccess> => {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: cart.map(({ unitPrice: _p, thumbnail: _t, ...line }) => line),
          payment: { method, ...(txnId.trim() ? { txnId: txnId.trim() } : {}) },
          ...(promoCodes.length ? { promoCodes } : {}),
          ...(pct > 0 ? { manualDiscountPct: pct } : {}),
          ...(customer || phone.trim()
            ? {
                customer: {
                  ...(customer ? { customerId: customer.customerId } : {}),
                  ...(customer?.email ? { email: customer.email } : {}),
                  ...(phone.trim() ? { phone: phone.trim() } : {}),
                },
              }
            : {}),
          ...(force ? { force: true } : {}),
        }),
      });
      const data = (await res.json()) as PosSaleSuccess & {
        error?: string;
        warnings?: OversellWarning[];
      };
      if (res.status === 409 && data.warnings?.length) {
        setWarnings(data.warnings);
        throw new Error("oversell");
      }
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      return data;
    },
    onSuccess: (result) => {
      onComplete({
        result,
        // Prefer the order's own priced lines (manual discount/promos applied);
        // fall back to the cart snapshot if the detail read came back empty.
        lines: result.lines.length
          ? result.lines
          : cart.map((l) => ({
              title: l.title,
              color: l.color,
              size: l.size,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              total: l.unitPrice * l.quantity,
            })),
        payment: { method, ...(txnId.trim() ? { txnId: txnId.trim() } : {}) },
        customerName: customer?.name,
        soldAt: new Date().toLocaleString("en-GB", { hour12: true }),
      });
      setPromoCodes([]);
      setManualPct("");
      setTxnId("");
      setPhone("");
      setCustomer(null);
      setCustomerMiss(false);
    },
    onError: (error: Error) => {
      if (error.message !== "oversell") toast.error(error.message);
    },
  });

  const updateQty = (variantId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) =>
          l.variantId === variantId
            ? { ...l, quantity: Math.min(99, Math.max(0, l.quantity + delta)) }
            : l,
        )
        .filter((l) => l.quantity > 0),
    );
  };

  const addPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    if (!promoCodes.includes(code) && promoCodes.length < 3) setPromoCodes((p) => [...p, code]);
    setPromoInput("");
  };

  const needsTxn = method !== "cash" && !txnId.trim();
  const itemCount = cart.reduce((n, l) => n + l.quantity, 0);

  return (
    <>
      {/* Phone-only bottom summary bar — opens the cart sheet. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-30 border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden",
          open && "hidden",
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-full items-center justify-between rounded-lg bg-foreground px-5 text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={`Open cart — ${itemCount} item${itemCount === 1 ? "" : "s"}, ${posMoney(estimated)}`}
        >
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <ShoppingBag className="h-5 w-5" aria-hidden />
            {itemCount === 0 ? "Cart empty" : `${itemCount} item${itemCount === 1 ? "" : "s"}`}
          </span>
          <span className="font-display text-lg font-medium tabular-nums">{posMoney(estimated)}</span>
        </button>
      </div>

      <aside
        className={cn(
          "flex flex-col bg-background",
          // Desktop: exactly the original static right pane (no transform, so
          // fixed-position children keep the viewport as containing block).
          "md:w-[380px] md:shrink-0 md:border-l",
          // Phone: full-screen sheet sliding up from the bottom bar.
          "max-md:fixed max-md:inset-0 max-md:z-40 max-md:transition-transform max-md:duration-300 motion-reduce:max-md:transition-none",
          open ? "max-md:translate-y-0" : "max-md:translate-y-full",
        )}
      >
      <div className="flex items-center justify-between border-b px-4 py-2 md:py-3">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Current sale
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close cart"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No items yet — search or scan a product to start.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {cart.map((l) => (
              <li key={l.variantId} className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.color} · {l.size} · {posMoney(l.unitPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-11 w-11 md:h-7 md:w-7" onClick={() => updateQty(l.variantId, -1)} aria-label="Less">
                    <Minus className="h-4 w-4 md:h-3 md:w-3" />
                  </Button>
                  <span className="w-7 text-center text-sm tabular-nums md:w-6">{l.quantity}</span>
                  <Button variant="outline" size="icon" className="h-11 w-11 md:h-7 md:w-7" onClick={() => updateQty(l.variantId, 1)} aria-label="More">
                    <Plus className="h-4 w-4 md:h-3 md:w-3" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 text-muted-foreground md:h-7 md:w-7"
                  onClick={() => setCart((prev) => prev.filter((x) => x.variantId !== l.variantId))}
                  aria-label="Remove line"
                >
                  <Trash2 className="h-4 w-4 md:h-3.5 md:w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Adjustments + payment */}
      <div className="flex flex-col gap-3 border-t px-4 py-3 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {/* Customer attach */}
        <div>
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setCustomer(null);
                setCustomerMiss(false);
              }}
              placeholder="Customer phone (optional)"
              inputMode="tel"
              className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-11 md:h-9"
              onClick={() => phone.trim().length >= 6 && lookup.mutate(phone.trim())}
              loading={lookup.isPending}
              disabled={phone.trim().length < 6}
            >
              <UserRound className="mr-1 h-3.5 w-3.5" /> Find
            </Button>
          </div>
          {customer && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              Attached: <span className="font-medium text-foreground">{customer.name}</span>
              <button
                type="button"
                className="ml-2 underline"
                onClick={() => {
                  setCustomer(null);
                  setCustomerMiss(false);
                }}
              >
                detach
              </button>
            </p>
          )}
          {customerMiss && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              No account with that phone — selling as walk-in.
            </p>
          )}
        </div>

        {/* Promo codes */}
        <div>
          <div className="flex gap-2">
            <input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPromo()}
              placeholder="Promo code"
              className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9"
            />
            <Button variant="outline" size="sm" className="h-11 md:h-9" onClick={addPromo} disabled={!promoInput.trim()}>
              <Tag className="mr-1 h-3.5 w-3.5" /> Apply
            </Button>
          </div>
          {promoCodes.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {promoCodes.map((code) => (
                <Badge key={code} className="gap-1">
                  {code}
                  <button
                    type="button"
                    onClick={() => setPromoCodes((p) => p.filter((c) => c !== code))}
                    aria-label={`Remove ${code}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* ADMIN manual discount */}
        {isAdmin && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Manual discount</span>
            <input
              value={manualPct}
              onChange={(e) => setManualPct(e.target.value.replace(/\D/g, "").slice(0, 2))}
              placeholder="0"
              inputMode="numeric"
              className="h-11 w-16 rounded-md border bg-background px-2 text-right text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-8 md:w-14"
            />
            <span className="text-muted-foreground">%</span>
          </label>
        )}

        {/* Payment method */}
        <div className="grid grid-cols-4 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={cn(
                "h-12 rounded-md border text-sm font-medium transition-colors md:h-10",
                method === m.id ? "border-foreground bg-foreground text-background" : "bg-background",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        {method !== "cash" && (
          <input
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder={TXN_PLACEHOLDER[method]}
            className="h-11 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-9"
          />
        )}

        {/* Totals + charge */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">
            {promoCodes.length > 0 ? "Estimated (before codes)" : pct > 0 ? `After ${pct}% off` : "Total"}
          </span>
          <span className="font-display text-2xl font-medium tabular-nums">{posMoney(estimated)}</span>
        </div>
        <Button
          size="lg"
          className="w-full"
          disabled={cart.length === 0 || needsTxn}
          loading={checkout.isPending}
          onClick={() => checkout.mutate(false)}
        >
          Charge {METHODS.find((m) => m.id === method)?.label}
        </Button>
      </div>
      </aside>

      <ConfirmDialog
        open={warnings !== null}
        title="Stock is lower than the cart"
        description={
          warnings
            ?.map((w) => `${w.title} (${w.color} / ${w.size}): ${w.available} tracked, selling ${w.requested}`)
            .join(" · ") ?? ""
        }
        confirmLabel="Sell anyway"
        cancelLabel="Back"
        destructive
        loading={checkout.isPending}
        onConfirm={() => {
          setWarnings(null);
          checkout.mutate(true);
        }}
        onCancel={() => setWarnings(null)}
      />
    </>
  );
}
