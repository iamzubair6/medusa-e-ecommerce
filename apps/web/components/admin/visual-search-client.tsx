"use client";

import { useEffect, useState } from "react";
import { Button, Card } from "@ecom/ui";

interface IndexProduct {
  productId: string;
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
}

/**
 * Visual-search index manager. Indexing runs entirely on the server with ONE
 * descriptor implementation (the old in-browser reindex produced vectors that
 * didn't match server ones and has been removed). New/edited products are
 * indexed automatically — the button here is for full rebuilds.
 */
export function VisualSearchClient() {
  const [products, setProducts] = useState<IndexProduct[]>([]);
  const [indexed, setIndexed] = useState<number>(0);
  const [serverBusy, setServerBusy] = useState(false);
  const [serverResult, setServerResult] = useState<{ indexed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <Stat label="Products" value={products.length} />
          <Stat label="Indexed" value={indexed} />
          <Stat label="Coverage" value={`${products.length ? Math.round((indexed / products.length) * 100) : 0}%`} />
        </div>
        <p className="text-sm text-muted-foreground">
          Powers &ldquo;Shop Similar&rdquo; and search-by-photo. New and edited products are indexed
          automatically — rebuild after bulk changes or if coverage drops.
        </p>
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
