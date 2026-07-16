"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Globe2, MapPin, Pencil, Plus, Trash2, Truck, X } from "lucide-react";
import { Button, Card, cn, ConfirmDialog } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import {
  checkoutConfigSchema,
  shippingOverrideFor,
  type CheckoutConfig,
  type ShippingMethodOverride,
} from "@/lib/checkout-config";
import type { AdminShippingRate, AdminShippingZone } from "@/lib/medusa-admin";

/**
 * Shipping admin: zones (name + countries), the options inside each zone and
 * their *amounts* are real Medusa data managed live via the Admin API, while the
 * per-option `note` + `enabled` flags are a CMS "checkout" override the checkout
 * reads to relabel / hide options. Amounts and overrides save independently.
 */

const ISO2 = /^[a-z]{2}$/i;
const parseCountries = (v: string): string[] => [
  ...new Set(
    v
      .split(/[,\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  ),
];

const zoneFormSchema = z.object({
  name: z.string().trim().min(1, "Zone name is required").max(60),
  countries: z.string().refine((v) => {
    const list = parseCountries(v);
    return list.length > 0 && list.every((c) => ISO2.test(c));
  }, "Use 2-letter ISO codes separated by commas — e.g. BD, IN, AE"),
});
type ZoneFormValues = z.infer<typeof zoneFormSchema>;

const optionFormSchema = z.object({
  name: z.string().trim().min(1, "Option name is required").max(60),
  amount: z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) <= 100000, "Enter a whole ৳ amount (0–100,000)"),
});
type OptionFormValues = z.infer<typeof optionFormSchema>;

async function api(url: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Request failed");
  }
}

