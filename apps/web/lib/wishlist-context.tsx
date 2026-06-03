"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface WishlistItem {
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
}

interface WishlistApi {
  items: WishlistItem[];
  count: number;
  has: (handle: string) => boolean;
  toggle: (item: WishlistItem) => void;
  remove: (handle: string) => void;
}

const WishlistContext = createContext<WishlistApi | null>(null);
const KEY = "maison.wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as WishlistItem[]);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const persist = useCallback((next: WishlistItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / disabled — keep in-memory */
    }
  }, []);

  const has = useCallback((handle: string) => items.some((i) => i.handle === handle), [items]);

  const toggle = useCallback(
    (item: WishlistItem) => {
      persist(items.some((i) => i.handle === item.handle) ? items.filter((i) => i.handle !== item.handle) : [item, ...items]);
    },
    [items, persist],
  );

  const remove = useCallback((handle: string) => persist(items.filter((i) => i.handle !== handle)), [items, persist]);

  return (
    <WishlistContext.Provider value={{ items, count: items.length, has, toggle, remove }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist(): WishlistApi {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
