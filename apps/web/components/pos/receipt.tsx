"use client";

import { posMoney } from "@/lib/pos-types";
import type { FinishedSale } from "./counter";

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bkash: "bKash",
  nagad: "Nagad",
};

/**
 * 80mm thermal receipt. On screen it previews inside a card; on print, the
 * embedded rules hide everything else and size the page to the roll.
 */
export function Receipt({ sale, cashierName }: { sale: FinishedSale; cashierName: string }) {
  const orderNo = `MSN-${String(sale.result.displayId).padStart(5, "0")}`;
  const itemCount = sale.lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pos-receipt, #pos-receipt * { visibility: visible; }
          #pos-receipt { position: absolute; left: 0; top: 0; width: 72mm; box-shadow: none; border: 0; }
        }
        @page { size: 80mm auto; margin: 4mm; }
      `}</style>
      <div
        id="pos-receipt"
        className="w-[300px] border bg-white px-4 py-5 font-mono text-[12px] leading-relaxed text-black shadow-sm"
      >
        <div className="text-center">
          <p className="text-base font-bold tracking-widest">MAISON</p>
          <p>Dhaka, Bangladesh</p>
          <p className="mt-1">{sale.soldAt}</p>
        </div>

        <Hr />
        <Row left={`Order ${orderNo}`} right={`${itemCount} item${itemCount === 1 ? "" : "s"}`} />
        <Row left="Sold by" right={cashierName} />
        {sale.customerName && <Row left="Customer" right={sale.customerName} />}
        <Hr />

        {sale.lines.map((l, idx) => (
          <div key={idx} className="mb-1">
            <p className="truncate">{l.title}</p>
            <Row left={`  ${l.color} / ${l.size} × ${l.quantity}`} right={posMoney(l.total)} />
          </div>
        ))}

        <Hr />
        {sale.result.manualDiscountPct !== undefined && (
          <Row left={`Manual discount ${sale.result.manualDiscountPct}%`} right="applied" />
        )}
        {sale.result.discountTotal > 0 && (
          <Row left="Discount" right={`−${posMoney(sale.result.discountTotal)}`} />
        )}
        <div className="flex items-baseline justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{posMoney(sale.result.total)}</span>
        </div>
        <Row
          left="Paid by"
          right={
            METHOD_LABELS[sale.payment.method] +
            (sale.payment.txnId ? ` (${sale.payment.txnId})` : "")
          }
        />

        <Hr />
        <p className="text-center">Thank you for shopping with Maison.</p>
        <p className="text-center">Keep this receipt for exchanges.</p>
      </div>
    </>
  );
}

function Hr() {
  return <div className="my-2 border-t border-dashed border-black/40" />;
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="min-w-0 truncate">{left}</span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}
