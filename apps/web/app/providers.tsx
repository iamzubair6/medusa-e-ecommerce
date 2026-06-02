"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CartUIProvider } from "@/lib/cart-context";

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
    <QueryClientProvider client={client}>
      <CartUIProvider>{children}</CartUIProvider>
    </QueryClientProvider>
  );
}
