"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Badge, Button, Card } from "@ecom/ui";
import { TextField, SelectField, CheckboxField } from "./fields";
import { useToast } from "./toast";

interface Promotion {
  id: string;
  code: string;
  status: string;
  automatic: boolean;
  kind: string;
  display: string;
}
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
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
        }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create promotion");
      toast.success(`${code.toUpperCase()} created.`);
      setCode("");
      setValue("");
      setTargetId("");
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

  const remove = (p: Promotion) => {
    if (!confirm(`Delete promotion ${p.code}?`)) return;
    act(p.id, { method: "DELETE" }, `${p.code} deleted.`);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">New promotion</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label={automatic ? "Name" : "Code"}
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
            <SelectField label={appliesTo === "category" ? "Category" : "Collection"} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Select…</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </SelectField>
          )}
        </div>

        {needsValue && (
          <TextField
            label={method === "percentage" ? "Percent (%)" : "Amount (৳)"}
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

        <CheckboxField label="Apply automatically (no code needed at checkout)" checked={automatic} onChange={(e) => setAutomatic(e.target.checked)} />

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
              <tr key={p.id} className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3">
                <td className="font-semibold tracking-wide">
                  {p.code}
                  {p.automatic && <span className="ml-2 text-[0.6rem] font-medium uppercase tracking-wide text-muted-foreground">auto</span>}
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
                    <Button variant="ghost" size="sm" onClick={() => remove(p)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No promotions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
