import { cache } from "react";
import { listCampaigns, campaignPayloadSchema, type CampaignPayload } from "@ecom/cms";

export interface ActiveCampaign {
  id: string;
  name: string;
  promoCode: string | null;
  bannerText: string | null;
  bannerHref: string;
}

/** The campaign currently live on the storefront: status ACTIVE and inside its
 *  date window (most recently started wins when several overlap). */
export const getActiveCampaign = cache(async (): Promise<ActiveCampaign | null> => {
  try {
    const now = Date.now();
    const live = (await listCampaigns())
      .filter(
        (c) =>
          c.status === "ACTIVE" &&
          new Date(c.startsAt).getTime() <= now &&
          (!c.endsAt || new Date(c.endsAt).getTime() >= now),
      )
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0];
    if (!live) return null;
    const payload: CampaignPayload = campaignPayloadSchema.parse(live.payload ?? {});
    return {
      id: live.id,
      name: live.name,
      promoCode: payload.promoCode?.trim() || null,
      // A live campaign always announces itself: explicit banner text wins,
      // otherwise the campaign name is the banner (#138 — owner expectation).
      bannerText: payload.bannerText?.trim() || live.name.trim() || null,
      bannerHref: payload.bannerHref?.trim() || "/products",
    };
  } catch {
    return null; // storefront must never break because campaigns are unreachable
  }
});
