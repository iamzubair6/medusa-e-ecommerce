import "server-only";
import { cache } from "react";
import { getSiteSetting } from "@ecom/cms";
import { getActiveCampaign } from "./active-campaign";
import { fetchDivisionCategories, fetchListing, DIVISION_HANDLES } from "@/lib/commerce";
import { parseSiteSettings } from "@/lib/site-settings";
import { parseNavigation, type Navigation } from "@/lib/navigation";

export interface NavDivision {
  handle: string;
  label: string;
  badge?: string; // e.g. "NEW"
}
export interface NavCategory {
  handle: string;
  name: string;
}
export interface NavData {
  divisions: NavDivision[];
  categoriesByDivision: Record<string, NavCategory[]>;
  facets: { occasion: string[]; style: string[]; trend: string[]; colors: { name: string; swatch: string }[] };
  brandByDivision: Record<string, string>;
  announcement: { active: boolean; message: string; href: string };
  navigation: Navigation;
}

const DIVISIONS: NavDivision[] = [
  { handle: "women", label: "Women" },
  { handle: "plus", label: "Plus+Curve" },
  { handle: "men", label: "Men" },
  { handle: "sport", label: "Sport", badge: "NEW" },
  { handle: "kids", label: "Kids" },
  { handle: "beauty", label: "Beauty" },
];

const BRAND: Record<string, string> = {
  women: "MAISON",
  plus: "MAISON CURVE",
  men: "MAISON MEN",
  sport: "MAISON SPORT",
  kids: "MAISON KIDS",
  beauty: "MAISON BEAUTY",
};

export const getNavData = cache(async (): Promise<NavData> => {
  const catLists = await Promise.all(DIVISION_HANDLES.map((h) => fetchDivisionCategories(h)));
  const categoriesByDivision: Record<string, NavCategory[]> = {};
  DIVISION_HANDLES.forEach((h, i) => {
    categoriesByDivision[h] = catLists[i]!.map((c) => ({ handle: c.handle, name: c.name }));
  });

  const [{ facets }, site, navigation, campaign] = await Promise.all([
    fetchListing({}, { limit: 1 }),
    getSiteSetting("site").then(parseSiteSettings).catch(() => parseSiteSettings(null)),
    getSiteSetting("navigation").then(parseNavigation).catch(() => parseNavigation(null)),
    getActiveCampaign(),
  ]);

  // A live campaign with banner copy takes over the announcement bar; its promo
  // code rides along so shoppers see how to redeem it.
  const announcement = campaign?.bannerText
    ? {
        active: true,
        message: campaign.promoCode
          ? `${campaign.bannerText} — use code ${campaign.promoCode}`
          : campaign.bannerText,
        href: campaign.bannerHref,
      }
    : site.announcement;

  // Admin-managed division labels/badges override the defaults when present.
  const divisions = DIVISIONS.map((d) => {
    const nd = navigation.divisions.find((x) => x.handle === d.handle);
    return nd ? { handle: d.handle, label: nd.label || d.label, badge: nd.badge || d.badge } : d;
  });

  return {
    divisions,
    categoriesByDivision,
    facets: { occasion: facets.occasion, style: facets.style, trend: facets.trend, colors: facets.colors },
    brandByDivision: { ...BRAND, ...site.brands },
    announcement,
    navigation,
  };
});
