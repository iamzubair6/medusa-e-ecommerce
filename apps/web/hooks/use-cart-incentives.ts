"use client";

import { useQuery } from "@tanstack/react-query";

export interface PromoSuggestion {
  code: string;
  display: string;
  fromCampaign: boolean;
}

export interface CartIncentives {
  suggestions: PromoSuggestion[];
  freeOver: number | null;
}

const EMPTY: CartIncentives = { suggestions: [], freeOver: null };

/** Advertisable promo codes + free-delivery threshold (cached server-side;
 *  fails silently to empty — everything using it is decorative). */
export function useCartIncentives(): CartIncentives {
  const { data } = useQuery<CartIncentives>({
    queryKey: ["cart-incentives"],
    queryFn: async () => {
      const res = await fetch("/api/promos/active");
      if (!res.ok) return EMPTY;
      const d = (await res.json()) as Partial<CartIncentives>;
      return { suggestions: d.suggestions ?? [], freeOver: d.freeOver ?? null };
    },
    staleTime: 5 * 60 * 1000,
  });
  return data ?? EMPTY;
}
