"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Upload } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { TextField } from "../fields";
import { useToast } from "../toast";

export interface AdminNavItem {
  label: string;
  href: string;
  megaMenu?: unknown;
}

interface LinkRow {
  label: string;
  href: string;
}
interface Column {
  heading: string;
  links: LinkRow[];
}
interface Featured {
  url: string;
  label: string;
  href: string;
}
interface Item {
  label: string;
  href: string;
  open: boolean;
  columns: Column[];
  featured: Featured | null;
}

type RawMega = {
  columns?: { heading?: string; links?: { label: string; href: string }[] }[];
  featured?: { media?: { url?: string }; label?: string; href?: string };
};

function toItem(it: AdminNavItem): Item {
  const mm = (it.megaMenu ?? null) as RawMega | null;
  return {
    label: it.label,
    href: it.href,
    open: false,
    columns: (mm?.columns ?? []).map((c) => ({
      heading: c.heading ?? "",
      links: (c.links ?? []).map((l) => ({ label: l.label, href: l.href })),
    })),
    featured: mm?.featured?.media?.url
      ? { url: mm.featured.media.url, label: mm.featured.label ?? "", href: mm.featured.href ?? "" }
      : null,
  };
}

export function NavEditor({ menuKey, items }: { menuKey: string; items: AdminNavItem[] }) {
  const router = useRouter();
  const toast = useToast();
  const [list, setList] = useState<Item[]>(items.map(toItem));
  const [saving, setSaving] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);

  const update = (i: number, patch: Partial<Item>) => setList((l) => l.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) =>
    setList((l) => {
      const j = i + dir;
      if (j < 0 || j >= l.length) return l;
      const copy = [...l];
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      return copy;
    });

  const setColumns = (i: number, columns: Column[]) => update(i, { columns });
  const setFeatured = (i: number, featured: Featured | null) => update(i, { featured });

  const uploadFeatured = async (i: number, files: FileList) => {
    setUploadingFor(i);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const data = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !data.urls?.[0]) throw new Error(data.error ?? "Upload failed");
      setFeatured(i, { url: data.urls[0], label: list[i]?.featured?.label ?? "", href: list[i]?.featured?.href ?? "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploadingFor(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payloadItems = list
        .filter((it) => it.label.trim() && it.href.trim())
        .map((it) => {
          const columns = it.columns
            .map((c) => ({ heading: c.heading.trim() || undefined, links: c.links.filter((l) => l.label.trim() && l.href.trim()) }))
            .filter((c) => c.links.length);
          const featured = it.featured?.url && it.featured.href ? { media: { url: it.featured.url }, label: it.featured.label, href: it.featured.href } : undefined;
          const megaMenu = columns.length || featured ? { columns, ...(featured ? { featured } : {}) } : undefined;
          return { label: it.label, href: it.href, megaMenu };
        });
      const res = await fetch(`/api/admin/nav/${menuKey}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });
      if (!res.ok) throw new Error("Save failed — check links and mega-menu fields.");
      toast.success("Navigation saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const sub = "h-10 w-full rounded-sm border border-input bg-card px-2.5 text-sm focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <div className="flex flex-col gap-3">
      {list.map((it, i) => (
        <Card key={i} className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col pt-7">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => move(i, 1)} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:opacity-30">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Label" value={it.label} onChange={(e) => update(i, { label: e.target.value })} placeholder="Women" />
                <TextField label="Link" value={it.href} onChange={(e) => update(i, { href: e.target.value })} placeholder="/c/women" />
              </div>

              <button
                type="button"
                onClick={() => update(i, { open: !it.open })}
                className="flex w-fit cursor-pointer items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {it.open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Mega-menu dropdown {it.columns.length > 0 && `(${it.columns.length} columns)`}
              </button>

              {it.open && (
                <div className="flex flex-col gap-4 rounded-md border border-border bg-muted/30 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {it.columns.map((col, ci) => (
                      <div key={ci} className="flex flex-col gap-2 rounded-sm border border-border bg-card p-3">
                        <div className="flex items-center gap-2">
                          <input
                            className={sub}
                            placeholder="Column heading (e.g. Clothing)"
                            value={col.heading}
                            onChange={(e) => setColumns(i, it.columns.map((c, k) => (k === ci ? { ...c, heading: e.target.value } : c)))}
                          />
                          <button type="button" aria-label="Remove column" onClick={() => setColumns(i, it.columns.filter((_, k) => k !== ci))} className="cursor-pointer p-1.5 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        {col.links.map((lnk, li) => (
                          <div key={li} className="flex items-center gap-1.5">
                            <input
                              className={sub}
                              placeholder="Label"
                              value={lnk.label}
                              onChange={(e) => setColumns(i, it.columns.map((c, k) => (k === ci ? { ...c, links: c.links.map((l, m) => (m === li ? { ...l, label: e.target.value } : l)) } : c)))}
                            />
                            <input
                              className={sub}
                              placeholder="/c/dresses"
                              value={lnk.href}
                              onChange={(e) => setColumns(i, it.columns.map((c, k) => (k === ci ? { ...c, links: c.links.map((l, m) => (m === li ? { ...l, href: e.target.value } : l)) } : c)))}
                            />
                            <button type="button" aria-label="Remove link" onClick={() => setColumns(i, it.columns.map((c, k) => (k === ci ? { ...c, links: c.links.filter((_, m) => m !== li) } : c)))} className="cursor-pointer p-1 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setColumns(i, it.columns.map((c, k) => (k === ci ? { ...c, links: [...c.links, { label: "", href: "" }] } : c)))}
                          className="flex w-fit cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add link
                        </button>
                      </div>
                    ))}
                  </div>
                  {it.columns.length < 4 && (
                    <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setColumns(i, [...it.columns, { heading: "", links: [{ label: "", href: "" }] }])}>
                      <Plus className="h-4 w-4" /> Add column
                    </Button>
                  )}

                  <div className="flex flex-col gap-2 border-t border-border pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Featured tile (optional)</span>
                    <div className="flex flex-wrap items-center gap-3">
                      {it.featured?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.featured.url} alt="" className="h-16 w-16 rounded-sm border border-border object-cover" />
                      ) : null}
                      <label className={cn("flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-dashed border-border px-3 text-xs text-muted-foreground hover:border-foreground", uploadingFor === i && "opacity-50")}>
                        <Upload className="h-4 w-4" />
                        {uploadingFor === i ? "Uploading…" : it.featured?.url ? "Replace image" : "Upload image"}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingFor === i} onChange={(e) => e.target.files && uploadFeatured(i, e.target.files)} />
                      </label>
                      {it.featured && (
                        <button type="button" onClick={() => setFeatured(i, null)} className="cursor-pointer text-xs text-muted-foreground underline hover:text-destructive">
                          Remove
                        </button>
                      )}
                    </div>
                    {it.featured?.url && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className={sub} placeholder="Tile label" value={it.featured.label} onChange={(e) => setFeatured(i, { ...it.featured!, label: e.target.value })} />
                        <input className={sub} placeholder="/collections/new" value={it.featured.href} onChange={(e) => setFeatured(i, { ...it.featured!, href: e.target.value })} />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button type="button" variant="ghost" size="icon" aria-label="Remove item" className="mt-6" onClick={() => setList((l) => l.filter((_, k) => k !== i))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setList((l) => [...l, { label: "", href: "", open: false, columns: [], featured: null }])}>
        <Plus className="h-4 w-4" /> Add link
      </Button>

      <div>
        <Button type="button" variant="gold" loading={saving} onClick={save}>
          Save navigation
        </Button>
      </div>
    </div>
  );
}
