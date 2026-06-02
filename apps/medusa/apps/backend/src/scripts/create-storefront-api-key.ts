import { Modules } from "@medusajs/framework/utils";
import type { ExecArgs } from "@medusajs/framework/types";

/**
 * Creates a secret admin API key for server-to-server calls from the Next
 * storefront (e.g. the parcel tracker looking up orders).
 *
 * Run: npx medusa exec ./src/scripts/create-storefront-api-key.ts
 * Copy the printed token into apps/web/.env as MEDUSA_ADMIN_API_KEY.
 */
export default async function createStorefrontApiKey({ container }: ExecArgs) {
  const apiKeyModule = container.resolve(Modules.API_KEY);

  const existing = await apiKeyModule.listApiKeys({ title: "Storefront server" });
  if (existing.length > 0) {
    console.log("An API key titled 'Storefront server' already exists (redacted):", existing[0].redacted);
    console.log("Delete it in the admin if you need to regenerate the token.");
    return;
  }

  const key = await apiKeyModule.createApiKeys({
    title: "Storefront server",
    type: "secret",
    created_by: "system",
  });

  console.log("\n=== Storefront admin API key (shown once) ===");
  console.log(key.token);
  console.log("=== Add to apps/web/.env as MEDUSA_ADMIN_API_KEY ===\n");
}
