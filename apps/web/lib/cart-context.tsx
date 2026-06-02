"use client";

import { createContext, useContext, useState } from "react";

interface CartUI {
  open: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartUIContext = createContext<CartUI | null>(null);

export function CartUIProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CartUIContext.Provider value={{ open, openCart: () => setOpen(true), closeCart: () => setOpen(false) }}>
      {children}
    </CartUIContext.Provider>
  );
}

export function useCartUI(): CartUI {
  const ctx = useContext(CartUIContext);
  if (!ctx) throw new Error("useCartUI must be used within CartUIProvider");
  return ctx;
}
