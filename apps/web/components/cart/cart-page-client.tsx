"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2 } from "lucide-react";
import { buttonVariants, Card, cn, Skeleton } from "@ecom/ui";
import { useCart } from "@/hooks/use-cart";
import { PromoCode } from "./promo-code";

export function CartPageClient() {
  const { cart, isLoading, updateItem, removeItem } = useCart();
  const busy = updateItem.isPending || removeItem.isPending;

  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold">Your bag is empty</h1>
        <Link href="/products" className={buttonVariants({ variant: "solid" })}>
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div>
        <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Your Bag</h1>
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {cart.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-5">
              <Link
                href={item.handle ? `/products/${item.handle}` : "#"}
                className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md bg-muted"
              >
                {item.thumbnail && (
                  <Image src={item.thumbnail} alt={item.title} fill sizes="96px" className="object-cover" />
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{item.title}</span>
                  <span className="font-semibold">{item.lineTotal}</span>
                </div>
                {item.option && <span className="text-sm text-muted-foreground">{item.option}</span>}
                <span className="text-sm text-muted-foreground">{item.unitPrice} each</span>
                <div className="mt-auto flex items-center gap-4 pt-3">
                  <div className="flex items-center rounded-md border border-border">
                    <button
                      type="button"
                      aria-label="Decrease"
                      disabled={busy || item.quantity <= 1}
                      onClick={() => updateItem.mutate({ lineId: item.id, quantity: item.quantity - 1 })}
                      className="cursor-pointer p-2 hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      aria-label="Increase"
                      disabled={busy}
                      onClick={() => updateItem.mutate({ lineId: item.id, quantity: item.quantity + 1 })}
                      className="cursor-pointer p-2 hover:bg-muted disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => removeItem.mutate(item.id)}
                    className="flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <Card className="h-fit p-6">
        <h2 className="mb-4 font-display text-lg font-bold">Order Summary</h2>
        <div className="mb-4">
          <PromoCode />
        </div>
        <div className="flex justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold">{cart.subtotal}</span>
        </div>
        {cart.hasDiscount && (
          <div className="flex justify-between pt-2 text-sm text-gold">
            <span>Discount</span>
            <span>-{cart.discountTotal}</span>
          </div>
        )}
        <p className="py-3 text-xs text-muted-foreground">Shipping calculated at checkout.</p>
        <Link href="/checkout" className={cn("w-full", buttonVariants({ variant: "gold", size: "lg" }))}>
          Checkout
        </Link>
      </Card>
    </div>
  );
}
