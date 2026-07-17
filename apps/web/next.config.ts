import type { NextConfig } from "next";
import { join } from "node:path";

// Prisma's native query engine (.node binary) isn't auto-bundled into Vercel's
// serverless functions, so force-trace it. Path is relative to this app dir;
// the glob tolerates the bun-hashed @prisma/client directory name.
const PRISMA_ENGINE_GLOB =
  "../../node_modules/.bun/@prisma+client@*/node_modules/.prisma/client/libquery_engine-rhel-openssl-3.0.x.so.node";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the monorepo root so file tracing isn't confused by stray lockfiles.
  outputFileTracingRoot: join(import.meta.dirname, "../.."),
  // Keep Prisma out of the webpack bundle so its engine path resolution works.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // Copy the rhel engine binary next to every server route that may hit the CMS.
  outputFileTracingIncludes: {
    "/": [PRISMA_ENGINE_GLOB],
    "/admin/**": [PRISMA_ENGINE_GLOB],
    "/api/**": [PRISMA_ENGINE_GLOB],
  },
  // Workspace packages ship TS source; Next transpiles them.
  transpilePackages: ["@ecom/ui", "@ecom/cms"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "**.medusajs.com" },
      // Medusa demo media + S3-hosted product media
      { protocol: "https", hostname: "**.amazonaws.com" },
      // Cloudflare R2 public buckets (our media storage — docs/STORAGE_SETUP.md)
      { protocol: "https", hostname: "**.r2.dev" },
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
