"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select } from "@ecom/ui";

const OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
];

/** Updates the `sort` query param (resets to page 1). Radix-based select. */
export function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const onValueChange = (next: string) => {
    const sp = new URLSearchParams(params.toString());
    sp.set("sort", next);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:inline">
        Sort
      </span>
      <Select value={value} onValueChange={onValueChange} options={OPTIONS} aria-label="Sort products" className="w-56" />
    </div>
  );
}
