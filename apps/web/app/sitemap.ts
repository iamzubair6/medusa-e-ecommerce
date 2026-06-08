import type { MetadataRoute } from "next";
import { fetchProductsForIndex } from "@/lib/commerce";

export const revalidate = 3600;

/** Reject after `ms` so a cold/slow Medusa can't hang the build past its 60s limit. */
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("sitemap fetch timeout")), ms)),
  ]);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = ["", "/products", "/track"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    // Time-boxed: if Medusa is cold/slow at build, fall back to static routes; ISR
    // (revalidate above) refills product URLs once the backend is warm.
    const products = await withTimeout(fetchProductsForIndex(200), 30_000);
    productRoutes = products.map((p) => ({
      url: `${base}/products/${p.handle}`,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch {
    // Medusa unavailable at build — ship the static routes only.
  }

  return [...staticRoutes, ...productRoutes];
}
