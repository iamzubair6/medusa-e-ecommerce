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
  const [progress, setProgress] = useState<{ done: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          Reindexing loads each product image in your browser, computes a visual fingerprint, and stores it for the
          &ldquo;Shop Similar&rdquo; search. Images on hosts without CORS are skipped.
        </p>
        <div className="flex items-center gap-3">
          <Button variant="gold" loading={busy} onClick={reindex} disabled={products.length === 0}>
            Reindex visual search
          </Button>
          {progress && (
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
