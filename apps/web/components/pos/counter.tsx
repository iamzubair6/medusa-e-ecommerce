"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ScanLine, Search, X } from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, cn } from "@ecom/ui";
import type { PosCartLine } from "./cart-panel";
import { CartPanel } from "./cart-panel";
import { Receipt } from "./receipt";
import {
  posMoney,
  type PosPaymentMethod,
  type PosProduct,
  type PosSaleSuccess,
} from "@/lib/pos-types";

interface Props {
  cashier: { name: string; email: string };
  isAdmin: boolean;
}

/** A completed sale, frozen for the receipt (cart state resets underneath it). */
export interface FinishedSale {
  result: PosSaleSuccess;
  lines: PosCartLine[];
  payment: { method: PosPaymentMethod; txnId?: string };
  customerName?: string;
  soldAt: string;
}

function useDebounced(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function PosCounter({ cashier, isAdmin }: Props) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const q = useDebounced(term.trim(), 250);
  const [picking, setPicking] = useState<PosProduct | null>(null);
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [sale, setSale] = useState<FinishedSale | null>(null);

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

  const addLine = (product: PosProduct, color: string, size: string, unitPrice: number, variantId: string) => {
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
  };

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
    <div className="flex h-screen flex-col bg-muted">
      <header className="flex items-center justify-between border-b bg-background px-4 py-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-lg font-medium">Maison</span>
          <span className="text-xs uppercase tracking-widest text-muted-foreground">Point of sale</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pos/orders" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
            Orders
          </Link>
          {isAdmin && (
            <Link href="/pos/day" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Day report
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            {cashier.name}
            {isAdmin && <Badge className="ml-2">Admin</Badge>}
          </span>
          <Button variant="ghost" size="sm" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left: search + results + picker */}
        <main className="flex min-w-0 flex-1 flex-col gap-3 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products by name or scan / type a SKU…"
              autoFocus
              className="h-12 w-full rounded-lg border bg-background pl-10 pr-10 text-base outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
            />
            <ScanLine className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
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
      <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-medium">{product.title}</h2>
              {color && <p className="text-sm text-muted-foreground">{posMoney(color.price)}</p>}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
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
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
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
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-6 print:bg-white print:p-0">
      <div className="text-center print:hidden">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">Sale complete</p>
        <p className="mt-1 font-display text-4xl font-medium">{posMoney(sale.result.total)}</p>
        {sale.result.discountTotal > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            includes {posMoney(sale.result.discountTotal)} discount
          </p>
        )}
      </div>
      <Receipt sale={sale} cashierName={cashierName} />
      <div className="flex gap-3 print:hidden">
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
