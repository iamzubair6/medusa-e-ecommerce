import { describe, it, expect } from "vitest";
import { parseSiteSettings } from "@/lib/site-settings";

describe("parseSiteSettings", () => {
  it("returns brand defaults for null/garbage input", () => {
    const s = parseSiteSettings(null);
    expect(s.brands.women).toBe("MAISON");
    expect(s.categoryTileCount).toBe(7);
    expect(s.announcement.active).toBe(true);
  });

  it("falls back to defaults when a field is out of range", () => {
    // categoryTileCount max is 9 — an invalid value must not leak through.
    const s = parseSiteSettings({ categoryTileCount: 999 });
    expect(s.categoryTileCount).toBe(7);
  });

  it("keeps valid overrides while filling the rest with defaults", () => {
    const s = parseSiteSettings({ deliveryLine: "Same-day in Dhaka" });
    expect(s.deliveryLine).toBe("Same-day in Dhaka");
    expect(s.brands.men).toBe("MAISON MEN");
  });
});
