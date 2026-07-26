import Link from "next/link";
import { restockDemandByVariant } from "@ecom/cms";
import { getLowStock, type LowStockVariant } from "@/lib/medusa-admin";
import { AdminHeader } from "@/components/admin/page-header";
import { RestockCentre, type RestockRow } from "@/components/admin/restock-client";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

/** Small pager for one of the two independently paginated columns. */
function ColumnPager({
  param,
  page,
  total,
  other,
}: {
  param: "spage" | "page";
  page: number;
  total: number;
  other: { param: string; page: number };
}) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams();
    if (p > 1) q.set(param, String(p));
    if (other.page > 1) q.set(other.param, String(other.page));
    const s = q.toString();
    return `/admin/restock${s ? `?${s}` : ""}`;
  };
  const btn = "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted";
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-muted-foreground">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className={btn}>Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className={btn}>Next</Link>}
      </div>
    </div>
  );
}

export default async function RestockPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; spage?: string }>;
}) {
  const sp = await searchParams;
  const waitingPage = Math.max(1, Number(sp.page) || 1);
  const stockPage = Math.max(1, Number(sp.spage) || 1);

  const [grouped, lowStockAll] = await Promise.all([
    restockDemandByVariant().catch(() => []),
    getLowStock(5, 500).catch((): LowStockVariant[] => []),
  ]);

  const waitingAll: RestockRow[] = grouped
    .map((g) => ({
      variantId: g.variantId,
      productHandle: g.productHandle,
      productTitle: g.productTitle,
      size: g.size,
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const waiting = waitingAll.slice((waitingPage - 1) * PAGE_SIZE, waitingPage * PAGE_SIZE);
  const lowStock = lowStockAll.slice((stockPage - 1) * PAGE_SIZE, stockPage * PAGE_SIZE);

  return (
    <>
      <AdminHeader
        title="Restock centre"
        description="Sold-out and low sizes across the catalogue, and the shoppers waiting to hear a size is back."
      />
      <div className="p-8">
        <RestockCentre
          lowStock={lowStock}
          waiting={waiting}
          allWaiting={waitingAll}
          stockPager={
            <ColumnPager param="spage" page={stockPage} total={lowStockAll.length} other={{ param: "page", page: waitingPage }} />
          }
          waitingPager={
            <ColumnPager param="page" page={waitingPage} total={waitingAll.length} other={{ param: "spage", page: stockPage }} />
          }
        />
      </div>
    </>
  );
}
