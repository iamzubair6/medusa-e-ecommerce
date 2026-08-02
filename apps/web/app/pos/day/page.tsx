import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, buttonVariants, cn } from "@ecom/ui";
import { getPosSession } from "@/lib/pos-auth";
import { dhakaDate, posDayReport } from "@/lib/pos";
import { posMoney } from "@/lib/pos-types";
import { PrintButton } from "@/components/pos/print-button";

export const dynamic = "force-dynamic";

/** Z-report: the shop day's counter takings. ADMIN only. */
export default async function PosDayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await getPosSession();
  if (!session) redirect("/pos/login");
  if (session.role !== "ADMIN") redirect("/pos");

  const params = await searchParams;
  const today = dhakaDate(new Date().toISOString());
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date! : today;
  const report = await posDayReport(date);

  const tiles = [
    { label: "Sales", value: String(report.totals.count) },
    { label: "Gross", value: posMoney(report.totals.gross) },
    { label: "Cash", value: posMoney(report.totals.cash) },
    { label: "bKash", value: posMoney(report.totals.bkash) },
    { label: "Nagad", value: posMoney(report.totals.nagad) },
    { label: "Card", value: posMoney(report.totals.card) },
    { label: "Refunded", value: `−${posMoney(report.totals.refunded)}` },
    { label: "Net", value: posMoney(report.totals.net) },
  ];

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6 print:p-0" id="pos-day-report">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/pos" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Counter
        </Link>
        <form className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            max={today}
            className="h-11 rounded-md border bg-background px-3 text-sm sm:h-9"
          />
          <button type="submit" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            View
          </button>
        </form>
        <PrintButton />
      </div>

      <div className="text-center">
        <p className="font-display text-xl font-medium">Maison — POS day report</p>
        <p className="text-sm text-muted-foreground">{date} (shop time)</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{t.label}</p>
              <p className="mt-1 font-display text-xl font-medium tabular-nums">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-8 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Sales
      </h2>
      {report.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No counter sales this day.</p>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-2">Order</th>
              <th>Time</th>
              <th>Cashier</th>
              <th>Method</th>
              <th className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.displayId} className="border-b border-dashed">
                <td className="py-2 font-medium">MSN-{String(r.displayId).padStart(5, "0")}</td>
                <td>
                  {new Date(r.createdAt).toLocaleTimeString("en-GB", {
                    timeZone: "Asia/Dhaka",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td>{r.cashier}</td>
                <td className="capitalize">
                  {r.method}
                  {r.txnId ? ` · ${r.txnId}` : ""}
                </td>
                <td className="text-right tabular-nums">{posMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {report.refunds.length > 0 && (
        <>
          <h2 className="mt-8 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Refunds
          </h2>
          <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Order</th>
                <th>By</th>
                <th>Items</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.refunds.map((r, i) => (
                <tr key={`${r.displayId}-${i}`} className="border-b border-dashed">
                  <td className="py-2 font-medium">MSN-{String(r.displayId).padStart(5, "0")}</td>
                  <td>{r.by}</td>
                  <td>
                    {r.lines.map((l) => `${l.title} (${l.color}/${l.size}) ×${l.quantity}`).join(", ")}
                  </td>
                  <td className="text-right tabular-nums">−{posMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}

      <h2 className="mt-8 mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        By cashier
      </h2>
      {report.byCashier.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="text-sm">
          {report.byCashier.map((c) => (
            <li key={c.name} className="flex justify-between border-b border-dashed py-2">
              <span>
                {c.name} · {c.count} sale{c.count === 1 ? "" : "s"}
              </span>
              <span className="tabular-nums">{posMoney(c.total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
