import { unstable_cache } from "next/cache";
import { getSiteSetting } from "@ecom/cms";
import { listPromotions } from "./medusa-admin";
import { getActiveCampaign } from "./active-campaign";
import { shopTheLookSchema } from "./shop-the-look";
import { personaSchema } from "./persona";

export interface PromoSuggestion {
  code: string;
  display: string; // "10% off" | "৳100 off" | "Free shipping" | "Buy 1 get 1 free"
  fromCampaign: boolean;
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
  async (): Promise<PromoSuggestion[]> => {
    try {
      const now = Date.now();
      const [promos, campaign, hidden] = await Promise.all([listPromotions(), getActiveCampaign(), hiddenCodes()]);
      const inWindow = (p: { startsAt: string | null; endsAt: string | null }) =>
        (!p.startsAt || new Date(p.startsAt).getTime() <= now) &&
        (!p.endsAt || new Date(p.endsAt).getTime() >= now);
      const suggestions = promos
        .filter(
          (p) =>
            p.status === "active" &&
            !p.automatic && // automatic promos apply on their own — nothing to announce
            inWindow(p) &&
            !p.code.toUpperCase().startsWith("PH-") && // personal phone-reward codes
            !hidden.has(p.code.toUpperCase()),
        )
        .map((p) => ({
          code: p.code,
          display: p.display,
          fromCampaign: campaign?.promoCode?.toUpperCase() === p.code.toUpperCase(),
        }));
      // The live campaign's code leads.
      return suggestions.sort((a, b) => Number(b.fromCampaign) - Number(a.fromCampaign)).slice(0, 4);
    } catch {
      return []; // never break the cart because promos are unreachable
    }
  },
  ["active-promo-suggestions"],
  { revalidate: 300, tags: ["promo-suggestions"] },
);

/** Publicly advertisable promo codes (active, coded, in date window). */
export function getPromoSuggestions(): Promise<PromoSuggestion[]> {
  return load();
}
