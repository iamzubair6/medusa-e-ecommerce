"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import type { Address } from "@/lib/customer-auth";

interface Draft {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  phone: string;
}

const empty: Draft = { firstName: "", lastName: "", address1: "", address2: "", city: "", postalCode: "", phone: "" };
const toDraft = (a: Address): Draft => ({
  firstName: a.firstName,
  lastName: a.lastName,
  address1: a.address1,
  address2: a.address2 ?? "",
  city: a.city,
  postalCode: a.postalCode,
  phone: a.phone ?? "",
});

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startNew = () => { setEditing("new"); setDraft(empty); setError(null); };
  const startEdit = (a: Address) => { setEditing(a.id); setDraft(toDraft(a)); setError(null); };

  const input = "h-11 w-full rounded-sm border border-input bg-card px-3 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  const save = async () => {
    setError(null);
    if (!draft.firstName || !draft.lastName || !draft.address1 || !draft.city || !draft.postalCode) {
      return setError("Fill in name, address, city and postal code.");
    }
    setSaving(true);
    try {
      const url = editing === "new" ? "/api/account/addresses" : `/api/account/addresses/${editing}`;
      const res = await fetch(url, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, address2: draft.address2 || undefined, phone: draft.phone || undefined, countryCode: "bd" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Could not save address");
      }
      setEditing(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><MapPin className="h-4 w-4" /> Addresses</h2>
        {editing === null && (
          <Button variant="outline" size="sm" onClick={startNew}><Plus className="h-4 w-4" /> Add</Button>
        )}
      </div>

      {editing !== null && (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/30 p-4">
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="First name" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
            <input className={input} placeholder="Last name" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
          </div>
          <input className={input} placeholder="Address" value={draft.address1} onChange={(e) => setDraft({ ...draft, address1: e.target.value })} />
          <input className={input} placeholder="Apartment, suite (optional)" value={draft.address2} onChange={(e) => setDraft({ ...draft, address2: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="City" value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            <input className={input} placeholder="Postal code" value={draft.postalCode} onChange={(e) => setDraft({ ...draft, postalCode: e.target.value })} />
          </div>
          <input className={input} placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button variant="solid" loading={saving} onClick={save}>Save</Button>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {addresses.length === 0 && editing === null && <p className="text-sm text-muted-foreground">No saved addresses yet.</p>}

      <div className="flex flex-col gap-3">
        {addresses.map((a) => (
          <div key={a.id} className="flex items-start justify-between rounded-md border border-border p-4 text-sm">
            <div>
              <p className="font-medium">{a.firstName} {a.lastName}</p>
              <p className="text-muted-foreground">{a.address1}{a.address2 ? `, ${a.address2}` : ""}</p>
              <p className="text-muted-foreground">{[a.city, a.postalCode, a.countryCode].filter(Boolean).join(", ")}</p>
              {a.phone && <p className="text-muted-foreground">{a.phone}</p>}
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(a)} aria-label="Edit" className="cursor-pointer p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(a.id)} aria-label="Delete" className="cursor-pointer p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
