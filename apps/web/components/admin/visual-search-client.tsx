"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@ecom/ui";
import { embedUrl } from "@/lib/embedding-client";

interface IndexProduct {
  productId: string;
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
}

export function VisualSearchClient() {
  const [products, setProducts] = useState<IndexProduct[]>([]);
  const [indexed, setIndexed] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverResult, setServerResult] = useState<{ indexed: number; failed: number } | null>(null);
  const [progress, setProgress] = useState<{ done: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const serverReindex = async () => {
    setServerBusy(true);
    setError(null);
    setServerResult(null);
    try {
      const res = await fetch("/api/admin/visual-search/reindex", { method: "POST" });
      const data = (await res.json()) as { indexed?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Server reindex failed");
      setServerResult({ indexed: data.indexed ?? 0, failed: data.failed ?? 0 });
      await load();
    } catch (e) {
      setError((e as Error).message);
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

  const reindex = async () => {
    setBusy(true);
    setError(null);
    setProgress({ done: 0, failed: 0 });
    const items: (IndexProduct & { vector: number[] })[] = [];
    let failed = 0;
    for (const p of products) {
      try {
        const vector = await embedUrl(p.thumbnail);
        items.push({ ...p, vector });
      } catch {
        failed += 1; // e.g. image host without CORS
      }
      setProgress({ done: items.length, failed });
    }
    if (items.length > 0) {
      const res = await fetch("/api/admin/visual-search/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) setError("Failed to save the index.");
    }
    await load();
    setBusy(false);
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Products" value={products.length} />
          <Stat label="Indexed" value={indexed} />
          <Stat label="Coverage" value={`${products.length ? Math.round((indexed / products.length) * 100) : 0}%`} />
        </div>
        <p className="text-sm text-muted-foreground">
          Build the &ldquo;Shop Similar&rdquo; index. <strong className="text-foreground">Server reindex</strong> runs entirely
          on the server (no browser needed). <strong className="text-foreground">Browser reindex</strong> computes fingerprints
          in this tab (skips images on hosts without CORS).
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="gold" loading={serverBusy} onClick={serverReindex} disabled={busy}>
            Server reindex
          </Button>
          <Button variant="outline" loading={busy} onClick={reindex} disabled={products.length === 0 || serverBusy}>
            Browser reindex
          </Button>
          {serverResult && (
            <span className="text-sm text-muted-foreground">
              {serverResult.indexed} indexed{serverResult.failed ? `, ${serverResult.failed} skipped` : ""}
            </span>
          )}
          {progress && !serverResult && (
            <span className="text-sm text-muted-foreground">
              {progress.done} embedded{progress.failed ? `, ${progress.failed} skipped` : ""}
            </span>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </div>
    </Card>
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
