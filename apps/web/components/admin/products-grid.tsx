"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog, cn } from "@ecom/ui";
import { useToast } from "./toast";

export interface ProductGridItem {
  id: string;
  title: string;
  handle: string;
  status: string;
  thumbnail?: string;
  price: string;
}

/** Product grid with multi-select + bulk publish/unpublish/delete. */
export function ProductsGrid({ products }: { products: ProductGridItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clear = () => setSelected(new Set());
  const allSelected = products.length > 0 && selected.size === products.length;

  const run = async (action: "publish" | "unpublish" | "delete") => {
    setBusy(true);
    setConfirmDelete(false);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action }),
      });
      const d = (await res.json().catch(() => ({}))) as { done?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Bulk action failed");
      toast.success(`${d.done ?? 0} updated${d.failed ? `, ${d.failed} failed` : ""}.`);
      clear();
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* bulk action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={() => (allSelected ? clear() : setSelected(new Set(products.map((p) => p.id))))}
            className="h-4 w-4 accent-[hsl(var(--accent))]"
          />
          Select all
        </label>
        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" loading={busy} onClick={() => run("publish")}>
              Publish
            </Button>
            <Button size="sm" variant="outline" loading={busy} onClick={() => run("unpublish")}>
              Unpublish
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Delete
            </Button>
            <button type="button" onClick={clear} className="text-xs text-muted-foreground underline-offset-2 hover:underline">
              Clear
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const isSel = selected.has(p.id);
          return (
            <Card key={p.id} className={cn("group relative overflow-hidden", isSel && "ring-2 ring-accent")}>
              {/* selection checkbox */}
              <button
                type="button"
                aria-label={isSel ? "Deselect" : "Select"}
                aria-pressed={isSel}
                onClick={() => toggle(p.id)}
                className={cn(
                  "absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                  isSel ? "border-accent bg-accent text-accent-foreground" : "border-white/80 bg-background/70 hover:border-accent",
                )}
              >
                {isSel && <Check className="h-3.5 w-3.5" />}
              </button>
              <Link href={`/admin/products/${p.id}/edit`} className="block">
                <div className="relative aspect-[3/4] bg-muted">
                  {p.thumbnail && <Image src={p.thumbnail} alt={p.title} fill sizes="200px" className="object-cover" />}
                  {p.status !== "published" && (
                    <Badge variant="muted" className="absolute right-2 top-2 capitalize">{p.status}</Badge>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-foreground/0 opacity-0 transition group-hover:bg-foreground/40 group-hover:opacity-100">
                    <span className="flex items-center gap-1.5 rounded-sm bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-sm font-medium">{p.title}</p>
                  <p className="text-sm font-bold">{p.price}</p>
                </div>
              </Link>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${selected.size} product${selected.size === 1 ? "" : "s"}?`}
        description="This permanently removes the selected products from your catalog."
        confirmLabel="Delete"
        destructive
        loading={busy}
        onConfirm={() => run("delete")}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
