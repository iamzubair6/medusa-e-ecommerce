"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { Button } from "@ecom/ui";
import { posMoney, type PosProduct } from "@/lib/pos-types";

interface LabelVariant {
  sku: string;
  color: string;
  size: string;
  price: number;
  defaultCopies: number;
}

/**
 * Code128 label sheet: one label per colour/size variant with a per-variant
 * copies count (default = its tracked stock, so one print run covers the rack).
 * On print, only the sheet is visible; labels are ~48×28mm on A4.
 */
export function LabelSheet({ product }: { product: PosProduct }) {
  const variants: LabelVariant[] = product.colors.flatMap((c) =>
    c.sizes.flatMap((s) =>
      s.sku
        ? [
            {
              sku: s.sku,
              color: c.name,
              size: s.size,
              price: c.price,
              defaultCopies: Math.max(1, s.stock ?? 1),
            },
          ]
        : [],
    ),
  );
  const [copies, setCopies] = useState<Record<string, number>>(() =>
    Object.fromEntries(variants.map((v) => [v.sku, v.defaultCopies])),
  );

  if (variants.length === 0) {
    return <p className="text-sm text-muted-foreground">This product has no SKUs to print.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print labels
        </Button>
        <p className="text-xs text-muted-foreground">
          Copies per size default to its current stock — adjust below, then print.
        </p>
      </div>

      <div className="flex flex-col gap-3 print:hidden">
        {variants.map((v) => (
          <label key={v.sku} className="flex items-center gap-3 text-sm">
            <span className="w-56 truncate">
              {v.color} / {v.size}
            </span>
            <input
              type="number"
              min={0}
              max={200}
              value={copies[v.sku] ?? 1}
              onChange={(e) =>
                setCopies((prev) => ({
                  ...prev,
                  [v.sku]: Math.max(0, Math.min(200, Number(e.target.value) || 0)),
                }))
              }
              className="h-8 w-20 rounded-md border bg-background px-2 text-right text-sm"
              aria-label={`Copies for ${v.color} ${v.size}`}
            />
            <span className="font-mono text-xs text-muted-foreground">{v.sku}</span>
          </label>
        ))}
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #labels-sheet, #labels-sheet * { visibility: visible; }
          #labels-sheet { position: absolute; left: 0; top: 0; width: 100%; }
        }
        @page { margin: 8mm; }
      `}</style>
      <div id="labels-sheet" className="flex flex-wrap gap-2">
        {variants.flatMap((v) =>
          Array.from({ length: copies[v.sku] ?? 0 }, (_, i) => (
            <Label key={`${v.sku}-${i}`} title={product.title} variant={v} />
          )),
        )}
      </div>
    </div>
  );
}

function Label({ title, variant }: { title: string; variant: LabelVariant }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      JsBarcode(ref.current, variant.sku, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        height: 34,
        width: 1.4,
      });
    } catch {
      // Invalid content for Code128 — leave the SVG empty; SKU text still prints.
    }
  }, [variant.sku]);

  return (
    <div
      className="flex flex-col items-center justify-between gap-0.5 border border-dashed border-black/30 bg-white p-1.5 text-black"
      style={{ width: "48mm", height: "28mm", breakInside: "avoid" }}
    >
      <p className="w-full truncate text-center text-[9px] leading-tight">{title}</p>
      <p className="text-[9px] font-medium leading-tight">
        {variant.color} / {variant.size} · {posMoney(variant.price)}
      </p>
      <svg ref={ref} className="h-[34px] w-full" aria-label={`Barcode ${variant.sku}`} />
      <p className="font-mono text-[8px] leading-none">{variant.sku}</p>
    </div>
  );
}
