import { test, expect } from "@playwright/test";

test.describe("storefront", () => {
  test("home renders on placeholder data (no backend required)", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok(), "GET / should return a 2xx status").toBeTruthy();
    await expect(page.getByRole("main")).toBeVisible();
  });
});