/** Create or edit a service zone (name + country list). */
function ZoneForm({ zone, onDone }: { zone?: AdminShippingZone; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ZoneFormValues>({
    resolver: zodResolver(zoneFormSchema),
    defaultValues: {
      name: zone?.name ?? "",
      countries: zone ? zone.countries.map((c) => c.toUpperCase()).join(", ") : "BD",
    },
  });

  const submit = async (values: ZoneFormValues) => {
    const countries = parseCountries(values.countries);
    try {
      if (zone) {
        await api(`/api/admin/shipping-options/zones/${zone.id}`, "PATCH", { name: values.name, countries });
        toast.success(`Zone "${values.name}" updated.`);
      } else {
        await api("/api/admin/shipping-options/zones", "POST", { name: values.name, countries });
        toast.success(`Zone "${values.name}" created — now add a shipping option to it.`);
      }
      onDone();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4"
    >
      <TextField
        label="Zone name"
        required
        placeholder="e.g. South Asia"
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="Countries (ISO-2 codes, comma-separated)"
        required
        placeholder="BD, IN, AE"
        error={errors.countries?.message}
        {...register("countries")}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="solid" size="sm" loading={isSubmitting}>
          {zone ? "Save zone" : "Create zone"}
        </Button>
      </div>
    </form>
  );
}

/** Add a flat-rate shipping option inside a zone. */
function AddOptionForm({ zoneId, onDone }: { zoneId: string; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OptionFormValues>({
    resolver: zodResolver(optionFormSchema),
    defaultValues: { name: "", amount: "" },
  });

  const submit = async (values: OptionFormValues) => {
    try {
      await api("/api/admin/shipping-options", "POST", {
        name: values.name,
        amount: Number(values.amount),
        serviceZoneId: zoneId,
      });
      toast.success(`"${values.name}" added — it's now offered at checkout.`);
      onDone();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-muted/30 p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row">
        <TextField
          label="Option name"
          required
          placeholder="e.g. Express Delivery"
          className="flex-1"
          error={errors.name?.message}
          {...register("name")}
        />
        <TextField
          label="Flat rate (৳)"
          required
          inputMode="numeric"
          placeholder="150"
          className="sm:w-36"
          error={errors.amount?.message}
          {...register("amount")}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="solid" size="sm" loading={isSubmitting}>
          Add option
        </Button>
      </div>
    </form>
  );
}

export function ShippingMethodsEditor({
  zones,
  rates,
  config,
}: {
  zones: AdminShippingZone[];
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
  const [busyDelete, setBusyDelete] = useState<string | null>(null);
  const [savingOverrides, setSavingOverrides] = useState(false);
  const [addingZone, setAddingZone] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [addingOptionZoneId, setAddingOptionZoneId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    { kind: "option"; rate: AdminShippingRate } | { kind: "zone"; zone: AdminShippingZone } | null
  >(null);

  // Options created after mount (router.refresh) won't be in the seeded state —
  // always fall back to live props so a fresh row never crashes or shows blank.
  const overrideFor = (id: string): ShippingMethodOverride =>
    overrides[id] ?? shippingOverrideFor(config, id) ?? { optionId: id, note: "", enabled: true };
  const amountFor = (r: AdminShippingRate): string => amounts[r.id] ?? String(r.amount);

  const patchOverride = (id: string, p: Partial<ShippingMethodOverride>) =>
    setOverrides((o) => ({ ...o, [id]: { ...overrideFor(id), ...p } }));

  const ratesFor = (zoneId: string) => rates.filter((r) => r.zoneId === zoneId);
  const zoneIds = new Set(zones.map((z) => z.id));
  const unzoned = rates.filter((r) => !r.zoneId || !zoneIds.has(r.zoneId));

  const saveAmount = async (rate: AdminShippingRate) => {
    const amount = Number(amountFor(rate));
    if (!Number.isFinite(amount) || amount < 0) return toast.error("Enter a valid amount.");
    setBusyAmount(rate.id);
    try {
      await api(`/api/admin/shipping-options/${rate.id}`, "PATCH", { amount });
      toast.success(`${rate.name} amount updated to ৳${amount}.`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyAmount(null);
    }
  };

  const deleteOption = async (rate: AdminShippingRate) => {
    setBusyDelete(rate.id);
    try {
      await api(`/api/admin/shipping-options/${rate.id}`, "DELETE");
      toast.success(`"${rate.name}" deleted.`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyDelete(null);
      setPendingDelete(null);
    }
  };

  const deleteZone = async (zone: AdminShippingZone) => {
    setBusyDelete(zone.id);
    try {
      await api(`/api/admin/shipping-options/zones/${zone.id}`, "DELETE");
      toast.success(`Zone "${zone.name}" deleted.`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyDelete(null);
      setPendingDelete(null);
    }
  };

  const saveOverrides = async () => {
    // Only persist overrides for options that still exist in Medusa.
    const shippingMethods = rates.map((r) => overrideFor(r.id));
    const next = checkoutConfigSchema.safeParse({ ...config, shippingMethods });
    if (!next.success) {
      toast.error(next.error.issues[0]?.message ?? "Invalid shipping config");
      return;
    }
    setSavingOverrides(true);
    try {
      await api("/api/admin/checkout", "POST", next.data);
      toast.success("Shipping display settings saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingOverrides(false);
    }
  };

  const renderRate = (rate: AdminShippingRate) => {
    const ov = overrideFor(rate.id);
    return (
      <div key={rate.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-sm font-medium", !ov.enabled && "text-muted-foreground line-through")}>
            {rate.name}
          </p>
          <Button
            variant="ghost"
            size="sm"
            loading={busyDelete === rate.id}
            onClick={() => setPendingDelete({ kind: "option", rate })}
            aria-label={`Delete ${rate.name}`}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">৳</span>
            <input
              type="number"
              value={amountFor(rate)}
              onChange={(e) => setAmounts((a) => ({ ...a, [rate.id]: e.target.value }))}
              className="h-10 w-24 rounded-sm border border-input bg-card px-2.5 text-sm"
              aria-label={`${rate.name} amount`}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={busyAmount === rate.id}
            disabled={String(rate.amount) === amountFor(rate)}
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
  };

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Truck className="h-4 w-4" /> Delivery zones &amp; options
        </h3>
        {!addingZone && (
          <Button variant="outline" size="sm" onClick={() => setAddingZone(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add zone
          </Button>
        )}
      </div>

      {addingZone && <ZoneForm onDone={() => setAddingZone(false)} />}

      {zones.length === 0 && !addingZone && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <MapPin className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No delivery zones yet. Create a zone (e.g. “Bangladesh”), then add shipping options to it.
          </p>
          <Button variant="solid" size="sm" onClick={() => setAddingZone(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add your first zone
          </Button>
        </Card>
      )}

      {zones.map((zone) => {
        const zoneRates = ratesFor(zone.id);
        return (
          <Card key={zone.id} className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Globe2 className="h-4 w-4 text-muted-foreground" /> {zone.name}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {zone.countries.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingZoneId(editingZoneId === zone.id ? null : zone.id)}
                  aria-label={`Edit zone ${zone.name}`}
                >
                  {editingZoneId === zone.id ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                </Button>
                {zoneRates.length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={busyDelete === zone.id}
                    onClick={() => setPendingDelete({ kind: "zone", zone })}
                    aria-label={`Delete zone ${zone.name}`}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {editingZoneId === zone.id && <ZoneForm zone={zone} onDone={() => setEditingZoneId(null)} />}

            {zoneRates.length === 0 && addingOptionZoneId !== zone.id && (
              <p className="text-sm text-muted-foreground">
                No shipping options in this zone yet — it won&apos;t appear at checkout until one is added.
              </p>
            )}
            {zoneRates.map(renderRate)}

            {addingOptionZoneId === zone.id ? (
              <AddOptionForm zoneId={zone.id} onDone={() => setAddingOptionZoneId(null)} />
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => setAddingOptionZoneId(zone.id)}
              >
                <Plus className="mr-1 h-4 w-4" /> Add shipping option
              </Button>
            )}
          </Card>
        );
      })}

      {unzoned.length > 0 && (
        <Card className="flex flex-col gap-4 p-6">
          <p className="text-sm font-semibold">Other options</p>
          {unzoned.map(renderRate)}
        </Card>
      )}

      {rates.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" variant="gold" loading={savingOverrides} onClick={saveOverrides}>
            Save display settings
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Zones, options and amounts edit live Medusa data and apply to checkout immediately. Notes &amp;
        “show at checkout” are a storefront display override and do not change Medusa.
      </p>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.kind === "zone"
            ? `Delete zone "${pendingDelete.zone.name}"?`
            : `Delete "${pendingDelete?.rate.name ?? ""}"?`
        }
        description={
          pendingDelete?.kind === "zone"
            ? "The zone is removed from live Medusa data. This cannot be undone."
            : "It disappears from checkout immediately."
        }
        confirmLabel="Delete"
        destructive
        loading={busyDelete !== null}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.kind === "zone") void deleteZone(pendingDelete.zone);
          else void deleteOption(pendingDelete.rate);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
