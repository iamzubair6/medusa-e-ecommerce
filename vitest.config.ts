import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

/**
 * Workspace-wide unit/component test runner.
 * - jsdom + React Testing Library for component tests (React 19).
 * - `@/` resolves to apps/web (matches the Next tsconfig path alias).
 * - Playwright e2e lives under apps/web/e2e and is excluded here (different runner).
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./apps/web", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "apps/web/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "apps/medusa/**",
      "**/e2e/**",
    ],
  },
});
