"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, SelectField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import {
  FACET_KEYS,
  SPECIAL_SOURCES,
  DEFAULT_LISTING_ENTRY,
  type FacetKey,
  type ListingConfig,
  type ListingEntry,
} from "@/lib/listing-config";

export interface ListingTarget {
  handle: string;
  label: string;
}

const FACET_LABELS: Record<FacetKey, string> = {
  category: "Category",
  size: "Size",
  color: "Color",
  occasion: "Occasion",
  style: "Style",
  trend: "Trend",
  price: "Price",
};

export function ListingConfigBuilder({
  initial,
  targets,
}: {
  initial: ListingConfig;
  targets: ListingTarget[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [config, setConfig] = useState<ListingConfig>(initial);
  const [handle, setHandle] = useState(targets[0]?.handle ?? "all");
  const [saving, setSaving] = useState(false);

  const entry: ListingEntry = config.entries[handle] ?? DEFAULT_LISTING_ENTRY;
  const setEntry = (next: ListingEntry) =>
    setConfig((c) => ({ entries: { ...c.entries, [handle]: next } }));

  // Configured handles get a dot so the admin can see which listings are customised.
  const configured = useMemo(() => new Set(Object.keys(config.entries)), [config.entries]);

  const customOrder = entry.facetOrder.length > 0;
  const order: FacetKey[] = customOrder ? entry.facetOrder : [...FACET_KEYS];

  const toggleCustomOrder = (on: boolean) =>
    setEntry({ ...entry, facetOrder: on ? [...FACET_KEYS] : [] });

  const moveFacet = (idx: number, dir: -1 | 1) => {
    const next = [...order];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j]!, next[idx]!];
    setEntry({ ...entry, facetOrder: next });
  };

  const removeFacet = (idx: number) =>
    setEntry({ ...entry, facetOrder: order.filter((_, i) => i !== idx) });

  const addFacet = (k: FacetKey) => setEntry({ ...entry, facetOrder: [...order, k] });

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/listing-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Listing settings saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const missing = FACET_KEYS.filter((k) => !order.includes(k));

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {/* Listing picker */}
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <button
            key={t.handle}
            type="button"
            onClick={() => setHandle(t.handle)}
            className={cn(
              "cursor-pointer rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              t.handle === handle ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
            )}
          >
            {t.label}
            {configured.has(t.handle) && <span className="ml-1.5 text-accent">●</span>}
          </button>
        ))}
      </div>

      <Card className="flex flex-col gap-5 p-6">
        <p className="text-xs text-muted-foreground">
          Configuring <code>{handle}</code>. Leave everything default to keep the derived behaviour.
        </p>

        {/* Category facet visibility */}
        <SelectField
          label="Category filter"
          value={entry.categoryFacet}
          onChange={(e) => setEntry({ ...entry, categoryFacet: e.target.value as ListingEntry["categoryFacet"] })}
          className="max-w-xs"
        >
          <option value="auto">Auto (show on broad multi-type listings)</option>
          <option value="show">Always show</option>
          <option value="hide">Always hide</option>
        </SelectField>

        {/* Filter group order */}
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <CheckboxField
            label="Customise filter order"
            checked={customOrder}
            onChange={(e) => toggleCustomOrder(e.target.checked)}
          />
          {customOrder && (
            <div className="flex flex-col gap-2">
              {order.map((k, i) => (
                <div key={k} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 text-sm">
                  <span className="flex-1 font-medium">{FACET_LABELS[k]}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label="Move up" disabled={i === 0} onClick={() => moveFacet(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Move down" disabled={i === order.length - 1} onClick={() => moveFacet(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFacet(i)}>
                    Hide
                  </Button>
                </div>
              ))}
              {missing.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Add back:</span>
                  {missing.map((k) => (
                    <Button key={k} type="button" variant="outline" size="sm" onClick={() => addFacet(k)}>
                      {FACET_LABELS[k]}
                    </Button>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Hidden groups never appear; empty groups (no matching products) are skipped automatically.
              </p>
            </div>
          )}
        </div>

        {/* Special tile row */}
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <CheckboxField
            label="Show a curated tile row above the grid"
            checked={entry.special.enabled}
            onChange={(e) => setEntry({ ...entry, special: { ...entry.special, enabled: e.target.checked } })}
          />
          {entry.special.enabled && (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                label="Heading (optional)"
                value={entry.special.heading}
                onChange={(e) => setEntry({ ...entry, special: { ...entry.special, heading: e.target.value } })}
                className="sm:col-span-3"
                placeholder="e.g. Shop by style"
              />
              <SelectField
                label="Source"
                value={entry.special.source}
                onChange={(e) => setEntry({ ...entry, special: { ...entry.special, source: e.target.value as ListingEntry["special"]["source"] } })}
              >
                {SPECIAL_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {FACET_LABELS[s]}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="Max tiles"
                type="number"
                min={1}
                max={12}
                value={entry.special.limit}
                onChange={(e) => setEntry({ ...entry, special: { ...entry.special, limit: Math.min(12, Math.max(1, Number(e.target.value) || 1)) } })}
              />
            </div>
          )}
        </div>
      </Card>

      <Button variant="gold" loading={saving} onClick={save} className="w-fit">
        Save listing settings
      </Button>
    </div>
  );
}
