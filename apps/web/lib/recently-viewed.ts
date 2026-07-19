"use client";

export interface ViewedProduct {
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
}

const KEY = "maison:recently-viewed";
const MAX = 12;

/** Read the recently-viewed list (newest first). Safe on server / private mode. */
export function readRecentlyViewed(): ViewedProduct[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is ViewedProduct =>
        !!p && typeof p === "object" && typeof (p as ViewedProduct).handle === "string",
    );
  } catch {
    return [];
  }
}

/** Record a viewed product (dedup by handle, newest first, capped). */
export function recordView(product: ViewedProduct): void {
  if (typeof window === "undefined") return;
  try {
    const list = readRecentlyViewed().filter((p) => p.handle !== product.handle);
    list.unshift(product);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage full / disabled — non-critical */
  }
}
