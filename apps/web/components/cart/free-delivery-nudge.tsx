"use client";

import { Truck } from "lucide-react";
import { useCartIncentives } from "@/hooks/use-cart-incentives";

/** "Add ৳X more for free delivery" progress strip for the cart drawer.
 *  Driven by the real free-over threshold configured on shipping rates. */
export function FreeDeliveryNudge({ subtotal }: { subtotal: string }) {
  const { freeOver } = useCartIncentives();
  if (!freeOver) return null;

  const current = Number(subtotal.replace(/[^0-9]/g, "")) || 0;
  const remaining = freeOver - current;
  const progress = Math.min(100, Math.round((current / freeOver) * 100));

  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-muted/50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs">
        <Truck className="h-3.5 w-3.5 shrink-0 text-gold" />
        {remaining > 0 ? (
          <span>
            Add <strong>৳{remaining.toLocaleString("en-IN")}</strong> more for <strong>free delivery</strong>
          </span>
        ) : (
          <span className="font-semibold text-gold">You&rsquo;ve unlocked free delivery</span>
        )}
      </p>
      <div className="h-1 overflow-hidden rounded-full bg-border" role="presentation">
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
