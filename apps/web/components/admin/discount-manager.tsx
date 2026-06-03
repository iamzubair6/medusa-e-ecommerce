"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Badge, Button, Card } from "@ecom/ui";
import { TextField, SelectField } from "./fields";
import { useToast } from "./toast";

interface Promotion {
  id: string;
  code: string;
  status: string;
  valueType: string;
  display: string;
}

export function DiscountManager({ promotions }: { promotions: Promotion[] }) {
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("");
  const [valueType, setValueType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const create = async () => {
    if (!code.trim()) return toast.error("Add a discount code.");
    if (!value || Number(value) <= 0) return toast.error("Add a value.");
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, valueType, value: Number(value) }),
      });
      const data = (await res.json()) as { error?: unknown };
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not create discount");
      toast.success(`Discount ${code.toUpperCase()} created.`);
      setCode("");
      setValue("");
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
    if (!confirm(`Delete discount ${p.code}?`)) return;
    act(p.id, { method: "DELETE" }, `${p.code} deleted.`);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">New discount code</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField label="Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" />
          <SelectField label="Type" value={valueType} onChange={(e) => setValueType(e.target.value as typeof valueType)}>
            <option value="percentage">Percentage %</option>
            <option value="fixed">Fixed ৳ off</option>
          </SelectField>
          <TextField
            label={valueType === "percentage" ? "Percent" : "Amount (৳)"}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={valueType === "percentage" ? "10" : "100"}
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="gold" loading={saving} onClick={create} className="w-fit">
            <Plus className="h-4 w-4" /> Create code
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Customers enter the code at checkout. Applies across the order total.</p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50 text-left">
            <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
              <th>Code</th>
              <th>Discount</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 [&>td]:px-4 [&>td]:py-3">
                <td className="font-semibold tracking-wide">{p.code}</td>
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
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No discount codes yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
