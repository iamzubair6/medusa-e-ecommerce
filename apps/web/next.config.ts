import type { NextConfig } from "next";
import { join } from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the monorepo root so file tracing isn't confused by stray lockfiles.
  outputFileTracingRoot: join(import.meta.dirname, "../.."),
  // Workspace packages ship TS source; Next transpiles them.
  transpilePackages: ["@ecom/ui", "@ecom/cms"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.medusajs.com" },
      // Medusa demo media + S3-hosted product media
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Medusa-hosted product media (adjust to your storage host)
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
