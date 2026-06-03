"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { useToast } from "./toast";

interface Rate {
  id: string;
  name: string;
  amount: number;
}

export function ShippingEditor({ rates }: { rates: Rate[] }) {
  const router = useRouter();
  const toast = useToast();
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(rates.map((r) => [r.id, String(r.amount)])),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const save = async (rate: Rate) => {
    const amount = Number(draft[rate.id]);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Enter a valid amount.");
    setBusyId(rate.id);
    try {
      const res = await fetch(`/api/admin/shipping-options/${rate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Could not update rate");
      toast.success(`${rate.name} updated to ৳${amount}.`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="flex flex-col gap-4 p-5">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Truck className="h-4 w-4" /> Delivery rates
      </h3>
      {rates.length === 0 && <p className="text-sm text-muted-foreground">No shipping options found.</p>}
      {rates.map((rate) => (
        <div key={rate.id} className="flex items-end gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">{rate.name}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">৳</span>
            <input
              type="number"
              value={draft[rate.id] ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, [rate.id]: e.target.value }))}
              className="h-10 w-24 rounded-sm border border-input bg-card px-2.5 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={busyId === rate.id}
            disabled={String(rate.amount) === draft[rate.id]}
            onClick={() => save(rate)}
          >
            Save
          </Button>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">Add new zones/options in Medusa admin → Settings → Locations &amp; Shipping.</p>
    </Card>
  );
}
