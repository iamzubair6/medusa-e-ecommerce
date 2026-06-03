import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import type { ExecArgs } from "@medusajs/framework/types";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * One-shot "reset to a Bangladesh store" seed. It is idempotent and safe to re-run.
 *
 *  1. Removes the EU demo data (Europe region, EU shipping options, European
 *     Warehouse, the Medusa menswear demo products, the EUR WELCOME10 promo).
 *  2. Makes BDT the default store currency and ensures the Bangladesh region.
 *  3. Ensures a Dhaka warehouse + a 'bd' service zone, then Inside/Outside Dhaka
 *     shipping options (৳60 / ৳120) and Cash-on-Delivery (pp_system_default).
 *  4. Seeds fashion categories + collections whose handles match the storefront
 *     nav (dresses, tops, denim, women, bodysuits, bottoms, sets / new, best,
 *     edit, sale) and a women's-fashion catalog assigned to them.
 *  5. Re-creates WELCOME10 (10% off, percentage — currency-agnostic).
 *
 * Run (Node 20): npx medusa exec ./src/scripts/seed-bd-store.ts
 */

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=1125&q=80`;

const CATEGORIES = [
  { name: "Women", handle: "women" },
  { name: "Dresses", handle: "dresses" },
  { name: "Tops", handle: "tops" },
  { name: "Denim", handle: "denim" },
  { name: "Bottoms", handle: "bottoms" },
  { name: "Bodysuits", handle: "bodysuits" },
  { name: "Sets", handle: "sets" },
  { name: "Swim", handle: "swim" },
];

const COLLECTIONS = [
  { title: "New In", handle: "new" },
  { title: "Best Sellers", handle: "best" },
  { title: "Summer Edit", handle: "edit" },
  { title: "Sale", handle: "sale" },
];

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
  categories: string[]; // category handles
  collection?: string; // collection handle
  offer?: { type: "bogo" | "discount"; label: string; percent?: number };
  colors: Record<string, ColorDef>;
}

const PRODUCTS: ProductDef[] = [
  {
    title: "Sculpt Seamless Bodysuit",
    handle: "sculpt-bodysuit",
    description:
      "A second-skin seamless bodysuit with a sculpted, snatched silhouette. Buttery soft, fully opaque, and built to layer or stand alone.",
    categories: ["women", "bodysuits", "tops"],
    collection: "best",
    offer: { type: "bogo", label: "BUY 1 GET 1 FREE" },
    colors: {
      Black: {
        swatch: "#1b1b1b",
        price: 1290,
        original: 1690,
        images: [img("1490481651871-ab68de25d43d"), img("1485462537746-965f33f7f6a7"), img("1483985988355-763728e1935b")],
        sizes: { S: { stock: 14 }, M: { stock: 3 }, L: { stock: 22 } },
      },
      Sand: {
        swatch: "#d8c4a0",
        price: 1290,
        original: 1690,
        images: [img("1525507119028-ed4c629a60a3"), img("1551232864-3f0890e580d9")],
        sizes: { S: { stock: 9 }, M: { stock: 11 } },
      },
      Olive: {
        swatch: "#5b6b3a",
        price: 1090,
        images: [img("1542272604-787c3835535d"), img("1469334031218-e382a71b716b")],
        sizes: { S: { stock: 18 }, M: { stock: 7 }, L: { stock: 12 }, XL: { stock: 2 } },
      },
    },
  },
  {
    title: "Ribbed Knit Tank",
    handle: "ribbed-knit-tank",
    description: "A fitted ribbed tank in a soft stretch knit. Everyday essential with a flattering scoop neck.",
    categories: ["women", "tops"],
    collection: "new",
    offer: { type: "discount", label: "25% OFF", percent: 25 },
    colors: {
      White: {
        swatch: "#f2efe9",
        price: 890,
        original: 1190,
        images: [img("1551232864-3f0890e580d9"), img("1483985988355-763728e1935b")],
        sizes: { S: { stock: 20 }, M: { stock: 15 }, L: { stock: 4 } },
      },
      Black: {
        swatch: "#1b1b1b",
        price: 890,
        original: 1190,
        images: [img("1485462537746-965f33f7f6a7"), img("1490481651871-ab68de25d43d")],
        sizes: { S: { stock: 25 }, M: { stock: 10 } },
      },
      Sage: {
        swatch: "#9aa789",
        price: 790,
        original: 1090,
        images: [img("1469334031218-e382a71b716b"), img("1542272604-787c3835535d")],
        sizes: { S: { stock: 5 }, M: { stock: 8 }, L: { stock: 30 } },
      },
    },
  },
  {
    title: "Satin Slip Dress",
    handle: "satin-slip-dress",
    description: "A bias-cut satin slip dress with adjustable straps and a fluid drape. Effortless from dinner to dancefloor.",
    categories: ["women", "dresses"],
    collection: "edit",
    colors: {
      Champagne: {
        swatch: "#e7d2b0",
        price: 2490,
        images: [img("1525507119028-ed4c629a60a3"), img("1483118714900-540cf339fd46")],
        sizes: { S: { stock: 6 }, M: { stock: 9 }, L: { stock: 3 } },
      },
      Black: {
        swatch: "#1b1b1b",
        price: 2490,
        images: [img("1490481651871-ab68de25d43d"), img("1485462537746-965f33f7f6a7")],
        sizes: { S: { stock: 12 }, M: { stock: 12 }, L: { stock: 12 } },
      },
    },
  },
  {
    title: "High-Waist Skinny Jeans",
    handle: "high-waist-skinny-jeans",
    description: "Sculpting high-rise skinny jeans in a premium stretch denim that holds its shape all day.",
    categories: ["women", "denim", "bottoms"],
    collection: "best",
    offer: { type: "discount", label: "20% OFF", percent: 20 },
    colors: {
      Indigo: {
        swatch: "#33405e",
        price: 1990,
        original: 2490,
        images: [img("1541099649105-f69ad21f3246"), img("1542272604-787c3835535d")],
        sizes: { S: { stock: 16 }, M: { stock: 9 }, L: { stock: 5 }, XL: { stock: 11 } },
      },
      Black: {
        swatch: "#1b1b1b",
        price: 1990,
        original: 2490,
        images: [img("1475178626620-a4d074967452"), img("1490481651871-ab68de25d43d")],
        sizes: { S: { stock: 20 }, M: { stock: 14 }, L: { stock: 3 } },
      },
    },
  },
  {
    title: "Oversized Denim Jacket",
    handle: "oversized-denim-jacket",
    description: "A relaxed, oversized denim jacket with dropped shoulders — the throw-over-everything layer.",
    categories: ["women", "denim"],
    collection: "new",
    colors: {
      "Washed Blue": {
        swatch: "#7d93b2",
        price: 2790,
        images: [img("1551537482-f2075a1d41f2"), img("1525507119028-ed4c629a60a3")],
        sizes: { S: { stock: 8 }, M: { stock: 10 }, L: { stock: 6 } },
      },
    },
  },
  {
    title: "Pleated Midi Skirt",
    handle: "pleated-midi-skirt",
    description: "A fluid pleated midi skirt with a high waist and a swishy, photogenic movement.",
    categories: ["women", "bottoms"],
    collection: "edit",
    colors: {
      Bone: {
        swatch: "#e8e2d5",
        price: 1690,
        images: [img("1583496661160-fb5886a0aaaa"), img("1551232864-3f0890e580d9")],
        sizes: { S: { stock: 12 }, M: { stock: 7 }, L: { stock: 9 } },
      },
      Claret: {
        swatch: "#7c2c39",
        price: 1690,
        images: [img("1572804013309-59a88b7e92f1"), img("1469334031218-e382a71b716b")],
        sizes: { S: { stock: 4 }, M: { stock: 14 }, L: { stock: 10 } },
      },
    },
  },
  {
    title: "Two-Piece Lounge Set",
    handle: "two-piece-lounge-set",
    description: "A matching ribbed top and shorts set in a soft modal blend — elevated comfort, head to toe.",
    categories: ["women", "sets", "tops"],
    collection: "new",
    offer: { type: "discount", label: "SET DEAL", percent: 15 },
    colors: {
      Mocha: {
        swatch: "#6f5645",
        price: 1890,
        original: 2390,
        images: [img("1483985988355-763728e1935b"), img("1542272604-787c3835535d")],
        sizes: { S: { stock: 10 }, M: { stock: 12 }, L: { stock: 8 } },
      },
      Grey: {
        swatch: "#9a9a98",
        price: 1890,
        original: 2390,
        images: [img("1485462537746-965f33f7f6a7"), img("1490481651871-ab68de25d43d")],
        sizes: { S: { stock: 15 }, M: { stock: 5 } },
      },
    },
  },
  {
    title: "Halter Maxi Dress",
    handle: "halter-maxi-dress",
    description: "A floor-sweeping halter maxi with an open back and a tie neck — a statement for warm evenings.",
    categories: ["women", "dresses"],
    collection: "sale",
    offer: { type: "discount", label: "30% OFF", percent: 30 },
    colors: {
      Emerald: {
        swatch: "#1f5c4d",
        price: 2790,
        original: 3990,
        images: [img("1495385794356-15371f348c31"), img("1483118714900-540cf339fd46")],
        sizes: { S: { stock: 6 }, M: { stock: 8 }, L: { stock: 4 } },
      },
      Black: {
        swatch: "#1b1b1b",
        price: 2790,
        original: 3990,
        images: [img("1490481651871-ab68de25d43d"), img("1525507119028-ed4c629a60a3")],
        sizes: { S: { stock: 9 }, M: { stock: 9 }, L: { stock: 9 } },
      },
    },
  },
];

const sku = (handle: string, color: string, size: string) =>
  `${handle}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");

