"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { buttonVariants, cn } from "@ecom/ui";
import { useCart } from "@/hooks/use-cart";
import { useCartUI } from "@/lib/cart-context";
import { PromoCode } from "./promo-code";
import { FreeDeliveryNudge } from "./free-delivery-nudge";

export function CartDrawer() {
  const { open, closeCart } = useCartUI();
  const { cart, updateItem, removeItem } = useCart();
  const reduce = useReducedMotion();
  const busy = updateItem.isPending || removeItem.isPending;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping cart"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl"
            initial={reduce ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="font-display text-lg font-bold">
                Your Bag {cart?.itemCount ? `(${cart.itemCount})` : ""}
              </h2>
              <button type="button" aria-label="Close cart" onClick={closeCart} className="cursor-pointer p-1.5 hover:text-gold">
                <X className="h-5 w-5" />
              </button>
            </header>

            {!cart || cart.items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">Your bag is empty.</p>
                <button type="button" onClick={closeCart} className={buttonVariants({ variant: "outline" })}>
                  Continue shopping
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <ul className="flex flex-col gap-5">
                    {cart.items.map((item) => (
                      <li key={item.id} className="flex gap-3">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                          {item.thumbnail && (
                            <Image src={item.thumbnail} alt={item.title} fill sizes="80px" className="object-cover" />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex justify-between gap-2">
                            <span className="text-sm font-medium">{item.title}</span>
                            <span className="text-sm font-semibold">{item.lineTotal}</span>
                          </div>
                          {item.option && <span className="text-xs text-muted-foreground">{item.option}</span>}
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <div className="flex items-center rounded-md border border-border">
                              <button
                                type="button"
                                aria-label="Decrease"
                                disabled={busy || item.quantity <= 1}
                                onClick={() => updateItem.mutate({ lineId: item.id, quantity: item.quantity - 1 })}
                                className="cursor-pointer p-1.5 hover:bg-muted disabled:opacity-40"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-sm">{item.quantity}</span>
                              <button
                                type="button"
                                aria-label="Increase"
                                disabled={busy}
                                onClick={() => updateItem.mutate({ lineId: item.id, quantity: item.quantity + 1 })}
                                className="cursor-pointer p-1.5 hover:bg-muted disabled:opacity-40"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <button
                              type="button"
                              aria-label="Remove item"
                              disabled={busy}
                              onClick={() => removeItem.mutate(item.id)}
                              className="cursor-pointer p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <footer className="border-t border-border px-5 py-4">
                  <div className="mb-3">
                    <FreeDeliveryNudge subtotal={cart.subtotal} />
                  </div>
                  <div className="mb-3">
                    <PromoCode />
                  </div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">{cart.subtotal}</span>
                  </div>
                  {cart.hasDiscount && (
                    <div className="mb-2 flex justify-between text-sm text-gold">
                      <span>Discount</span>
                      <span>-{cart.discountTotal}</span>
                    </div>
                  )}
                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className={cn("w-full", buttonVariants({ variant: "gold", size: "lg" }))}
                  >
                    Checkout
                  </Link>
                  <Link
                    href="/cart"
                    onClick={closeCart}
                    className="mt-2 block text-center text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
                  >
                    View full bag
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
