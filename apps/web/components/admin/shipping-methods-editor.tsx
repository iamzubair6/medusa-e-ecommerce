"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import {
  checkoutConfigSchema,
  shippingOverrideFor,
  type CheckoutConfig,
  type ShippingMethodOverride,
} from "@/lib/checkout-config";
import type { AdminShippingRate } from "@/lib/medusa-admin";

/**
 * Shipping admin: the *amount* and *zone* are real Medusa data (edited live via
 * the Admin API), while the per-option `note` + `enabled` flags are a CMS
 * "checkout" override the checkout reads to relabel / hide options. Amounts and
 * overrides save independently so neither blocks the other.
 */
export function ShippingMethodsEditor({
  rates,
  config,
}: {
  rates: AdminShippingRate[];
  config: CheckoutConfig;
}) {
  const router = useRouter();
  const toast = useToast();

  // Amount drafts (Medusa side).
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(rates.map((r) => [r.id, String(r.amount)])),
  );
  // Override drafts (CMS side), seeded from existing config or defaults.
  const [overrides, setOverrides] = useState<Record<string, ShippingMethodOverride>>(
    Object.fromEntries(
      rates.map((r) => [
        r.id,
        shippingOverrideFor(config, r.id) ?? { optionId: r.id, note: "", enabled: true },
      ]),
    ),
  );

  const [busyAmount, setBusyAmount] = useState<string | null>(null);
  const [savingOverrides, setSavingOverrides] = useState(false);

  const patchOverride = (id: string, p: Partial<ShippingMethodOverride>) =>
    setOverrides((o) => ({ ...o, [id]: { ...o[id]!, ...p } }));

  const saveAmount = async (rate: AdminShippingRate) => {
    const amount = Number(amounts[rate.id]);
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Enter a valid amount.");
    setBusyAmount(rate.id);
    try {
      const res = await fetch(`/api/admin/shipping-options/${rate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Could not update rate");
      toast.success(`${rate.name} amount updated to ৳${amount}.`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyAmount(null);
    }
  };

  const saveOverrides = async () => {
    // Only persist overrides for options that still exist in Medusa.
    const shippingMethods = rates.map((r) => overrides[r.id]!);
    const next = checkoutConfigSchema.safeParse({ ...config, shippingMethods });
    if (!next.success) {
      toast.error(next.error.issues[0]?.message ?? "Invalid shipping config");
      return;
    }
    setSavingOverrides(true);
    try {
      const res = await fetch("/api/admin/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next.data),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Shipping display settings saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingOverrides(false);
    }
  };

  return (
    <Card className="flex max-w-2xl flex-col gap-4 p-6">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Truck className="h-4 w-4" /> Delivery options
      </h3>
      {rates.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No shipping options found. Add zones/options in Medusa admin → Settings → Locations &amp; Shipping.
        </p>
      )}
      {rates.map((rate) => {
        const ov = overrides[rate.id]!;
        return (
          <div key={rate.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{rate.name}</p>
              {rate.zone && <span className="text-xs text-muted-foreground">Zone: {rate.zone}</span>}
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">৳</span>
                <input
                  type="number"
                  value={amounts[rate.id] ?? ""}
                  onChange={(e) => setAmounts((a) => ({ ...a, [rate.id]: e.target.value }))}
                  className="h-10 w-24 rounded-sm border border-input bg-card px-2.5 text-sm"
                  aria-label={`${rate.name} amount`}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                loading={busyAmount === rate.id}
                disabled={String(rate.amount) === amounts[rate.id]}
                onClick={() => saveAmount(rate)}
              >
                Save amount
              </Button>
            </div>
            <TextField
              label="Checkout note (optional)"
              value={ov.note}
              placeholder="e.g. Delivered in 2–3 days"
              onChange={(e) => patchOverride(rate.id, { note: e.target.value })}
            />
            <CheckboxField
              label="Show at checkout"
              checked={ov.enabled}
              onChange={(e) => patchOverride(rate.id, { enabled: e.target.checked })}
            />
          </div>
        );
      })}
      {rates.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="gold" loading={savingOverrides} onClick={saveOverrides}>
            Save display settings
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Amounts edit the live Medusa option price. Notes &amp; visibility are a storefront override and
        do not change Medusa.
      </p>
    </Card>
  );
}
