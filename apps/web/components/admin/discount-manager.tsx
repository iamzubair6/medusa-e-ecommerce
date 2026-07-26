"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, ChevronRight } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, cn } from "@ecom/ui";
import { TextField, SelectField, CheckboxField } from "./fields";
import { DatePicker } from "./date-picker";
import { Combobox, EnumCombobox } from "./combobox";
import { PromoEditForm } from "./promo-edit-form";
import { useToast } from "./toast";
import type { AdminPromotionRow as Promotion } from "@/lib/medusa-admin";

interface Option {
  id: string;
  name: string;
}

type Method = "percentage" | "fixed" | "free_shipping" | "buyget";
type AppliesTo = "order" | "category" | "collection";

export function DiscountManager({
  promotions,
  categories,
  collections,
}: {
  promotions: Promotion[];
  categories: Option[];
  collections: Option[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [automatic, setAutomatic] = useState(false);
  const [method, setMethod] = useState<Method>("percentage");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("order");
  const [targetId, setTargetId] = useState("");
  const [value, setValue] = useState("");
  const [buyQty, setBuyQty] = useState("1");
  const [getQty, setGetQty] = useState("1");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [limitType, setLimitType] = useState<"none" | "total" | "per_customer">("none");
  const [limitCount, setLimitCount] = useState("1");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Promotion | null>(null);

  const needsValue = method === "percentage" || method === "fixed";
  const needsTarget = appliesTo !== "order";
  const isBogo = method === "buyget";
  const targets = appliesTo === "category" ? categories : appliesTo === "collection" ? collections : [];

  // BOGO must target a category/collection; free shipping defaults to whole order.
  const onMethodChange = (m: Method) => {
    setMethod(m);
    if (m === "buyget" && appliesTo === "order") setAppliesTo("category");
  };

  const create = async () => {
    if (!code.trim()) return toast.error("Add a code (or a name for an automatic promo).");
    if (needsValue && (!value || Number(value) <= 0)) return toast.error("Add a value.");
    if (needsTarget && !targetId) return toast.error("Pick a category or collection.");
    if (limitType !== "none" && (!limitCount || Number(limitCount) < 1)) return toast.error("Set how many uses are allowed.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          automatic,
          method,
          appliesTo,
          ...(needsValue ? { value: Number(value) } : {}),
          ...(needsTarget ? { targetId } : {}),
          ...(isBogo ? { buyQuantity: Number(buyQty), getQuantity: Number(getQty) } : {}),
          ...(startsAt ? { startsAt: new Date(`${startsAt}T00:00:00`).toISOString() } : {}),
          ...(endsAt ? { endsAt: new Date(`${endsAt}T23:59:59`).toISOString() } : {}),
          ...(limitType !== "none" ? { usageLimitType: limitType, usageLimit: Number(limitCount) } : {}),
        }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create promotion");
      toast.success(`${code.toUpperCase()} created.`);
      setCode("");
      setValue("");
      setTargetId("");
      setStartsAt("");
      setEndsAt("");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (id: string, init: RequestInit, done: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/promotions/${id}`, init);
      if (!res.ok) throw new Error("Action failed");
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const toggle = (p: Promotion) =>
    act(
      p.id,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: p.status === "active" ? "inactive" : "active" }),
      },
      p.status === "active" ? `${p.code} disabled.` : `${p.code} enabled.`,
    );

  const remove = async (p: Promotion) => {
    await act(p.id, { method: "DELETE" }, `${p.code} deleted.`);
    setConfirmingDelete(null);
  };

  const targetLabel = (p: Promotion) => {
    if (p.targetKind === "shipping") return "shipping cost";
    if (p.targetKind === "order") return "the entire order";
    const pool = p.targetKind === "category" ? categories : collections;
    const names = p.targetIds.map((id) => pool.find((o) => o.id === id)?.name ?? `(deleted ${p.targetKind})`);
    return `${p.targetKind === "category" ? "category" : "collection"} ${names.join(", ")}`;
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">New promotion</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={automatic ? "Name" : "Code"}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={automatic ? "SUMMER-SALE" : "WELCOME10"}
          />
          <SelectField label="Type" value={method} onChange={(e) => onMethodChange(e.target.value as Method)}>
            <option value="percentage">Percentage % off</option>
            <option value="fixed">Fixed ৳ off</option>
            <option value="free_shipping">Free shipping</option>
            <option value="buyget">Buy X get Y (BOGO)</option>
          </SelectField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Applies to"
            value={appliesTo}
            onChange={(e) => {
              setAppliesTo(e.target.value as AppliesTo);
              setTargetId("");
            }}
          >
            {!isBogo && <option value="order">Entire order</option>}
            <option value="category">A category</option>
            <option value="collection">A collection</option>
          </SelectField>
          {needsTarget && (
            <Combobox
              label={appliesTo === "category" ? "Category" : "Collection"}
              value={targetId}
              onChange={setTargetId}
              options={targets.map((t) => ({ value: t.id, label: t.name }))}
            />
          )}
        </div>

        {needsValue && (
          <TextField
            label={method === "percentage" ? "Percent (%)" : "Amount (৳)"}
            required
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={method === "percentage" ? "10" : "100"}
            className="sm:max-w-[12rem]"
          />
        )}

        {isBogo && (
          <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
            <TextField label="Buy quantity" type="number" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} />
            <TextField label="Get free" type="number" value={getQty} onChange={(e) => setGetQty(e.target.value)} />
          </div>
        )}

        <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
          <DatePicker label="Start date (optional)" value={startsAt} onChange={setStartsAt} />
          <DatePicker label="Expiry date (optional)" value={endsAt} onChange={setEndsAt} />
        </div>

        <div className="grid gap-4 sm:max-w-md sm:grid-cols-2">
          <EnumCombobox
            label="Usage limit"
            value={limitType}
            onChange={setLimitType}
            options={[
              { value: "none", label: "Unlimited" },
              { value: "total", label: "Max total uses" },
              { value: "per_customer", label: "Max uses per customer" },
            ]}
          />
          {limitType !== "none" && (
            <TextField
              label={limitType === "total" ? "Total uses allowed" : "Uses per customer (1 = one-time)"}
              type="number"
              value={limitCount}
              onChange={(e) => setLimitCount(e.target.value)}
            />
          )}
        </div>

        <CheckboxField label="Apply automatically (no code needed at checkout)" checked={automatic} onChange={(e) => setAutomatic(e.target.checked)} />
        {automatic && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Automatic promos re-apply to <strong>every new cart</strong> as long as they're active — set a usage
            limit above (e.g. 1 per customer) if each shopper should only benefit once.
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button variant="gold" loading={saving} onClick={create} className="w-fit">
            <Plus className="h-4 w-4" /> Create promotion
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isBogo
            ? "BOGO discounts the cheapest qualifying item(s) — applied automatically when the buy condition is met."
            : "Coded promos are entered at checkout; automatic promos apply on their own."}
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
              <th>Code</th>
              <th>Type</th>
              <th>Discount</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <Fragment key={p.id}>
                <tr className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3">
                  <td className="font-semibold tracking-wide">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
                      aria-expanded={expandedId === p.id}
                      aria-label={`${expandedId === p.id ? "Close" : "Open"} editor for ${p.code}`}
                      className="flex cursor-pointer items-center gap-1.5 hover:text-gold"
                    >
                      <ChevronRight
                        className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", expandedId === p.id && "rotate-90")}
                      />
                      {p.code}
                      {p.automatic && (
                        <span className="text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">auto</span>
                      )}
                    </button>
                  </td>
                  <td className="text-muted-foreground">{p.kind}</td>
                  <td>{p.display}</td>
                  <td>
                    <Badge variant={p.status === "active" ? "gold" : "muted"} className="capitalize">{p.status}</Badge>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" loading={busyId === p.id} onClick={() => toggle(p)}>
                        {p.status === "active" ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(p)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {expandedId === p.id && (
                  <tr className="border-b border-border bg-muted/30 last:border-0">
                    <td colSpan={5} className="px-4 py-4">
                      <PromoEditForm
                        promo={p}
                        appliesTo={targetLabel(p)}
                        onSaved={() => {
                          setExpandedId(null);
                          router.refresh();
                        }}
                        onCancel={() => setExpandedId(null)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No promotions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`Delete promotion ${confirmingDelete?.code ?? ""}?`}
        description="It stops applying to carts immediately. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={confirmingDelete !== null && busyId === confirmingDelete.id}
        onConfirm={() => {
          if (confirmingDelete) void remove(confirmingDelete);
        }}
        onCancel={() => setConfirmingDelete(null)}
      />
    </div>
  );
}
