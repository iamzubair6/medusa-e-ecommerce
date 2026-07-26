"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { Combobox, EnumCombobox } from "./combobox";
import { useToast } from "./toast";

interface PriceList {
  id: string;
  title: string;
  type: string;
  status: string;
  prices: number;
  startsAt?: string;
  endsAt?: string;
}
interface Option {
  id: string;
  name: string;
}
type AppliesTo = "all" | "category" | "collection";

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString() : "—");
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined);

export function PriceListManager({
  priceLists,
  categories,
  collections,
}: {
  priceLists: PriceList[];
  categories: Option[];
  collections: Option[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("all");
  const [targetId, setTargetId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<PriceList | null>(null);

  const targets = appliesTo === "category" ? categories : appliesTo === "collection" ? collections : [];

  const create = async () => {
    if (!title.trim()) return toast.error("Add a sale title.");
    if (!percentOff || Number(percentOff) <= 0) return toast.error("Add a discount %.");
    if (appliesTo !== "all" && !targetId) return toast.error("Pick a category or collection.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/price-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          percentOff: Number(percentOff),
          appliesTo,
          ...(appliesTo !== "all" ? { targetId } : {}),
          ...(startsAt ? { startsAt: toIso(startsAt) } : {}),
          ...(endsAt ? { endsAt: toIso(endsAt) } : {}),
        }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create sale");
      toast.success(`Sale "${title}" created.`);
      setTitle("");
      setPercentOff("");
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

  const remove = async (p: PriceList) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/price-lists/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete");
      toast.success("Sale removed.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
      setConfirmingDelete(null);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">New sale</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Sale title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Eid Sale" />
          <TextField label="Discount (%)" type="number" value={percentOff} onChange={(e) => setPercentOff(e.target.value)} placeholder="30" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <EnumCombobox
            label="Applies to"
            value={appliesTo}
            onChange={(v) => {
              setAppliesTo(v);
              setTargetId("");
            }}
            options={[
              { value: "all", label: "All products" },
              { value: "category", label: "A category" },
              { value: "collection", label: "A collection" },
            ]}
          />
          {appliesTo !== "all" && (
            <Combobox
              label={appliesTo === "category" ? "Category" : "Collection"}
              clearable
              value={targetId}
              onChange={setTargetId}
              options={targets.map((t) => ({ value: t.id, label: t.name }))}
            />
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Starts (optional)" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <TextField label="Ends (optional)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Button variant="gold" loading={saving} onClick={create} className="w-fit">
          <Plus className="h-4 w-4" /> Create sale
        </Button>
        <p className="text-xs text-muted-foreground">
          Sale prices apply instantly on the storefront (struck-through original). Delete the sale to revert.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
              <th>Sale</th>
              <th>Products</th>
              <th>Window</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {priceLists.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3">
                <td className="font-semibold">{p.title}</td>
                <td className="text-muted-foreground">{p.prices} variants</td>
                <td className="text-muted-foreground">{fmtDate(p.startsAt)} → {fmtDate(p.endsAt)}</td>
                <td>
                  <Badge variant={p.status === "active" ? "gold" : "muted"} className="capitalize">{p.status}</Badge>
                </td>
                <td>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" loading={busyId === p.id} onClick={() => setConfirmingDelete(p)} className="text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {priceLists.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No sales yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`Delete sale "${confirmingDelete?.title ?? ""}"?`}
        description="Prices revert to normal on the storefront."
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
