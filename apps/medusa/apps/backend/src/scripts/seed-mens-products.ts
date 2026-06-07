import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import type { ExecArgs } from "@medusajs/framework/types";
import {
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
  batchLinkProductsToCategoryWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Adds men's demo products and wires them into the existing storefront taxonomy
 * (Men category; New + Sale collections) so every nav link shows products.
 * Idempotent: re-running replaces products with the same handles.
 *
 * Run AFTER seed-storefront-taxonomy.ts.
 * Run: npx medusa exec ./src/scripts/seed-mens-products.ts
 */

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=1125&q=80`;

interface ColorDef {
  swatch: string;
  price: number; // BDT
  original?: number; // BDT, for strikethrough
  images: string[];
  sizes: Record<string, { stock: number }>;
}
interface ProductDef {
  title: string;
  handle: string;
  description: string;
  collection: "new" | "sale";
  offer?: { type: "bogo" | "discount"; label: string; percent?: number };
  colors: Record<string, ColorDef>;
}

const PRODUCTS: ProductDef[] = [
  {
    title: "Oxford Cotton Shirt",
    handle: "oxford-cotton-shirt",
    description: "A crisp button-down in breathable Oxford cotton. Tailored fit, all-day comfort, dress it up or down.",
    collection: "new",
    colors: {
      White: { swatch: "#f2efe9", price: 240, images: [img("1490481651871-ab68de25d43d"), img("1483985988355-763728e1935b")], sizes: { M: { stock: 18 }, L: { stock: 9 }, XL: { stock: 4 } } },
      Blue: { swatch: "#3b5b87", price: 240, images: [img("1485462537746-965f33f7f6a7"), img("1525507119028-ed4c629a60a3")], sizes: { S: { stock: 12 }, M: { stock: 20 }, L: { stock: 7 } } },
    },
  },
  {
    title: "Slim Fit Chinos",
    handle: "slim-fit-chinos",
    description: "Versatile stretch-cotton chinos with a clean slim taper. Office to weekend in one pair.",
    collection: "new",
    colors: {
      Khaki: { swatch: "#c2b280", price: 300, images: [img("1542272604-787c3835535d"), img("1483118714900-540cf339fd46")], sizes: { M: { stock: 15 }, L: { stock: 11 }, XL: { stock: 6 } } },
      Navy: { swatch: "#26324a", price: 300, images: [img("1469334031218-e382a71b716b"), img("1551232864-3f0890e580d9")], sizes: { S: { stock: 8 }, M: { stock: 14 }, L: { stock: 5 } } },
    },
  },
  {
    title: "Essential Crew Tee",
    handle: "essential-crew-tee",
    description: "A heavyweight crew-neck tee in soft combed cotton. The everyday staple, now on sale.",
    collection: "sale",
    offer: { type: "discount", label: "30% OFF", percent: 30 },
    colors: {
      Black: { swatch: "#1b1b1b", price: 140, original: 200, images: [img("1485462537746-965f33f7f6a7"), img("1490481651871-ab68de25d43d")], sizes: { S: { stock: 22 }, M: { stock: 18 }, L: { stock: 10 } } },
      Grey: { swatch: "#8a8a8a", price: 140, original: 200, images: [img("1483985988355-763728e1935b"), img("1542272604-787c3835535d")], sizes: { M: { stock: 16 }, L: { stock: 9 } } },
    },
  },
  {
    title: "Bomber Jacket",
    handle: "bomber-jacket",
    description: "A classic ribbed-collar bomber with a smooth shell and zip front. Lightweight layering, marked down.",
    collection: "sale",
    offer: { type: "discount", label: "25% OFF", percent: 25 },
    colors: {
      Black: { swatch: "#1b1b1b", price: 480, original: 640, images: [img("1490481651871-ab68de25d43d"), img("1469334031218-e382a71b716b")], sizes: { M: { stock: 6 }, L: { stock: 8 }, XL: { stock: 3 } } },
      Olive: { swatch: "#5b6b3a", price: 480, original: 640, images: [img("1483118714900-540cf339fd46"), img("1525507119028-ed4c629a60a3")], sizes: { S: { stock: 4 }, M: { stock: 9 }, L: { stock: 2 } } },
    },
  },
];

const sku = (handle: string, color: string, size: string) =>
  `${handle}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");

export default async function seedMensProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"] });
  const salesChannelId = channels[0].id;
  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
  const shippingProfileId = shippingProfiles[0].id;

  // idempotent: drop existing products with our handles
  const handles = PRODUCTS.map((p) => p.handle);
  const { data: existing } = await query.graph({ entity: "product", fields: ["id"], filters: { handle: handles } });
  if (existing.length) {
    await productModule.deleteProducts(existing.map((p: { id: string }) => p.id));
    logger.info(`Removed ${existing.length} existing men's demo products.`);
  }

  const usd = (bdt: number) => Math.max(1, Math.round(bdt / 120));
  const eur = (bdt: number) => Math.max(1, Math.round(bdt / 130));

  const productsInput = PRODUCTS.map((p) => {
    const colorNames = Object.keys(p.colors);
    const sizeSet = new Set<string>();
    colorNames.forEach((c) => Object.keys(p.colors[c]!.sizes).forEach((s) => sizeSet.add(s)));
    const variants = colorNames.flatMap((c) =>
      Object.keys(p.colors[c]!.sizes).map((s) => ({
        title: `${s} / ${c}`,
        sku: sku(p.handle, c, s),
        options: { Size: s, Color: c },
        prices: [
          { amount: p.colors[c]!.price, currency_code: "bdt" },
          { amount: usd(p.colors[c]!.price), currency_code: "usd" },
          { amount: eur(p.colors[c]!.price), currency_code: "eur" },
        ],
      })),
    );
    const metadata = {
      swatches: Object.fromEntries(colorNames.map((c) => [c, p.colors[c]!.swatch])),
      colorImages: Object.fromEntries(colorNames.map((c) => [c, p.colors[c]!.images])),
      colorPrices: Object.fromEntries(colorNames.map((c) => [c, p.colors[c]!.price])),
      colorOriginalPrices: Object.fromEntries(
        colorNames.filter((c) => p.colors[c]!.original).map((c) => [c, p.colors[c]!.original]),
      ),
      sizeStock: Object.fromEntries(
        colorNames.map((c) => [c, Object.fromEntries(Object.entries(p.colors[c]!.sizes).map(([s, v]) => [s, v.stock]))]),
      ),
      ...(p.offer ? { offer: p.offer } : {}),
    };
    return {
      title: p.title,
      handle: p.handle,
      description: p.description,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfileId,
      weight: 400,
      images: colorNames.flatMap((c) => p.colors[c]!.images).map((url) => ({ url })),
      options: [
        { title: "Size", values: [...sizeSet] },
        { title: "Color", values: colorNames },
      ],
      variants,
      sales_channels: [{ id: salesChannelId }],
      metadata,
    };
  });

  await createProductsWorkflow(container).run({ input: { products: productsInput } });
  logger.info(`Created ${productsInput.length} men's demo products.`);

  // inventory levels at the first stock location
  const { data: stockLocations } = await query.graph({ entity: "stock_location", fields: ["id"] });
  const locationId = stockLocations[0].id;
  const { data: items } = await query.graph({ entity: "inventory_item", fields: ["id", "location_levels.location_id"] });
  const needLevels = items.filter((it) => !(it.location_levels ?? []).some((l) => l?.location_id === locationId));
  if (needLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: needLevels.map((it: { id: string }) => ({ location_id: locationId, inventory_item_id: it.id, stocked_quantity: 200 })),
      },
    });
    logger.info(`Created ${needLevels.length} inventory levels.`);
  }

  // map created products back to ids by handle
  const { data: created } = await query.graph({ entity: "product", fields: ["id", "handle"], filters: { handle: handles } });
  const idByHandle = new Map<string, string>(created.map((p) => [p.handle, p.id]));
  const allIds = [...idByHandle.values()];

  // link all to Men category
  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "handle"], filters: { handle: ["men"] } });
  const menId = cats[0]?.id;
  if (menId && allIds.length) {
    await batchLinkProductsToCategoryWorkflow(container).run({ input: { id: menId, add: allIds } });
    logger.info(`Linked ${allIds.length} products to category 'men'.`);
  }

  // assign New / Sale collections
  const { data: cols } = await query.graph({ entity: "product_collection", fields: ["id", "handle"], filters: { handle: ["new", "sale"] } });
  const colByHandle = new Map<string, string>(cols.map((c) => [c.handle, c.id]));
  for (const target of ["new", "sale"] as const) {
    const colId = colByHandle.get(target);
    const productIds = PRODUCTS.filter((p) => p.collection === target).map((p) => idByHandle.get(p.handle)).filter((v): v is string => Boolean(v));
    if (colId && productIds.length) {
      await updateProductsWorkflow(container).run({ input: { selector: { id: productIds }, update: { collection_id: colId } } });
      logger.info(`Assigned ${productIds.length} products to collection '${target}'.`);
    }
  }

  logger.info("Men's products + taxonomy wiring complete.");
}
