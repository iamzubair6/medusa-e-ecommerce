"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import type { SizeGuide, SizeGuidesSetting } from "@/lib/size-guides";
import { TextField, TextareaField } from "./fields";
import { MediaUploadField } from "./media-upload-field";

/**
 * Editor for the FN-style structured size guides. Follows the site-settings
 * editor's controlled-state pattern; the Zod parse happens server-side on
 * save. Measurement cells are entered in INCHES — the storefront's cm toggle
 * converts automatically.
 */
export function SizeGuidesEditor({
  initial,
  categoryHandles,
}: {
  initial: SizeGuidesSetting;
  categoryHandles: string[];
}) {
  const [guides, setGuides] = useState<SizeGuide[]>(initial.guides);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const set = (i: number, patch: Partial<SizeGuide>) =>
    setGuides((g) => g.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const addGuide = () =>
    setGuides((g) => [
      ...g,
      {
        id: `guide-${g.length + 1}-${g.map((x) => x.id).join("").length}`,
        title: "New Size Guide",
        categories: [],
        division: "",
        fitFeedback: 3,
        fitReference: [],
        columns: ["Bust (in)", "Waist (in)"],
        rows: [{ size: "S", values: ["", ""] }],
        measureImage: "",
        measurePoints: [],
      },
    ]);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/size-guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guides }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Card className="p-5 text-sm text-muted-foreground">
        A product shows the first guide whose <strong>categories</strong> match it (leave Division
        empty to apply to all). Sections you leave empty (fit photos, measure image) simply
        don&rsquo;t appear. Your live category handles: {categoryHandles.join(", ") || "—"}
      </Card>

      {guides.map((g, i) => (
        <Card key={g.id} className="flex flex-col gap-4 p-5">
          <div className="flex items-start justify-between gap-4">
            <TextField
              label="Title (shown as the modal heading)"
              className="flex-1"
              value={g.title}
              onChange={(e) => set(i, { title: e.target.value })}
            />
            <button
              type="button"
              aria-label={`Delete ${g.title}`}
              onClick={() => setGuides((x) => x.filter((_, j) => j !== i))}
              className="mt-7 rounded-sm p-2 text-muted-foreground transition-colors hover:text-destructive motion-reduce:transition-none"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Applies to categories (comma-separated handles)"
              value={g.categories.join(", ")}
              onChange={(e) =>
                set(i, {
                  categories: e.target.value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean),
                })
              }
              placeholder="e.g. bottoms, jeans"
            />
            <TextField
              label="Division (optional — women/men/kids…; empty = all)"
              value={g.division}
              onChange={(e) => set(i, { division: e.target.value.trim().toLowerCase() })}
            />
          </div>

          {/* fit feedback */}
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              &ldquo;What customers are saying&rdquo; position
            </p>
            <div className="mt-2 flex gap-2">
              {(["Small", "Runs small", "True to size", "Runs large", "Large"] as const).map((label, idx) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={g.fitFeedback === idx + 1}
                  onClick={() => set(i, { fitFeedback: idx + 1 })}
                  className={
                    g.fitFeedback === idx + 1
                      ? "rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                      : "rounded-full border border-border px-3 py-1.5 text-xs hover:border-foreground"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* fit reference photos */}
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Fit reference photos (optional, up to 4 — e.g. Baggy / Skinny / Slim / Flare)
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              {g.fitReference.map((f, fi) => (
                <div key={fi} className="flex flex-col gap-2 rounded-sm border border-border p-3">
                  <MediaUploadField
                    label="Photo"
                    value={f.image}
                    onChange={(url) =>
                      set(i, { fitReference: g.fitReference.map((x, j) => (j === fi ? { ...x, image: url } : x)) })
                    }
                  />
                  <TextField
                    label="Label"
                    value={f.label}
                    onChange={(e) =>
                      set(i, { fitReference: g.fitReference.map((x, j) => (j === fi ? { ...x, label: e.target.value } : x)) })
                    }
                  />
                  <TextField
                    label="Caption"
                    value={f.caption}
                    onChange={(e) =>
                      set(i, { fitReference: g.fitReference.map((x, j) => (j === fi ? { ...x, caption: e.target.value } : x)) })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => set(i, { fitReference: g.fitReference.filter((_, j) => j !== fi) })}
                    className="self-start text-xs text-destructive underline-offset-2 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            {g.fitReference.length < 4 && (
              <button
                type="button"
                onClick={() => set(i, { fitReference: [...g.fitReference, { image: "", label: "", caption: "" }] })}
                className="mt-2 flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add fit photo
              </button>
            )}
          </div>

          {/* measurements */}
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Measurements (in inches — shoppers can flip to cm)
            </p>
            <TextField
              label="Columns (comma-separated)"
              className="mt-2"
              value={g.columns.join(", ")}
              onChange={(e) => {
                const columns = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
                set(i, { columns });
              }}
              placeholder='e.g. Waist (in), Hip (in), Inseam (in)'
            />
            <div className="mt-3 flex flex-col gap-2">
              {g.rows.map((r, ri) => (
                <div key={ri} className="flex items-end gap-2">
                  <TextField
                    label={ri === 0 ? "Size" : undefined}
                    className="w-24"
                    value={r.size}
                    onChange={(e) =>
                      set(i, { rows: g.rows.map((x, j) => (j === ri ? { ...x, size: e.target.value } : x)) })
                    }
                  />
                  <TextField
                    label={ri === 0 ? `Values (comma-separated, one per column)` : undefined}
                    className="flex-1"
                    value={r.values.join(", ")}
                    onChange={(e) =>
                      set(i, {
                        rows: g.rows.map((x, j) =>
                          j === ri ? { ...x, values: e.target.value.split(",").map((s) => s.trim()) } : x,
                        ),
                      })
                    }
                    placeholder="e.g. 28-30, 38-40, 31"
                  />
                  <button
                    type="button"
                    aria-label="Remove row"
                    onClick={() => set(i, { rows: g.rows.filter((_, j) => j !== ri) })}
                    className="mb-2 p-2 text-muted-foreground transition-colors hover:text-destructive motion-reduce:transition-none"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => set(i, { rows: [...g.rows, { size: "", values: g.columns.map(() => "") }] })}
              className="mt-2 flex items-center gap-1 text-xs font-semibold underline-offset-2 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add size row
            </button>
          </div>

          {/* how to measure */}
          <div className="grid gap-4 sm:grid-cols-2">
            <MediaUploadField
              label="How-to-measure image (optional)"
              value={g.measureImage}
              onChange={(url) => set(i, { measureImage: url })}
            />
            <TextareaField
              label="How-to-measure points (one per line: Label — instruction)"
              value={g.measurePoints.map((p) => `${p.label} — ${p.text}`).join("\n")}
              onChange={(e) =>
                set(i, {
                  measurePoints: e.target.value
                    .split("\n")
                    .map((line) => {
                      const [label, ...rest] = line.split("—");
                      return { label: (label ?? "").trim(), text: rest.join("—").trim() };
                    })
                    .filter((p) => p.label && p.text)
                    .slice(0, 6),
                })
              }
              placeholder={"Waist — Measure around your natural waistline.\nInseam — Measure from the crotch seam to the ankle."}
            />
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={addGuide}>
          <Plus className="mr-1 h-4 w-4" /> Add guide
        </Button>
        <Button variant="gold" loading={saving} onClick={save}>
          Save size guides
        </Button>
        {msg && (
          <span className={msg === "Saved" ? "text-sm text-gold" : "text-sm text-destructive"}>{msg}</span>
        )}
      </div>
    </div>
  );
}
