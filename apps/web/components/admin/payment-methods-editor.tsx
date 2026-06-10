"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import { checkoutConfigSchema, type CheckoutConfig, type PaymentMethod } from "@/lib/checkout-config";
import type { AdminPaymentProvider } from "@/lib/medusa-admin";

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "method";

/**
 * Admin editor for storefront payment methods (CMS "checkout" override). Each
 * method is a labelled radio the customer sees; all settle through Medusa's
 * manual provider for now (COD). `providers` are the Medusa providers that are
 * actually live — shown read-only so the merchant knows what truly settles.
 */
export function PaymentMethodsEditor({
  config,
  providers,
}: {
  config: CheckoutConfig;
  providers: AdminPaymentProvider[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>(config.paymentMethods);
  const [saving, setSaving] = useState(false);

  const patch = (i: number, p: Partial<PaymentMethod>) =>
    setMethods((m) => m.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const addMethod = () =>
    setMethods((m) => [...m, { id: `method-${m.length + 1}`, label: "New method", description: "", enabled: false }]);

  const removeMethod = (i: number) => setMethods((m) => m.filter((_, idx) => idx !== i));

  const save = async () => {
    // Keep the rest of the checkout config (shipping overrides) intact.
    const next = checkoutConfigSchema.safeParse({ ...config, paymentMethods: methods });
    if (!next.success) {
      toast.error(next.error.issues[0]?.message ?? "Invalid payment methods");
      return;
    }
    if (!next.data.paymentMethods.some((m) => m.enabled)) {
      toast.error("Enable at least one payment method.");
      return;
    }
    const ids = next.data.paymentMethods.map((m) => m.id);
    if (new Set(ids).size !== ids.length) {
      toast.error("Payment method ids must be unique.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next.data),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Payment methods saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-4 w-4" /> Payment methods at checkout
        </h3>
        {methods.length === 0 && (
          <p className="text-sm text-muted-foreground">No payment methods. Add one to accept orders.</p>
        )}
        {methods.map((m, i) => (
          <div key={i} className="flex flex-col gap-3 rounded-md border border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                label="Customer-facing label"
                value={m.label}
                onChange={(e) => patch(i, { label: e.target.value })}
              />
              <TextField
                label="Method id (order tag)"
                value={m.id}
                onChange={(e) => patch(i, { id: slug(e.target.value) })}
              />
            </div>
            <TextField
              label="Description"
              value={m.description}
              placeholder="Shown under the label at checkout"
              onChange={(e) => patch(i, { description: e.target.value })}
            />
            <div className="flex items-center justify-between">
              <CheckboxField
                label="Enabled"
                checked={m.enabled}
                onChange={(e) => patch(i, { enabled: e.target.checked })}
              />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeMethod(i)}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={addMethod}>
            <Plus className="h-4 w-4" /> Add method
          </Button>
          <Button type="button" variant="gold" loading={saving} onClick={save}>
            Save payment methods
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Every method settles through Medusa&apos;s manual provider (cash collected on delivery) and is
          tagged on the order by its id. Connect a real online gateway in Medusa to auto-capture funds.
        </p>
      </Card>

      <Card className="flex flex-col gap-2 p-5">
        <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <CreditCard className="h-4 w-4" /> Live Medusa providers
        </h3>
        {providers.length === 0 ? (
          <p className="py-1 text-sm text-muted-foreground">No providers reported (backend offline?).</p>
        ) : (
          providers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
            >
              <span className="font-mono text-xs">{p.id}</span>
              <span className={cn("text-xs", p.enabled ? "text-gold" : "text-muted-foreground")}>
                {p.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))
        )}
        <p className="pt-1 text-xs text-muted-foreground">
          Read-only. Enable gateways (Stripe / bKash / Nagad) per-region in Medusa admin.
        </p>
      </Card>
    </div>
  );
}
