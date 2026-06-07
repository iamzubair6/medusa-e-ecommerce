import "server-only";
import { cache } from "react";
import { fetchDivisionCategories, fetchListing, DIVISION_HANDLES } from "@/lib/commerce";

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
  announcement: { message: string; href: string };
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

  const { facets } = await fetchListing({}, { limit: 1 });

  return {
    divisions: DIVISIONS,
    categoriesByDivision,
    facets: { occasion: facets.occasion, style: facets.style, trend: facets.trend, colors: facets.colors },
    brandByDivision: BRAND,
    announcement: { message: "FREE SHIPPING ON ORDERS OVER ৳2,000", href: "/products" },
  };
});
