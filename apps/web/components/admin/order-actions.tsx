"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@ecom/ui";
import { TextField } from "./fields";
import type { AdminOrderDetail } from "@/lib/admin-types";

export function OrderActions({ order }: { order: AdminOrderDetail }) {
  const router = useRouter();
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState<"fulfil" | "ship" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const shipped = order.fulfillments.some((f) => f.shippedAt);

  const run = async (action: "fulfil" | "ship") => {
    setBusy(action);
    setError(null);
    try {
      const url = action === "fulfil" ? `/api/admin/orders/${order.id}/fulfill` : `/api/admin/orders/${order.id}/ship`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "ship" ? JSON.stringify({ trackingNumber: tracking }) : undefined,
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Action failed");
      }
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

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

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
