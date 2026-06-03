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
 * Seeds a Bangladesh/BDT region and rich demo products with Color×Size variants,
 * per-color BDT prices, and storefront metadata (per-color images, swatches,
 * per-size stock for low-stock display, discount/BOGO offers).
 *
 * Run: npx medusa exec ./src/scripts/seed-rich-catalog.ts
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
interface Offer {
  type: "bogo" | "discount";
  label: string;
  percent?: number;
}
interface ProductDef {
  title: string;
  handle: string;
  description: string;
  colors: Record<string, ColorDef>;
  offer?: Offer;
}

const PRODUCTS: ProductDef[] = [
  {
    title: "Sculpt Seamless Bodysuit",
    handle: "sculpt-bodysuit",
    description:
      "A second-skin seamless bodysuit with a sculpted, snatched silhouette. Buttery soft, fully opaque, and built to layer or stand alone.",
    offer: { type: "bogo", label: "BUY 1 GET 1 FREE" },
    colors: {
      Black: {
        swatch: "#1b1b1b",
        price: 200,
        original: 250,
        images: [img("1490481651871-ab68de25d43d"), img("1485462537746-965f33f7f6a7"), img("1483985988355-763728e1935b")],
        sizes: { S: { stock: 14 }, M: { stock: 3 }, L: { stock: 22 } },
      },
      Sand: {
        swatch: "#d8c4a0",
        price: 200,
        original: 250,
        images: [img("1525507119028-ed4c629a60a3"), img("1551232864-3f0890e580d9")],
        sizes: { S: { stock: 9 }, M: { stock: 11 } },
      },
      Olive: {
        swatch: "#5b6b3a",
        price: 160,
        images: [img("1542272604-787c3835535d"), img("1469334031218-e382a71b716b"), img("1483118714900-540cf339fd46")],
        sizes: { S: { stock: 18 }, M: { stock: 7 }, L: { stock: 12 }, XL: { stock: 2 } },
      },
    },
  },
  {
    title: "Ribbed Knit Tank",
    handle: "ribbed-knit-tank",
    description:
      "A fitted ribbed tank in a soft stretch knit. Everyday essential with a flattering scoop neck.",
    offer: { type: "discount", label: "25% OFF", percent: 25 },
    colors: {
      White: {
        swatch: "#f2efe9",
        price: 180,
        original: 240,
        images: [img("1551232864-3f0890e580d9"), img("1483985988355-763728e1935b")],
        sizes: { S: { stock: 20 }, M: { stock: 15 }, L: { stock: 4 } },
      },
      Black: {
        swatch: "#1b1b1b",
        price: 180,
        original: 240,
        images: [img("1485462537746-965f33f7f6a7"), img("1490481651871-ab68de25d43d")],
        sizes: { S: { stock: 25 }, M: { stock: 10 } },
      },
      Sage: {
        swatch: "#9aa789",
        price: 150,
        original: 200,
        images: [img("1469334031218-e382a71b716b"), img("1542272604-787c3835535d")],
        sizes: { S: { stock: 5 }, M: { stock: 8 }, L: { stock: 30 } },
      },
    },
  },
  {
    title: "Satin Slip Dress",
    handle: "satin-slip-dress",
    description:
      "A bias-cut satin slip dress with adjustable straps and a fluid drape. Effortless from dinner to dancefloor.",
    colors: {
      Champagne: {
        swatch: "#e7d2b0",
        price: 320,
        images: [img("1525507119028-ed4c629a60a3"), img("1483118714900-540cf339fd46")],
        sizes: { S: { stock: 6 }, M: { stock: 9 }, L: { stock: 3 } },
      },
      Black: {
        swatch: "#1b1b1b",
        price: 320,
        images: [img("1490481651871-ab68de25d43d"), img("1485462537746-965f33f7f6a7")],
        sizes: { S: { stock: 12 }, M: { stock: 12 }, L: { stock: 12 } },
      },
    },
  },
];

