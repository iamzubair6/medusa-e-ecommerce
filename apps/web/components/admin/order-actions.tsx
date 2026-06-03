"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ecom/ui";
import { TextField } from "./fields";
import { useToast } from "./toast";
import type { AdminOrderDetail } from "@/lib/admin-types";

const DONE: Record<string, string> = {
  fulfil: "Order marked fulfilled.",
  ship: "Order marked shipped.",
  deliver: "Order marked delivered.",
  cancel: "Order canceled.",
};

export function OrderActions({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const toast = useToast();
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState<"fulfil" | "ship" | "deliver" | "cancel" | null>(null);

  const shipped = order.fulfillments.some((f) => f.shippedAt);
  const delivered = order.fulfillments.some((f) => f.deliveredAt);

  const run = async (action: "fulfil" | "ship" | "deliver" | "cancel") => {
    if (action === "cancel" && !confirm("Cancel this order? This cannot be undone.")) return;
    setBusy(action);
    try {
      const path =
        action === "fulfil" ? "fulfill" : action === "ship" ? "ship" : action === "deliver" ? "deliver" : "cancel";
      const url = `/api/admin/orders/${order.id}/${path}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "ship" ? JSON.stringify({ trackingNumber: tracking }) : undefined,
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Action failed");
      }
      toast.success(DONE[action]!);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (order.canceled) {
    return <p className="text-sm font-medium text-destructive">✕ Order canceled</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {!order.fulfilled && (
        <Button variant="solid" loading={busy === "fulfil"} onClick={() => run("fulfil")}>
          Mark Fulfilled
        </Button>
      )}

      {order.fulfilled && !shipped && (
        <div className="flex items-end gap-2">
          <TextField
            label="Tracking number"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="TRK123…"
            className="flex-1"
          />
          <Button variant="gold" loading={busy === "ship"} disabled={!tracking.trim()} onClick={() => run("ship")}>
            Mark Shipped
          </Button>
        </div>
      )}

      {shipped && (
        <p className="text-sm text-gold">
          Shipped · tracking: {order.fulfillments.flatMap((f) => f.trackingNumbers).join(", ") || "—"}
        </p>
      )}

      {shipped && !delivered && (
        <Button variant="solid" loading={busy === "deliver"} onClick={() => run("deliver")}>
          Mark Delivered {order.paymentMethod === "cod" && "(cash collected)"}
        </Button>
      )}

      {delivered && <p className="text-sm font-medium text-gold">✓ Delivered — order complete</p>}

      {!delivered && !shipped && (
        <Button
          variant="ghost"
          size="sm"
          loading={busy === "cancel"}
          onClick={() => run("cancel")}
          className="w-fit text-destructive hover:bg-destructive/10"
        >
          Cancel order
        </Button>
      )}

      {order.paymentMethod === "cod" && (
        <p className="text-xs text-muted-foreground">
          COD: no online payment to refund — settle any cash refund directly with the customer.
        </p>
      )}
    </div>
  );
}
