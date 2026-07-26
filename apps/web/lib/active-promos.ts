import { unstable_cache } from "next/cache";
import { getSiteSetting } from "@ecom/cms";
import { listPromotions, listShippingRates } from "./medusa-admin";
import { FREE_DELIVERY_ITEMS_CODE } from "./medusa-store";
import { getActiveCampaign } from "./active-campaign";
import { shopTheLookSchema } from "./shop-the-look";
import { personaSchema } from "./persona";
import { getPublicPromoCodes } from "./public-promos";

export interface PromoSuggestion {
  code: string;
  display: string; // "10% off" | "৳100 off" | "Free shipping" | "Buy 1 get 1 free"
  fromCampaign: boolean;
  endsAt: string | null;
}

export interface CartIncentives {
  suggestions: PromoSuggestion[];
  /** Lowest configured free-delivery threshold (৳ item total), null when none. */
  freeOver: number | null;
}

/** Codes that exist but shouldn't be advertised: personal phone rewards,
 *  the Shop-the-Look bundle code, and the checkout persona reward. */
async function hiddenCodes(): Promise<Set<string>> {
  const hidden = new Set<string>();
  try {
    const look = shopTheLookSchema.safeParse(await getSiteSetting("shopTheLook"));
    if (look.success && look.data.bundleCode) hidden.add(look.data.bundleCode.toUpperCase());
  } catch {
    /* ignore */
  }
  try {
    const persona = personaSchema.safeParse(await getSiteSetting("persona"));
    if (persona.success && persona.data.promoCode) hidden.add(persona.data.promoCode.toUpperCase());
  } catch {
    /* ignore */
  }
  return hidden;
}

const load = unstable_cache(
  async (): Promise<CartIncentives> => {
    try {
      const now = Date.now();
      const [promos, campaign, hidden, rates, publicCodes] = await Promise.all([
        listPromotions(),
        getActiveCampaign(),
        hiddenCodes(),
        listShippingRates().catch(() => []),
        getPublicPromoCodes(),
      ]);
      const inWindow = (p: { startsAt: string | null; endsAt: string | null }) =>
        (!p.startsAt || new Date(p.startsAt).getTime() <= now) &&
        (!p.endsAt || new Date(p.endsAt).getTime() >= now);
      // PUBLIC = opt-in (#140): only codes the owner flagged public, plus the
      // live campaign's code (its banner already announces it).
      const suggestions = promos
        .filter(
          (p) =>
            p.status === "active" &&
            !p.automatic && // automatic promos apply on their own — nothing to announce
            inWindow(p) &&
            !p.code.toUpperCase().startsWith("PH-") && // personal phone-reward codes
            !p.code.toUpperCase().startsWith("AB-") && // per-cart recovery codes
            p.code.toUpperCase() !== FREE_DELIVERY_ITEMS_CODE && // storefront-managed
            !hidden.has(p.code.toUpperCase()) &&
            (publicCodes.has(p.code.toUpperCase()) ||
              campaign?.promoCode?.toUpperCase() === p.code.toUpperCase()),
        )
        .map((p) => ({
          code: p.code,
          display: p.display,
          fromCampaign: campaign?.promoCode?.toUpperCase() === p.code.toUpperCase(),
          endsAt: p.endsAt,
        }));
      const thresholds = rates.map((r) => r.freeOver).filter((n): n is number => n != null && n > 0);
      return {
        // The live campaign's code leads.
        suggestions: suggestions.sort((a, b) => Number(b.fromCampaign) - Number(a.fromCampaign)).slice(0, 4),
        freeOver: thresholds.length > 0 ? Math.min(...thresholds) : null,
      };
    } catch {
      return { suggestions: [], freeOver: null }; // never break the cart because promos are unreachable
    }
  },
  ["active-promo-suggestions"],
  { revalidate: 300, tags: ["promo-suggestions"] },
);

/** Publicly advertisable promo codes + the free-delivery threshold. */
export function getCartIncentives(): Promise<CartIncentives> {
  return load();
}