export default async function seedBdStore({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const productModule = container.resolve(Modules.PRODUCT);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const regionModule = container.resolve(Modules.REGION);
  const stockLocationModule = container.resolve(Modules.STOCK_LOCATION);
  const promotionModule = container.resolve(Modules.PROMOTION);

  // ===================================================================== //
  // 1. CLEAN UP EU / DEMO DATA (best-effort, each guarded)                 //
  // ===================================================================== //
  // Remove the menswear demo products + any of our handles (reseeded below).
  const demoHandles = ["t-shirt", "sweatshirt", "sweatpants", "shorts", ...PRODUCTS.map((p) => p.handle)];
  const { data: oldProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: demoHandles },
  });
  if (oldProducts.length) {
    await productModule.deleteProducts(oldProducts.map((p: { id: string }) => p.id));
    logger.info(`Removed ${oldProducts.length} demo products.`);
  }

  // Remove EU shipping options (named Standard/Express Shipping).
  const { data: allOptions } = await query.graph({ entity: "shipping_option", fields: ["id", "name"] });
  const euOptions = allOptions.filter((o: { name: string }) => /standard shipping|express shipping/i.test(o.name));
  if (euOptions.length) {
    await fulfillmentModule.deleteShippingOptions(euOptions.map((o: { id: string }) => o.id)).catch((e: Error) => logger.warn(`EU shipping cleanup: ${e.message}`));
    logger.info(`Removed ${euOptions.length} EU shipping options.`);
  }

  // Remove the Europe region.
  const { data: allRegions } = await query.graph({ entity: "region", fields: ["id", "name", "currency_code"] });
  const euRegion = allRegions.find((r: { currency_code: string }) => r.currency_code === "eur");
  if (euRegion) {
    await regionModule.deleteRegions([euRegion.id]).catch((e: Error) => logger.warn(`EU region cleanup (often blocked by demo orders): ${e.message}`));
  }

  // Remove the European Warehouse stock location.
  const { data: allLocations } = await query.graph({ entity: "stock_location", fields: ["id", "name"] });
  const euLocation = allLocations.find((l: { name: string }) => /europe|european/i.test(l.name));
  if (euLocation) {
    await stockLocationModule.deleteStockLocations([euLocation.id]).catch((e: Error) => logger.warn(`EU warehouse cleanup: ${e.message}`));
  }

  // Remove the old EUR WELCOME10 promo (recreated currency-agnostic below).
  const { data: oldPromos } = await query.graph({ entity: "promotion", fields: ["id", "code"], filters: { code: ["WELCOME10"] } });
  if (oldPromos.length) {
    await promotionModule.deletePromotions(oldPromos.map((p: { id: string }) => p.id)).catch(() => undefined);
  }

  // ===================================================================== //
  // 2. STORE CURRENCY + BANGLADESH REGION                                  //
  // ===================================================================== //
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  });
  const store = stores[0];
  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          { currency_code: "bdt", is_default: true },
          { currency_code: "usd", is_default: false },
        ],
      },
    },
  });
  logger.info("BDT is now the default store currency.");

  const { data: regions } = await query.graph({ entity: "region", fields: ["id", "currency_code"] });
  let bdRegion = regions.find((r: { currency_code: string }) => r.currency_code === "bdt");
  if (!bdRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          { name: "Bangladesh", currency_code: "bdt", countries: ["bd"], payment_providers: ["pp_system_default"] },
        ],
      },
    });
    bdRegion = result[0];
    await createTaxRegionsWorkflow(container)
      .run({ input: [{ country_code: "bd", provider_id: "tp_system" }] })
      .catch(() => undefined);
    logger.info("Created Bangladesh (BDT) region with Cash-on-Delivery.");
  }

  // ===================================================================== //
  // 3. DHAKA WAREHOUSE + 'bd' SERVICE ZONE + SHIPPING OPTIONS              //
  // ===================================================================== //
  const { data: locations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name", "fulfillment_sets.id", "fulfillment_sets.type", "fulfillment_sets.service_zones.id", "fulfillment_sets.service_zones.geo_zones.country_code"],
  });
  let dhaka = locations.find((l: { name: string }) => /dhaka/i.test(l.name)) ?? locations[0];
  if (!dhaka) {
    const created = await stockLocationModule.createStockLocations([{ name: "Dhaka Warehouse" }]);
    dhaka = { ...created[0], fulfillment_sets: [] };
    logger.info("Created Dhaka Warehouse.");
  }

  // Find (or create) a shipping fulfillment set + a service zone covering 'bd'.
  type FSet = { id: string; type: string; service_zones?: { id: string; geo_zones?: { country_code: string }[] }[] };
  let shippingSet: FSet | undefined = (dhaka.fulfillment_sets ?? []).find((f: FSet) => f.type === "shipping");
  if (!shippingSet) {
    const set = await fulfillmentModule.createFulfillmentSets({ name: "Dhaka delivery", type: "shipping" });
    await stockLocationModule.updateStockLocations({ selector: { id: dhaka.id }, update: { fulfillment_sets: [{ id: set.id }] } as never }).catch(() => undefined);
    shippingSet = { id: set.id, type: "shipping", service_zones: [] };
  }
  let zone = (shippingSet.service_zones ?? []).find((z) => (z.geo_zones ?? []).some((g) => g.country_code === "bd"))
    ?? (shippingSet.service_zones ?? [])[0];
  if (!zone) {
    const created = await fulfillmentModule.createServiceZones({
      name: "Bangladesh",
      fulfillment_set_id: shippingSet.id,
      geo_zones: [{ country_code: "bd", type: "country" }],
    });
    zone = { id: created.id, geo_zones: [{ country_code: "bd" }] };
  } else if (!(zone.geo_zones ?? []).some((g) => g.country_code === "bd")) {
    await fulfillmentModule.updateServiceZones(zone.id, {
      geo_zones: [...(zone.geo_zones ?? []).map((g) => ({ country_code: g.country_code, type: "country" as const })), { country_code: "bd", type: "country" as const }],
    });
  }

  // Enable the manual fulfillment provider for the Dhaka location (required before
  // shipping options can be created against its zones).
  await link
    .create({
      [Modules.STOCK_LOCATION]: { stock_location_id: dhaka.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
    })
    .catch(() => undefined);

  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
  const shippingProfileId = shippingProfiles[0].id;
  const { data: currentOptions } = await query.graph({ entity: "shipping_option", fields: ["id", "name"] });
  const wantOptions = [
    { name: "Inside Dhaka", desc: "Delivered in 1-2 days.", code: "inside-dhaka", amount: 60 },
    { name: "Outside Dhaka", desc: "Delivered in 3-5 days.", code: "outside-dhaka", amount: 120 },
  ];
  for (const opt of wantOptions) {
    if (currentOptions.some((o: { name: string }) => o.name === opt.name)) continue;
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: opt.name,
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: zone.id,
          shipping_profile_id: shippingProfileId,
          type: { label: "Standard", description: opt.desc, code: opt.code },
          prices: [{ region_id: bdRegion.id, amount: opt.amount }, { currency_code: "bdt", amount: opt.amount }],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    });
    logger.info(`Created shipping option: ${opt.name} (৳${opt.amount}).`);
  }
  // Drop the old single "Standard Delivery (BD)" now that Inside/Outside exist.
  const legacyBd = currentOptions.filter((o: { name: string }) => o.name === "Standard Delivery (BD)");
  if (legacyBd.length) {
    await fulfillmentModule.deleteShippingOptions(legacyBd.map((o: { id: string }) => o.id)).catch(() => undefined);
  }

  // ===================================================================== //
  // 4. CATEGORIES + COLLECTIONS (handles match the storefront nav)         //
  // ===================================================================== //
  const { data: existingCats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] });
  const haveCat = new Set(existingCats.map((c: { handle: string }) => c.handle));
  const toCreateCats = CATEGORIES.filter((c) => !haveCat.has(c.handle));
  if (toCreateCats.length) {
    await productModule.createProductCategories(toCreateCats.map((c) => ({ name: c.name, handle: c.handle, is_active: true })));
    logger.info(`Created ${toCreateCats.length} categories.`);
  }
  const { data: cats } = await query.graph({ entity: "product_category", fields: ["id", "handle"] });
  const catIdByHandle = new Map(cats.map((c: { handle: string; id: string }) => [c.handle, c.id]));

  const { data: existingCols } = await query.graph({ entity: "product_collection", fields: ["id", "handle"] });
  const haveCol = new Set(existingCols.map((c: { handle: string }) => c.handle));
  const toCreateCols = COLLECTIONS.filter((c) => !haveCol.has(c.handle));
  if (toCreateCols.length) {
    await productModule.createProductCollections(toCreateCols.map((c) => ({ title: c.title, handle: c.handle })));
    logger.info(`Created ${toCreateCols.length} collections.`);
  }
  const { data: cols } = await query.graph({ entity: "product_collection", fields: ["id", "handle"] });
  const colIdByHandle = new Map(cols.map((c: { handle: string; id: string }) => [c.handle, c.id]));

  // ===================================================================== //
  // 5. PRODUCTS                                                            //
  // ===================================================================== //
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"] });
  const salesChannelId = channels[0].id;

  const productsInput = PRODUCTS.map((p) => {
    const colorNames = Object.keys(p.colors);
    const sizeSet = new Set<string>();
    colorNames.forEach((c) => Object.keys(p.colors[c]!.sizes).forEach((s) => sizeSet.add(s)));
    const variants = colorNames.flatMap((c) =>
      Object.keys(p.colors[c]!.sizes).map((s) => ({
        title: `${s} / ${c}`,
        sku: sku(p.handle, c, s),
        manage_inventory: false,
        options: { Size: s, Color: c },
        prices: [{ amount: p.colors[c]!.price, currency_code: "bdt" }],
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
      weight: 300,
      category_ids: p.categories.map((h) => catIdByHandle.get(h)).filter((x): x is string => Boolean(x)),
      ...(p.collection && colIdByHandle.get(p.collection) ? { collection_id: colIdByHandle.get(p.collection) as string } : {}),
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
  logger.info(`Created ${productsInput.length} Bangladesh fashion products.`);

  // Inventory levels at the Dhaka location (display low-stock is metadata-driven).
  const { data: items } = await query.graph({ entity: "inventory_item", fields: ["id", "location_levels.location_id"] });
  const needLevels = items.filter(
    (it: { location_levels?: { location_id: string }[] }) => !(it.location_levels ?? []).some((l) => l.location_id === dhaka.id),
  );
  if (needLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: needLevels.map((it: { id: string }) => ({ location_id: dhaka.id, inventory_item_id: it.id, stocked_quantity: 500 })),
      },
    });
  }

  // ===================================================================== //
  // 6. PROMO — WELCOME10 (10% off order, currency-agnostic)                //
  // ===================================================================== //
  await promotionModule.createPromotions([
    {
      code: "WELCOME10",
      type: "standard",
      status: "active",
      application_method: { type: "percentage", target_type: "order", allocation: "across", value: 10 },
    },
  ] as never);
  logger.info("Created WELCOME10 (10% off).");

  logger.info("✅ Bangladesh store seed complete.");
}
