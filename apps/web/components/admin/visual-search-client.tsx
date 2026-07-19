"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@ecom/ui";
import { PART_GROUPS, type VisualSearchSettings } from "@/lib/visual-search-settings";
import { TextField } from "./fields";

interface IndexProduct {
  productId: string;
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
}

const GROUP_LABELS: Record<string, string> = {
  top: "Top (shirts, tees, sweaters…)",
  bottom: "Bottom (pants, shorts, skirts…)",
  dress: "Dress / jumpsuit",
  outerwear: "Outerwear (jackets, coats)",
  shoes: "Shoes",
  bag: "Bags",
  accessory: "Accessories (hats, glasses, jewellery…)",
};

/**
 * Visual-search admin: plain-language explainer, index stats + rebuild, and
 * the garment→category mapping that keeps hotspot searches on-category for
 * ANY catalog (nothing is hardcoded to this store's taxonomy).
 */
export function VisualSearchClient({
  settings,
  categoryHandles,
}: {
  settings: VisualSearchSettings;
  categoryHandles: string[];
}) {
  const [products, setProducts] = useState<IndexProduct[]>([]);
  const [indexed, setIndexed] = useState<number>(0);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverResult, setServerResult] = useState<{ indexed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [mapping, setMapping] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      PART_GROUPS.map((g) => [g, (settings.partCategories[g] ?? []).join(", ")]),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const live = new Set(categoryHandles);

  const serverReindex = async () => {
    setServerBusy(true);
    setError(null);
    setServerResult(null);
    try {
      const res = await fetch("/api/admin/visual-search/reindex", { method: "POST" });
      const data = (await res.json()) as { indexed?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Reindex failed");
      setServerResult({ indexed: data.indexed ?? 0, failed: data.failed ?? 0 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reindex failed");
    } finally {
      setServerBusy(false);
    }
  };

  const load = () =>
    fetch("/api/admin/visual-search/products")
      .then((r) => r.json())
      .then((d: { products: IndexProduct[]; indexed: number }) => {
        setProducts(d.products);
        setIndexed(d.indexed);
      })
      .catch(() => setError("Could not load products"));

  useEffect(() => {
    load();
  }, []);

  const saveMapping = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const partCategories = Object.fromEntries(
        Object.entries(mapping).map(([g, csv]) => [
          g,
          csv
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
        ]),
      );
      const res = await fetch("/api/admin/visual-search/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partCategories }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Save failed");
      setSaveMsg("Saved");
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">How it works</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
          <li>
            Every product&rsquo;s photo is turned into a &ldquo;visual fingerprint&rdquo; and stored
            in the <strong>index</strong> below. New and edited products are indexed automatically.
          </li>
          <li>
            A shopper taps the <strong>camera icon</strong> in the search bar and uploads any photo
            (or pastes an image link).
          </li>
          <li>
            The photo is scanned for wearable items — top, bottom, dress, shoes, bag, accessories —
            and each one becomes a <strong>dot</strong> on the image. Tapping a dot shows products
            from the matching categories, closest-looking first. It also guesses the department
            (women / men / kids) when your store carries it.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing to run day-to-day — use <strong>Rebuild index</strong> only after bulk imports or
          if coverage drops below 100%.
        </p>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-lg font-bold">Index</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <Stat label="Products" value={products.length} />
            <Stat label="Indexed" value={indexed} />
            <Stat label="Coverage" value={`${products.length ? Math.round((indexed / products.length) * 100) : 0}%`} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="gold" loading={serverBusy} onClick={serverReindex}>
              Rebuild index
            </Button>
            {serverResult && (
              <span className="text-sm text-muted-foreground">
                {serverResult.indexed} indexed{serverResult.failed ? `, ${serverResult.failed} skipped` : ""}
              </span>
            )}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-display text-lg font-bold">Detected item &rarr; your categories</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          When a shopper taps a dot (e.g. &ldquo;Bottom&rdquo;), results are limited to these
          category handles — comma-separated, so this works for any catalog you sell. Handles not
          in your store are ignored; leave a row empty to skip category limits for that item.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PART_GROUPS.map((g) => (
            <TextField
              key={g}
              label={GROUP_LABELS[g] ?? g}
              value={mapping[g] ?? ""}
              onChange={(e) => setMapping((m) => ({ ...m, [g]: e.target.value }))}
              placeholder="e.g. tops, bodysuits"
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Your live category handles: {categoryHandles.length ? categoryHandles.join(", ") : "—"}
        </p>
        {Object.entries(mapping).some(([, csv]) =>
          csv.split(",").some((s) => s.trim() && !live.has(s.trim().toLowerCase())),
        ) && (
          <p className="mt-1 text-xs text-amber-700">
            Some handles above aren&rsquo;t in your catalog — they&rsquo;ll be ignored until a
            category with that handle exists.
          </p>
        )}
        <div className="mt-4 flex items-center gap-3">
          <Button variant="gold" loading={saving} onClick={saveMapping}>
            Save mapping
          </Button>
          {saveMsg && (
            <span className={saveMsg === "Saved" ? "text-sm text-gold" : "text-sm text-destructive"}>
              {saveMsg}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-border py-4">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
