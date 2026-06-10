"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import type { Navigation, NavCollection, NavColumn } from "@/lib/navigation";

export function NavigationBuilder({ initial }: { initial: Navigation }) {
  const router = useRouter();
  const toast = useToast();
  const [nav, setNav] = useState<Navigation>(initial);
  const [divIdx, setDivIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  const div = nav.divisions[divIdx];

  const patchDiv = (patch: Partial<Navigation["divisions"][number]>) =>
    setNav((n) => ({ ...n, divisions: n.divisions.map((d, i) => (i === divIdx ? { ...d, ...patch } : d)) }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/navigation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nav),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Navigation saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (!div) return null;
  const cols = div.collections;
  const setCollections = (next: NavCollection[]) => patchDiv({ collections: next });
  const patchCollection = (ci: number, patch: Partial<NavCollection>) =>
    setCollections(cols.map((c, i) => (i === ci ? { ...c, ...patch } : c)));

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {/* Division tabs */}
      <div className="flex flex-wrap gap-2">
        {nav.divisions.map((d, i) => (
          <button
            key={d.handle}
            type="button"
            onClick={() => setDivIdx(i)}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              i === divIdx ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
            )}
          >
            {d.label || d.handle}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Division label" value={div.label} onChange={(e) => patchDiv({ label: e.target.value })} />
          <TextField label="Badge (optional, e.g. NEW)" value={div.badge} onChange={(e) => patchDiv({ badge: e.target.value })} />
        </div>
        <p className="text-xs text-muted-foreground">Handle: <code>{div.handle}</code> · page <code>/pages/{div.handle}</code></p>
      </Card>

      {/* Collections for this division */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Collections (mega-menu items)</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setCollections([...cols, { label: "New collection", href: "/collections/new", highlight: false, columns: [] }])}>
          <Plus className="h-4 w-4" /> Add collection
        </Button>
      </div>
      {cols.length === 0 && <p className="text-sm text-muted-foreground">No collections yet — the navbar falls back to the auto menu for this division. Add one to take over.</p>}

      {cols.map((c, ci) => (
        <Card key={ci} className="flex flex-col gap-4 p-5">
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField label="Collection label" value={c.label} onChange={(e) => patchCollection(ci, { label: e.target.value })} />
            <TextField label="Link" value={c.href} onChange={(e) => patchCollection(ci, { href: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove collection" onClick={() => setCollections(cols.filter((_, i) => i !== ci))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <CheckboxField label="Highlight (red, e.g. Sale)" checked={c.highlight} onChange={(e) => patchCollection(ci, { highlight: e.target.checked })} />

          {/* Popover columns */}
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Popover columns</span>
            <Button type="button" variant="outline" size="sm" onClick={() => patchCollection(ci, { columns: [...c.columns, { heading: "", links: [] }] })}>
              <Plus className="h-4 w-4" /> Add column
            </Button>
          </div>
          {c.columns.map((col, coli) => (
            <ColumnEditor
              key={coli}
              column={col}
              onChange={(next) => patchCollection(ci, { columns: c.columns.map((x, i) => (i === coli ? next : x)) })}
              onRemove={() => patchCollection(ci, { columns: c.columns.filter((_, i) => i !== coli) })}
            />
          ))}
        </Card>
      ))}

      <Button variant="gold" loading={saving} onClick={save} className="w-fit">Save navigation</Button>
    </div>
  );
}

function ColumnEditor({ column, onChange, onRemove }: { column: NavColumn; onChange: (c: NavColumn) => void; onRemove: () => void }) {
  const links = column.links;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <div className="flex items-end gap-2">
        <TextField className="flex-1" label="Column heading" value={column.heading} onChange={(e) => onChange({ ...column, heading: e.target.value })} placeholder="Shop By Style" />
        <Button type="button" variant="ghost" size="icon" aria-label="Remove column" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {links.map((l, li) => (
        <div key={li} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <TextField label="Link label" value={l.label} onChange={(e) => onChange({ ...column, links: links.map((x, i) => (i === li ? { ...x, label: e.target.value } : x)) })} />
          <TextField label="Link URL" value={l.href} onChange={(e) => onChange({ ...column, links: links.map((x, i) => (i === li ? { ...x, href: e.target.value } : x)) })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove link" onClick={() => onChange({ ...column, links: links.filter((_, i) => i !== li) })}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange({ ...column, links: [...links, { label: "", href: "" }] })}>
        <Plus className="h-4 w-4" /> Add link
      </Button>
    </div>
  );
}
