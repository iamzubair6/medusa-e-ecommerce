"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartView } from "@/lib/cart-types";

const CART_KEY = ["cart"] as const;

async function fetchCart(): Promise<CartView | null> {
  const res = await fetch("/api/cart");
  if (!res.ok) return null;
  const data = (await res.json()) as { cart: CartView | null };
  return data.cart;
}

async function mutateCart(url: string, method: string, body?: unknown): Promise<CartView | null> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as { cart?: CartView | null; error?: unknown };
  if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Cart update failed");
  return data.cart ?? null;
}

/** Cart query + mutations. Mutations write the returned cart straight into the cache. */
export function useCart() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: CART_KEY, queryFn: fetchCart });
  const onCart = (cart: CartView | null) => qc.setQueryData(CART_KEY, cart);

  const addItem = useMutation({
    mutationFn: (vars: { variantId: string; quantity: number }) =>
      mutateCart("/api/cart/line-items", "POST", vars),
    onSuccess: onCart,
  });
  const updateItem = useMutation({
    mutationFn: (vars: { lineId: string; quantity: number }) =>
      mutateCart(`/api/cart/line-items/${vars.lineId}`, "POST", { quantity: vars.quantity }),
    onSuccess: onCart,
  });
  const removeItem = useMutation({
    mutationFn: (lineId: string) => mutateCart(`/api/cart/line-items/${lineId}`, "DELETE"),
    onSuccess: onCart,
  });
  const applyPromo = useMutation({
    mutationFn: (code: string) => mutateCart("/api/cart/promotions", "POST", { code }),
    onSuccess: onCart,
  });
  const removePromo = useMutation({
    mutationFn: (code: string) => mutateCart("/api/cart/promotions", "DELETE", { code }),
    onSuccess: onCart,
  });

  return {
    cart: query.data ?? null,
    isLoading: query.isLoading,
    count: query.data?.itemCount ?? 0,
    addItem,
    updateItem,
    removeItem,
    applyPromo,
    removePromo,
    refetch: query.refetch,
  };
}
