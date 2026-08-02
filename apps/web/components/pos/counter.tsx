"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Search, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@ecom/ui";
import { useToast } from "@/components/admin/toast";
import type { PosCartLine } from "./cart-panel";
import { CartPanel } from "./cart-panel";
import { Receipt } from "./receipt";
import { ScanButton } from "./scan-button";
import {
  posMoney,
  type PosPaymentMethod,
  type PosProduct,
  type PosReceiptLine,
  type PosSaleSuccess,
} from "@/lib/pos-types";

interface Props {
  cashier: { name: string; email: string };
  isAdmin: boolean;
}

/** A completed sale, frozen for the receipt (cart state resets underneath it).
 *  Lines are the ORDER's final priced lines, not the client cart estimate. */
export interface FinishedSale {
  result: PosSaleSuccess;
  lines: PosReceiptLine[];
  payment: { method: PosPaymentMethod; txnId?: string };
  customerName?: string;
  soldAt: string;
}

export function PosCounter({ cashier, isAdmin }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [term, setTerm] = useState("");
  const [q, setQ] = useState("");
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [sale, setSale] = useState<FinishedSale | null>(null);

  // Debounced search — flush() fires it immediately (Enter from a hardware
  // scanner, or a camera scan result).
  useEffect(() => {
    const t = setTimeout(() => setQ(term.trim()), 250);
    return () => clearTimeout(t);
  }, [term]);
  const flush = (value?: string) => setQ((value ?? term).trim());

  const search = useQuery({
    queryKey: ["pos-search", q],
    enabled: q.length >= 1,
    queryFn: async (): Promise<PosProduct[]> => {
      const res = await fetch(`/api/pos/products?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = (await res.json()) as { products: PosProduct[] };
      return data.products;
    },
  });

  const addLine = useCallback((product: PosProduct, color: string, size: string, unitPrice: number, variantId: string) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === variantId);
      if (existing) {
        return prev.map((l) =>
          l.variantId === variantId ? { ...l, quantity: Math.min(99, l.quantity + 1) } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          variantId,
          title: product.title,
          color,
          size,
          quantity: 1,
          unitPrice,
          thumbnail: product.thumbnail,
        },
      ];
    });
    setPicking(null);
  }, []);

  // Scan-to-cart: when the query is exactly one variant's SKU (hardware
  // scanner types SKU+Enter; the camera scanner injects it), skip the picker
  // and drop that line straight into the cart.
  const autoAdded = useRef("");
  useEffect(() => {
    const code = q.toUpperCase();
    if (!code || !search.data || autoAdded.current === code) return;
    for (const p of search.data) {
      for (const c of p.colors) {
        const s = c.sizes.find((sz) => sz.sku?.toUpperCase() === code);
        if (s) {
          autoAdded.current = code;
          addLine(p, c.name, s.size, c.price, s.variantId);
          toast.success(`Added ${p.title} — ${c.name} / ${s.size}`);
          setTerm("");
          setQ("");
          return;
        }
      }
    }
  }, [search.data, q, addLine, toast]);

  const logout = async () => {
    await fetch("/api/pos/login", { method: "DELETE" });
    router.push("/pos/login");
    router.refresh();
  };

  const startNewSale = () => {
    setSale(null);
    setCart([]);
    setTerm("");
  };

  if (sale) {
    return <SaleDone sale={sale} cashierName={cashier.name} onNewSale={startNewSale} />;
  }

  return (
    <div className="flex h-dvh flex-col bg-muted">
      <header className="flex items-center justify-between gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg font-medium">Maison</span>
          <span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:inline">
            Point of sale
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href="/pos/orders"
            className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Orders
          </Link>
          {isAdmin && (
            <Link
              href="/pos/day"
              className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Day report
            </Link>
          )}
          <span className="hidden text-sm text-muted-foreground lg:inline">
            {cashier.name}
            {isAdmin && <Badge className="ml-2">Admin</Badge>}
          </span>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left: search + results + picker */}
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-3 sm:p-4">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && flush()}
                placeholder="Search products by name or scan / type a SKU…"
                autoFocus
                className="h-12 w-full rounded-lg border bg-background pl-10 pr-3 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {/* Camera scanning — a phone/tablet running /pos IS the scanner. */}
            <ScanButton
              onCode={(code) => {
                setTerm(code);
                flush(code);
              }}
            />
          </div>

          {/* Bottom padding on phone keeps the last grid row above the fixed cart bar. */}
          <div className="min-h-0 flex-1 overflow-y-auto pb-24 md:pb-0">
            {q.length === 0 && (
              <EmptyHint text="Type a product name or scan a barcode to start a sale." />
            )}
            {q.length >= 1 && search.isPending && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
                ))}
              </div>
            )}
            {q.length >= 1 && search.isError && (
              <EmptyHint text="Search failed — check the connection and try again." error />
            )}
            {search.data && search.data.length === 0 && (
              <EmptyHint text={`Nothing matches “${q}”.`} />
            )}
            {search.data && search.data.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {search.data.map((p) => (
                  <ProductCard key={p.id} product={p} onPick={() => setPicking(p)} />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right: the cart */}
        <CartPanel
          cart={cart}
          setCart={setCart}
          isAdmin={isAdmin}
          onComplete={(finished) => setSale(finished)}
        />
      </div>

      {picking && (
        <SizePicker product={picking} onClose={() => setPicking(null)} onAdd={addLine} />
      )}
    </div>
  );
}

function EmptyHint({ text, error }: { text: string; error?: boolean }) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className={cn("max-w-sm text-center text-sm", error ? "text-destructive" : "text-muted-foreground")}>
        {text}
      </p>
    </div>
  );
}

function ProductCard({ product, onPick }: { product: PosProduct; onPick: () => void }) {
  const prices = product.colors.map((c) => c.price).filter((p) => p > 0);
  const from = prices.length ? Math.min(...prices) : 0;
  const totalStock = product.colors
    .flatMap((c) => c.sizes)
    .reduce<number | null>((sum, s) => (s.stock === null ? sum : (sum ?? 0) + s.stock), null);
  return (
    <button
      type="button"
      onClick={onPick}
      className="group overflow-hidden rounded-lg border bg-background text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-square bg-muted">
        {product.thumbnail && (
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="240px"
            className="object-cover"
          />
        )}
        {totalStock === 0 && (
          <span className="absolute inset-x-0 bottom-0 bg-destructive/90 py-1 text-center text-xs font-medium text-destructive-foreground">
            Sold out
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-tight">{product.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {from > 0 ? posMoney(from) : "—"}
          {totalStock !== null && <span className="ml-2 text-xs">· {totalStock} in stock</span>}
        </p>
      </div>
    </button>
  );
}

function SizePicker({
  product,
  onClose,
  onAdd,
}: {
  product: PosProduct;
  onClose: () => void;
  onAdd: (product: PosProduct, color: string, size: string, unitPrice: number, variantId: string) => void;
}) {
  const [colorName, setColorName] = useState(product.colors[0]?.name ?? "");
  const color = useMemo(
    () => product.colors.find((c) => c.name === colorName) ?? product.colors[0],
    [product, colorName],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Pick colour and size — ${product.title}`}
      onClick={onClose}
    >
      <Card className="max-h-[85dvh] w-full max-w-lg overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-medium">{product.title}</h2>
              {color && <p className="text-sm text-muted-foreground">{posMoney(color.price)}</p>}
            </div>
            {/* autoFocus pulls keyboard users into the dialog (no trap primitive here). */}
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close" autoFocus>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {product.colors.length > 1 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setColorName(c.name)}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-full border px-4 py-1.5 text-sm md:min-h-0 md:px-3",
                    c.name === color?.name ? "border-foreground bg-foreground text-background" : "bg-background",
                  )}
                >
                  {c.swatch && (
                    <span
                      className="h-3 w-3 rounded-full border"
                      style={{ backgroundColor: c.swatch }}
                      aria-hidden
                    />
                  )}
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {color && (
            <div className="grid grid-cols-4 gap-2">
              {color.sizes.map((s) => {
                const out = s.stock === 0;
                return (
                  <button
                    key={s.variantId}
                    type="button"
                    disabled={out}
                    onClick={() => onAdd(product, color.name, s.size, color.price, s.variantId)}
                    className={cn(
                      "flex h-14 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                      out
                        ? "cursor-not-allowed border-dashed text-muted-foreground/50 line-through"
                        : "bg-background hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                  >
                    {s.size}
                    <span className={cn("text-[11px] font-normal", out ? "" : "text-muted-foreground")}>
                      {s.stock === null ? "untracked" : out ? "sold out" : `${s.stock} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SaleDone({
  sale,
  cashierName,
  onNewSale,
}: {
  sale: FinishedSale;
  cashierName: string;
  onNewSale: () => void;
}) {
  const isCash = sale.payment.method === "cash";
  const total = Math.round(sale.result.total);
  // Cash-change calculator — pure client math, printed on the receipt when used.
  const [receivedInput, setReceivedInput] = useState("");
  const received = Number.parseInt(receivedInput, 10) || 0;
  const change = received - total;
  // Printed only once the tender actually covers the total.
  const cash = isCash && received > 0 && change >= 0 ? { received, change } : undefined;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-muted p-4 py-8 sm:gap-6 sm:p-6 print:bg-white print:p-0">
      <div className="text-center print:hidden">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Sale complete</p>
        <p className="mt-1 font-display text-4xl font-medium">{posMoney(sale.result.total)}</p>
        {sale.result.discountTotal > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            includes {posMoney(sale.result.discountTotal)} discount
          </p>
        )}
      </div>

      {isCash && (
        <div className="w-full max-w-[300px] rounded-lg border bg-background p-4 print:hidden">
          <label
            htmlFor="pos-cash-received"
            className="text-xs font-medium uppercase tracking-widest text-muted-foreground"
          >
            Cash received
          </label>
          <input
            id="pos-cash-received"
            value={receivedInput}
            onChange={(e) => setReceivedInput(e.target.value.replace(/\D/g, "").slice(0, 7))}
            inputMode="numeric"
            autoFocus
            placeholder="0"
            className="mt-1.5 h-14 w-full rounded-md border bg-background px-3 text-right font-display text-3xl tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <div className="mt-2 grid grid-cols-4 gap-2">
            {[
              { label: "Exact", value: total },
              { label: "৳500", value: 500 },
              { label: "৳1,000", value: 1000 },
              { label: "৳2,000", value: 2000 },
            ].map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setReceivedInput(String(q.value))}
                className="h-11 rounded-md border bg-background text-xs font-medium tabular-nums transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {q.label}
              </button>
            ))}
          </div>
          {received > 0 &&
            (change >= 0 ? (
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t pt-3">
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Change due
                </span>
                <span className="font-display text-4xl font-medium tabular-nums">
                  {posMoney(change)}
                </span>
              </div>
            ) : (
              <div className="mt-3 border-t pt-3 text-right">
                <span className="font-display text-2xl font-medium tabular-nums text-destructive">
                  {posMoney(-change)} short
                </span>
              </div>
            ))}
        </div>
      )}

      <Receipt sale={sale} cashierName={cashierName} cash={cash} />
      <div className="flex w-full max-w-[300px] flex-col gap-3 print:hidden sm:w-auto sm:max-w-none sm:flex-row">
        <Button variant="outline" size="lg" onClick={() => window.print()}>
          Print receipt
        </Button>
        <Button size="lg" onClick={onNewSale}>
          New sale
        </Button>
      </div>
    </div>
  );
}
