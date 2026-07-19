"use client";

import { useState } from "react";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartUIProvider } from "@/lib/cart-context";
import { WishlistProvider } from "@/lib/wishlist-context";

/** Client-side providers (TanStack Query + cart UI state). */
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, refetchOnWindowFocus: false, retry: 1 },
        },
      }),
  );
  return (
    // reducedMotion="user" makes EVERY framer-motion animation respect the OS
    // prefers-reduced-motion setting, including components without their own guard.
    <MotionConfig reducedMotion="user">
      <QueryClientProvider client={client}>
        <CartUIProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartUIProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}
