import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@ecom/ui";

/** Link-based pager for admin list pages. `basePath` carries existing query (sans page). */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => `${basePath}${basePath.includes("?") ? "&" : "?"}page=${p}`;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const link = (p: number, disabled: boolean, label: React.ReactNode) =>
    disabled ? (
      <span className="flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm text-muted-foreground/40">
        {label}
      </span>
    ) : (
      <Link
        href={href(p)}
        className={cn("flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm transition-colors hover:bg-muted")}
      >
        {label}
      </Link>
    );

  return (
    <div className="mt-6 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {link(page - 1, page <= 1, <><ChevronLeft className="h-4 w-4" /> Prev</>)}
        <span className="text-sm text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        {link(page + 1, page >= totalPages, <>Next <ChevronRight className="h-4 w-4" /></>)}
      </div>
    </div>
  );
}
