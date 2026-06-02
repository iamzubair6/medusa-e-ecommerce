"use client";

import { ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";

/** Navbar cart icon with a live item-count badge; opens the cart drawer. */
export function CartButton() {
  const { count } = useCart();
  const { openCart } = useCartUI();
  return (
    <button
      type="button"
      aria-label={`Cart${count ? `, ${count} items` : ""}`}
      onClick={openCart}
      className="relative cursor-pointer p-2 transition-colors hover:text-gold"
    >
      <ShoppingBag className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
          {count}
        </span>
      )}
    </button>
  );
}
