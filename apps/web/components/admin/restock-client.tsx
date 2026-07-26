"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, ExternalLink, PackageX } from "lucide-react";
import { Badge, Button, Card } from "@ecom/ui";
import { useToast } from "./toast";

export interface RestockRow {
  variantId: string;
  productHandle: string;
  productTitle: string;
  size: string;
  count: number;
}

/** Mirrors `LowStockVariant` from lib/medusa-admin (server module — shape only). */
export interface LowStockRow {
  productId: string;
  product: string;
  variant: string; // "Black / M"
  thumbnail?: string;
  quantity: number; // 0 = sold out
}

const norm = (s: string) => s.trim().toLowerCase();

function Thumb({ src }: { src?: string }) {
  return (
    <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
      {src ? (
        <Image src={src} alt="" fill sizes="36px" className="object-cover" />
      ) : (
        <PackageX className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground/50" />
      )}
    </div>
  );
}

/**
 * Restock centre: (1) live sold-out & low-stock sizes from the catalogue so the
 * admin sees stockouts before any customer subscribes, and (2) the back-in-stock
 * waiting list with one-click Notify (emails everyone on the variant).
 */
export function RestockCentre({ lowStock, waiting }: { lowStock: LowStockRow[]; waiting: RestockRow[] }) {
  // Pending waiting-list demand rolled up per product title, to surface inline
  // on the stock rows (subscriptions carry handle/title, not product ids).
  const waitingByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const w of waiting) m.set(norm(w.productTitle), (m.get(norm(w.productTitle)) ?? 0) + w.count);
    return m;
  }, [waiting]);

  // Waiting-list rows have no thumbnail of their own — borrow the catalogue one.
  const thumbByProduct = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of lowStock) if (r.thumbnail && !m.has(norm(r.product))) m.set(norm(r.product), r.thumbnail);
    return m;
  }, [lowStock]);

  return (
    <div className="grid items-start gap-10 xl:grid-cols-2">
      <LowStockSection rows={lowStock} waitingByProduct={waitingByProduct} />
      <WaitingSection rows={waiting} thumbByProduct={thumbByProduct} />
    </div>
  );
}

function LowStockSection({
  rows,
  waitingByProduct,
}: {
  rows: LowStockRow[];
  waitingByProduct: Map<string, number>;
}) {
  const soldOut = rows.filter((r) => r.quantity === 0).length;
  const low = rows.length - soldOut;

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Sold out &amp; low stock</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {rows.length === 0
          ? "Live size-level stock across published products."
          : `${soldOut} sold out · ${low} running low. Restock these before shoppers start asking.`}
      </p>
      {rows.length === 0 ? (
        <Card className="mt-4 p-6 text-sm text-muted-foreground">
          Every published size is comfortably in stock. Sizes that sell out or drop to 5 or fewer surface here.
        </Card>
      ) : (
        <Card className="mt-4 divide-y divide-border">
          {rows.map((r) => {
            const waitingCount = waitingByProduct.get(norm(r.product)) ?? 0;
            return (
              <div key={`${r.productId}-${r.variant}`} className="flex items-center gap-3 px-4 py-3">
                <Thumb src={r.thumbnail} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/admin/products/${r.productId}/edit`}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {r.product}
                  </Link>
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{r.variant}</span>
                    {waitingCount > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-foreground">
                        <Bell className="h-3 w-3" />
                        {waitingCount} waiting
                      </span>
                    )}
                  </p>
                </div>
                {r.quantity === 0 ? (
                  <Badge className="shrink-0 bg-destructive text-destructive-foreground">Sold out</Badge>
                ) : (
                  <Badge variant="accent" className="shrink-0">
                    {r.quantity} left
                  </Badge>
                )}
              </div>
            );
          })}
        </Card>
      )}
    </section>
  );
}

function WaitingSection({
  rows,
  thumbByProduct,
}: {
  rows: RestockRow[];
  thumbByProduct: Map<string, string>;
}) {
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

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Customers waiting</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {rows.length === 0 ? (
          "Shoppers who ask to be emailed when a sold-out size returns."
        ) : (
          <>
            <strong className="text-foreground">{totalWaiting}</strong> shopper{totalWaiting === 1 ? "" : "s"} across{" "}
            {rows.length} variant{rows.length === 1 ? "" : "s"}. Restock first, then notify.
          </>
        )}
      </p>
      {rows.length === 0 ? (
        <Card className="mt-4 p-6 text-sm text-muted-foreground">
          No one is waiting on a restock yet. When a shopper hits a sold-out size on a product page, they can leave
          their email — it shows up here.
        </Card>
      ) : (
        <Card className="mt-4 divide-y divide-border">
          {rows.map((r) => {
            const cleared = done.has(r.variantId);
            return (
              <div key={r.variantId} className="flex items-center gap-3 px-4 py-3">
                <Thumb src={thumbByProduct.get(norm(r.productTitle))} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${r.productHandle}`}
                    target="_blank"
                    className="flex items-center gap-1 truncate text-sm font-medium hover:underline"
                  >
                    <span className="truncate">{r.productTitle}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </Link>
                  <p className="text-xs text-muted-foreground">Size {r.size}</p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-sm font-bold tabular-nums">{r.count}</span>
                  <span className="block text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    waiting
                  </span>
                </p>
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
      )}
    </section>
  );
}
