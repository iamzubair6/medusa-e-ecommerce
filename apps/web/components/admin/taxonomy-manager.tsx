"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check, X, Pencil } from "lucide-react";
import { Badge, Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { useToast } from "./toast";

interface Category {
  id: string;
  name: string;
  handle: string;
  isActive: boolean;
  products: number;
}
interface Collection {
  id: string;
  title: string;
  handle: string;
  products: number;
}

export function TaxonomyManager({
  categories,
  collections,
}: {
  categories: Category[];
  collections: Collection[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [newCat, setNewCat] = useState("");
  const [newCol, setNewCol] = useState("");
  const [savingCat, setSavingCat] = useState(false);
  const [savingCol, setSavingCol] = useState(false);
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  const call = async (url: string, init: RequestInit, done: string) => {
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Action failed");
      }
      toast.success(done);
      router.refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };

  const createCat = async () => {
    if (!newCat.trim()) return toast.error("Add a category name.");
    setSavingCat(true);
    const ok = await call("/api/admin/categories", post({ name: newCat }), `Category "${newCat}" created.`);
    if (ok) setNewCat("");
    setSavingCat(false);
  };
  const createCol = async () => {
    if (!newCol.trim()) return toast.error("Add a collection title.");
    setSavingCol(true);
    const ok = await call("/api/admin/collections", post({ title: newCol }), `Collection "${newCol}" created.`);
    if (ok) setNewCol("");
    setSavingCol(false);
  };

  const saveRename = async (kind: "categories" | "collections", id: string) => {
    if (!editing?.value.trim()) return;
    const body = kind === "categories" ? { name: editing.value } : { title: editing.value };
    const ok = await call(`/api/admin/${kind}/${id}`, patch(body), "Renamed.");
    if (ok) setEditing(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Categories */}
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Categories</h3>
        <p className="text-xs text-muted-foreground">Shown on the storefront nav & <code>/c/&lt;handle&gt;</code> pages.</p>
        <div className="flex items-end gap-2">
          <TextField label="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Accessories" className="flex-1" />
          <Button variant="gold" loading={savingCat} onClick={createCat}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2.5 text-sm">
              {editing?.id === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ id: c.id, value: e.target.value })}
                    className="h-9 flex-1 rounded-sm border border-input bg-card px-2.5"
                  />
                  <button onClick={() => saveRename("categories", c.id)} className="cursor-pointer p-1 text-gold" aria-label="Save"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(null)} className="cursor-pointer p-1 text-muted-foreground" aria-label="Cancel"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.handle} · {c.products} products</span>
                  </div>
                  {!c.isActive && <Badge variant="muted">hidden</Badge>}
                  <button onClick={() => setEditing({ id: c.id, value: c.name })} className="cursor-pointer p-1 text-muted-foreground hover:text-foreground" aria-label="Rename"><Pencil className="h-3.5 w-3.5" /></button>
                  <button
                    onClick={() => call(`/api/admin/categories/${c.id}`, patch({ isActive: !c.isActive }), c.isActive ? "Hidden." : "Shown.")}
                    className="cursor-pointer px-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {c.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    onClick={() => confirm(`Delete category "${c.name}"?`) && call(`/api/admin/categories/${c.id}`, { method: "DELETE" }, "Category deleted.")}
                    className="cursor-pointer p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
          {categories.length === 0 && <li className="py-3 text-sm text-muted-foreground">No categories yet.</li>}
        </ul>
      </Card>

      {/* Collections */}
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Collections</h3>
        <p className="text-xs text-muted-foreground">Curated edits, shown at <code>/collections/&lt;handle&gt;</code>.</p>
        <div className="flex items-end gap-2">
          <TextField label="New collection" value={newCol} onChange={(e) => setNewCol(e.target.value)} placeholder="Summer Edit" className="flex-1" />
          <Button variant="gold" loading={savingCol} onClick={createCol}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <ul className="flex flex-col divide-y divide-border">
          {collections.map((c) => (
            <li key={c.id} className="flex items-center gap-2 py-2.5 text-sm">
              {editing?.id === c.id ? (
                <>
                  <input
                    autoFocus
                    value={editing.value}
                    onChange={(e) => setEditing({ id: c.id, value: e.target.value })}
                    className="h-9 flex-1 rounded-sm border border-input bg-card px-2.5"
                  />
                  <button onClick={() => saveRename("collections", c.id)} className="cursor-pointer p-1 text-gold" aria-label="Save"><Check className="h-4 w-4" /></button>
                  <button onClick={() => setEditing(null)} className="cursor-pointer p-1 text-muted-foreground" aria-label="Cancel"><X className="h-4 w-4" /></button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="font-medium">{c.title}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{c.handle} · {c.products} products</span>
                  </div>
                  <button onClick={() => setEditing({ id: c.id, value: c.title })} className="cursor-pointer p-1 text-muted-foreground hover:text-foreground" aria-label="Rename"><Pencil className="h-3.5 w-3.5" /></button>
                  <button
                    onClick={() => confirm(`Delete collection "${c.title}"?`) && call(`/api/admin/collections/${c.id}`, { method: "DELETE" }, "Collection deleted.")}
                    className="cursor-pointer p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
          {collections.length === 0 && <li className="py-3 text-sm text-muted-foreground">No collections yet.</li>}
        </ul>
      </Card>
    </div>
  );
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const patch = (body: unknown): RequestInit => ({
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