const sku = (handle: string, color: string, size: string) =>
  `${handle}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");

export default async function seedRichCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);

  // --- store currency: add BDT ---
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.currency_code", "supported_currencies.is_default"],
  });
  const store = stores[0];
  const currencyCodes = new Set((store.supported_currencies ?? []).map((c: { currency_code: string }) => c.currency_code));
  if (!currencyCodes.has("bdt")) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            { currency_code: "eur", is_default: true },
            { currency_code: "usd", is_default: false },
            { currency_code: "bdt", is_default: false },
          ],
        },
      },
    });
    logger.info("Added BDT currency to store.");
  }

  // --- Bangladesh region ---
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
    logger.info("Created Bangladesh (BDT) region.");
  }

  // --- ensure 'bd' is in a service zone + a BDT shipping option exists ---
  const { data: zones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "geo_zones.country_code", "geo_zones.type"],
  });
  const zone = zones[0];
  if (zone) {
    const hasBd = (zone.geo_zones ?? []).some((g: { country_code: string }) => g.country_code === "bd");
    if (!hasBd) {
      await fulfillmentModule.updateServiceZones(zone.id, {
        geo_zones: [
          ...(zone.geo_zones ?? []).map((g: { country_code: string }) => ({ country_code: g.country_code, type: "country" as const })),
          { country_code: "bd", type: "country" as const },
        ],
      });
      logger.info("Added 'bd' to service zone.");
    }
    const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
    const { data: existingOptions } = await query.graph({ entity: "shipping_option", fields: ["id", "name"] });
    if (!existingOptions.some((o: { name: string }) => o.name === "Standard Delivery (BD)")) {
      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "Standard Delivery (BD)",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: zone.id,
            shipping_profile_id: shippingProfiles[0].id,
            type: { label: "Standard", description: "Delivered in 3-5 days.", code: "standard-bd" },
            prices: [{ region_id: bdRegion.id, amount: 60 }, { currency_code: "bdt", amount: 60 }],
            rules: [
              { attribute: "enabled_in_store", value: "true", operator: "eq" },
              { attribute: "is_return", value: "false", operator: "eq" },
            ],
          },
        ],
      });
      logger.info("Created BDT shipping option.");
    }
  }

  // --- sales channel ---
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"] });
  const salesChannelId = channels[0].id;
  const { data: shippingProfiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
  const shippingProfileId = shippingProfiles[0].id;

  // --- delete existing demo products with our handles (idempotent) ---
  const handles = PRODUCTS.map((p) => p.handle);
  const { data: existing } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: handles },
  });
  if (existing.length) {
    await productModule.deleteProducts(existing.map((p: { id: string }) => p.id));
    logger.info(`Removed ${existing.length} existing demo products.`);
  }

  // --- build + create products ---
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
        colorNames.map((c) => [
          c,
          Object.fromEntries(Object.entries(p.colors[c]!.sizes).map(([s, v]) => [s, v.stock])),
        ]),
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
  logger.info(`Created ${productsInput.length} rich demo products.`);

  // --- inventory levels for new items (large stock; low-stock display is metadata-driven) ---
  const { data: stockLocations } = await query.graph({ entity: "stock_location", fields: ["id"] });
  const locationId = stockLocations[0].id;
  const { data: items } = await query.graph({
    entity: "inventory_item",
    fields: ["id", "location_levels.location_id"],
  });
  const needLevels = items.filter(
    (it: { location_levels?: { location_id: string }[] }) =>
      !(it.location_levels ?? []).some((l) => l.location_id === locationId),
  );
  if (needLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: needLevels.map((it: { id: string }) => ({
          location_id: locationId,
          inventory_item_id: it.id,
          stocked_quantity: 500,
        })),
      },
    });
    logger.info(`Created ${needLevels.length} inventory levels.`);
  }

  logger.info("Rich catalog seed complete.");
}
