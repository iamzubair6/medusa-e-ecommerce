import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { ExecArgs } from "@medusajs/framework/types";
import {
  createProductCategoriesWorkflow,
  createCollectionsWorkflow,
  batchLinkProductsToCategoryWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Aligns the catalog taxonomy with the storefront nav (Women, Men, New, Sale).
 * Creates the categories/collections if missing and assigns demo products so the
 * nav links (/c/women, /c/men, /collections/new, /collections/sale) show products.
 *
 * A product can be in many categories but only one collection.
 *
 * Run: npx medusa exec ./src/scripts/seed-storefront-taxonomy.ts
 */
export default async function seedStorefrontTaxonomy({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // --- products by title ---
  const { data: products } = await query.graph({ entity: "product", fields: ["id", "title"] });
  const idByTitle = new Map<string, string>(products.map((p) => [p.title, p.id]));
  const ids = (titles: string[]): string[] =>
    titles.map((t) => idByTitle.get(t)).filter((v): v is string => Boolean(v));

  const WOMEN = ids(["Sculpt Seamless Bodysuit", "Ribbed Knit Tank", "Satin Slip Dress"]);
  const MEN = ids(["Medusa T-Shirt", "Medusa Sweatshirt", "Medusa Sweatpants", "Medusa Shorts"]);
  const NEW = ids(["Sculpt Seamless Bodysuit", "Ribbed Knit Tank", "Satin Slip Dress"]);
  const SALE = ids(["Medusa T-Shirt", "Medusa Shorts"]);

  // --- categories (find or create) ---
  const { data: existingCats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] });
  const catByHandle = new Map<string, string>(existingCats.map((c) => [c.handle, c.id]));
  const wantedCats = [
    { name: "Women", handle: "women" },
    { name: "Men", handle: "men" },
  ].filter((c) => !catByHandle.has(c.handle));
  if (wantedCats.length) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: { product_categories: wantedCats.map((c) => ({ ...c, is_active: true })) },
    });
    result.forEach((c) => catByHandle.set(c.handle, c.id));
    logger.info(`Created categories: ${wantedCats.map((c) => c.name).join(", ")}`);
  }

  // --- collections (find or create) ---
  const { data: existingCols } = await query.graph({ entity: "product_collection", fields: ["id", "handle"] });
  const colByHandle = new Map<string, string>(existingCols.map((c) => [c.handle, c.id]));
  const wantedCols = [
    { title: "New Arrivals", handle: "new" },
    { title: "Sale", handle: "sale" },
  ].filter((c) => !colByHandle.has(c.handle));
  if (wantedCols.length) {
    const { result } = await createCollectionsWorkflow(container).run({
      input: { collections: wantedCols },
    });
    result.forEach((c) => colByHandle.set(c.handle, c.id));
    logger.info(`Created collections: ${wantedCols.map((c) => c.title).join(", ")}`);
  }

  // --- link products to categories ---
  for (const [handle, productIds] of [["women", WOMEN], ["men", MEN]] as const) {
    const catId = catByHandle.get(handle);
    if (catId && productIds.length) {
      await batchLinkProductsToCategoryWorkflow(container).run({ input: { id: catId, add: productIds } });
      logger.info(`Linked ${productIds.length} products to category '${handle}'.`);
    }
  }

  // --- assign products to collections (single collection per product) ---
  for (const [handle, productIds] of [["new", NEW], ["sale", SALE]] as const) {
    const colId = colByHandle.get(handle);
    if (colId && productIds.length) {
      await updateProductsWorkflow(container).run({
        input: { selector: { id: productIds }, update: { collection_id: colId } },
      });
      logger.info(`Assigned ${productIds.length} products to collection '${handle}'.`);
    }
  }

  logger.info("Storefront taxonomy seed complete (Women, Men, New, Sale).");
}
