"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, RotateCcw, Search } from "lucide-react";
import { Badge, Button, Card, CardContent, ConfirmDialog, buttonVariants, cn } from "@ecom/ui";
import { useToast } from "@/components/admin/toast";
import {
  posMoney,
  type PosOrderItem,
  type PosOrderView,
  type PosRefundLine,
} from "@/lib/pos-types";

/** Lookup by receipt number; ADMIN can select returned quantities and refund. */
export function OrdersLookup({ isAdmin }: { isAdmin: boolean }) {
  const toast = useToast();
  const [number, setNumber] = useState("");
  const [order, setOrder] = useState<PosOrderView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
  const [confirming, setConfirming] = useState(false);

  const lookup = useMutation({
    mutationFn: async (n: string): Promise<PosOrderView | null> => {
      const res = await fetch(`/api/pos/order?number=${encodeURIComponent(n)}`);
      const data = (await res.json()) as { order: PosOrderView | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      return data.order;
    },
    onSuccess: (found) => {
      setOrder(found);
      setNotFound(found === null);
      setReturnQty({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // How many of each (product, colour, size) were already returned — caps the
  // steppers so the same line can't be refunded twice.
  const alreadyReturned = new Map<string, number>();
  if (order) {
    for (const r of order.refunds) {
      for (const l of r.lines) {
        const key = `${l.productId ?? ""}|${l.color}|${l.size}`;
        alreadyReturned.set(key, (alreadyReturned.get(key) ?? 0) + l.quantity);
      }
    }
  }
  const returnableFor = (i: PosOrderItem) =>
    Math.max(0, i.quantity - (alreadyReturned.get(`${i.productId ?? ""}|${i.color}|${i.size}`) ?? 0));

  const selectedLines: PosRefundLine[] = order
    ? order.items
        .filter((i) => (returnQty[i.itemId] ?? 0) > 0)
        .map((i) => ({
          productId: i.productId,
          title: i.title,
          color: i.color,
          size: i.size,
          quantity: returnQty[i.itemId] ?? 0,
        }))
    : [];
  // Display estimate only — the API recomputes the amount from the order.
  const refundAmount = order
    ? order.items.reduce((sum, i) => {
        const qty = returnQty[i.itemId] ?? 0;
        return sum + (qty > 0 ? Math.round((i.total / i.quantity) * qty) : 0);
      }, 0)
    : 0;

  const refund = useMutation({
    mutationFn: async (): Promise<number> => {
      if (!order) throw new Error("No order");
      const res = await fetch("/api/pos/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId, lines: selectedLines }),
      });
      const data = (await res.json()) as { amount?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Refund failed");
      return data.amount ?? 0;
    },
    onSuccess: (amount) => {
      toast.success(`Refunded ${posMoney(amount)} — stock restored.`);
      setConfirming(false);
      setReturnQty({});
      if (number) lookup.mutate(number);
    },
    onError: (e: Error) => {
      setConfirming(false);
      toast.error(e.message);
    },
  });

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/pos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Counter
        </Link>
        <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Orders & returns
        </h1>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (number.trim()) lookup.mutate(number.trim());
        }}
      >
        <input
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Order number from the receipt (e.g. MSN-00042)"
          className="h-11 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" loading={lookup.isPending} disabled={!number.trim()}>
          <Search className="mr-1 h-4 w-4" /> Find
        </Button>
      </form>

      {notFound && (
        <p className="mt-4 text-sm text-muted-foreground">No order with that number.</p>
      )}

      {order && (
        <Card className="mt-5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-medium">
                  MSN-{String(order.displayId).padStart(5, "0")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}
                  {order.cashierName ? ` · sold by ${order.cashierName}` : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge>{order.channel === "pos" ? "Counter sale" : "Online"}</Badge>
                {order.paymentMethod && (
                  <span className="text-xs capitalize text-muted-foreground">
                    {order.paymentMethod.replace(/^pos_/, "")}
                    {order.txnId ? ` · ${order.txnId}` : ""}
                  </span>
                )}
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-2 border-t pt-4">
              {order.items.map((i) => {
                const qty = returnQty[i.itemId] ?? 0;
                return (
                  <li key={i.itemId} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {i.color} / {i.size} × {i.quantity} · {posMoney(i.total)}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Return
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={qty <= 0}
                          onClick={() =>
                            setReturnQty((prev) => ({ ...prev, [i.itemId]: qty - 1 }))
                          }
                          aria-label={`Return one less — ${i.title}`}
                        >
                          −
                        </Button>
                        <span className="w-5 text-center text-sm text-foreground tabular-nums">
                          {qty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={qty >= returnableFor(i)}
                          onClick={() =>
                            setReturnQty((prev) => ({ ...prev, [i.itemId]: qty + 1 }))
                          }
                          aria-label={`Return one more — ${i.title}`}
                        >
                          +
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-baseline justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Order total</span>
              <span className="font-display text-lg font-medium">{posMoney(order.total)}</span>
            </div>
            {order.refundedTotal > 0 && (
              <div className="mt-1 flex items-baseline justify-between text-sm text-muted-foreground">
                <span>Already refunded</span>
                <span>−{posMoney(order.refundedTotal)}</span>
              </div>
            )}

            {order.refunds.length > 0 && (
              <div className="mt-3 rounded-md bg-muted p-3 text-xs text-muted-foreground">
                {order.refunds.map((r, idx) => (
                  <p key={idx}>
                    {new Date(r.at).toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })} — {r.by}{" "}
                    refunded {posMoney(r.amount)}
                  </p>
                ))}
              </div>
            )}

            {isAdmin ? (
              <Button
                className="mt-4 w-full"
                variant="outline"
                disabled={selectedLines.length === 0 || refundAmount <= 0}
                onClick={() => setConfirming(true)}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Refund {refundAmount > 0 ? posMoney(refundAmount) : "…"} & restock
              </Button>
            ) : (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                Returns need an admin sign-in.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Refund ${posMoney(refundAmount)}?`}
        description={`${selectedLines
          .map((l) => `${l.title} (${l.color}/${l.size}) ×${l.quantity}`)
          .join(", ")} go back into stock. Hand the cash to the customer.`}
        confirmLabel="Record refund"
        cancelLabel="Back"
        destructive
        loading={refund.isPending}
        onConfirm={() => refund.mutate()}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}
