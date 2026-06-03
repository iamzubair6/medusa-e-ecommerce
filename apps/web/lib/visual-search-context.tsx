"use client";

import { createContext, useContext, useState } from "react";

interface VisualSearchState {
  open: boolean;
  mode: "product" | "upload";
  productId?: string;
  refImage?: string;
  openSimilar: (productId: string, refImage?: string) => void;
  openUpload: () => void;
  close: () => void;
}

const Ctx = createContext<VisualSearchState | null>(null);

export function VisualSearchProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ open: boolean; mode: "product" | "upload"; productId?: string; refImage?: string }>(
    { open: false, mode: "upload" },
  );
  return (
    <Ctx.Provider
      value={{
        ...state,
        openSimilar: (productId, refImage) => setState({ open: true, mode: "product", productId, refImage }),
        openUpload: () => setState({ open: true, mode: "upload" }),
        close: () => setState((s) => ({ ...s, open: false })),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useVisualSearch(): VisualSearchState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVisualSearch must be used within VisualSearchProvider");
  return ctx;
}
