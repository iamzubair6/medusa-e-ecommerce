"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ExternalLink } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { useToast } from "./toast";

export interface RestockRow {
  variantId: string;
  productHandle: string;
  productTitle: string;
  size: string;
  count: number;
}

/**
 * Back-in-stock demand list: one row per sold-out variant with its waiting-list
 * count. "Notify" emails everyone on that variant and clears them from the list.
 */
export function RestockClient({ rows }: { rows: RestockRow[] }) {
  const toast = useToast();
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [done, setDone] = useState<Set<string>>(new Set());

  const totalWaiting = rows.reduce((n, r) => n + r.count, 0);

  const notify = async (variantId: string) => {
    setPending((p) => ({ ...p, [variantId]: true }));
    try {
      const res = await fetch("/api/admin/restock/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: number; marked?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Notify failed");
      toast.success(
        d.sent ? `Emailed ${d.sent} shopper${d.sent === 1 ? "" : "s"}.` : `Marked ${d.marked ?? 0} notified (email is off).`,
      );
      setDone((s) => new Set(s).add(variantId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending((p) => ({ ...p, [variantId]: false }));
    }
  };

  if (rows.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No one is waiting on a restock yet. When a shopper hits a sold-out size on a product page,
        they can leave their email — it shows up here.
      </Card>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <strong>{totalWaiting}</strong> shopper{totalWaiting === 1 ? "" : "s"} waiting across{" "}
        {rows.length} variant{rows.length === 1 ? "" : "s"}. Restock the item in your commerce
        backend first, then notify.
      </p>
      <Card className="divide-y divide-border">
        {rows.map((r) => {
          const cleared = done.has(r.variantId);
          return (
            <div key={r.variantId} className="flex items-center gap-4 p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                {r.count}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${r.productHandle}`}
                  target="_blank"
                  className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                >
                  {r.productTitle} <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                </Link>
                <p className="text-xs text-muted-foreground">Size {r.size}</p>
              </div>
              <Button
                variant="gold"
                size="sm"
                disabled={cleared}
                loading={pending[r.variantId]}
                onClick={() => notify(r.variantId)}
              >
                <Bell className="mr-1 h-4 w-4" />
                {cleared ? "Notified" : "Notify"}
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
