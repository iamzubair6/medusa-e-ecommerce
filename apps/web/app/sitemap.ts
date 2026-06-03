import type { MetadataRoute } from "next";
import { fetchProductsForIndex } from "@/lib/commerce";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticRoutes: MetadataRoute.Sitemap = ["", "/products", "/track"].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await fetchProductsForIndex(200);
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
