import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import type { ExecArgs } from "@medusajs/framework/types";
import {
  createProductsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createCollectionsWorkflow,
  batchLinkProductsToCategoryWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Full Fashion-Nova-style catalog. WIPES all existing products, categories, and
 * collections, then builds:
 *   - 6 division categories (Women, Plus+Curve, Men, Sport, Kids, Beauty)
 *   - shared content categories (Dresses, Tops, Jeans, ...)
 *   - collections (New In, Sale, Trending, Luxe)
 *   - rich products with division + occasion/style/trend/color/material metadata,
 *     color x size variants, BDT/USD/EUR prices, images, and inventory.
 *
 * Run: npx medusa exec ./src/scripts/seed-fashion-catalog.ts
 */

const img = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=900&h=1125&q=80`;

// Reliable Unsplash photo ids (validated). Reused across products for stable images.
const POOL = [
  "1490481651871-ab68de25d43d", "1485462537746-965f33f7f6a7", "1483985988355-763728e1935b",
  "1525507119028-ed4c629a60a3", "1551232864-3f0890e580d9", "1542272604-787c3835535d",
  "1469334031218-e382a71b716b", "1483118714900-540cf339fd46",
];
const pair = (i: number): string[] => [img(POOL[i % POOL.length]!), img(POOL[(i + 3) % POOL.length]!)];

const SWATCH: Record<string, string> = {
  Black: "#1b1b1b", White: "#f2efe9", Sand: "#d8c4a0", Olive: "#5b6b3a", Sage: "#9aa789",
  Champagne: "#e7d2b0", Blue: "#3b5b87", Navy: "#26324a", Khaki: "#c2b280", Grey: "#8a8a8a",
  Pink: "#e8b4c0", Red: "#b23b3b", Rose: "#c98b9b", Stone: "#cfbfb0", "One Shade": "#e7d2b0",
};

// Division categories (top-level)
const DIVISIONS: { handle: string; name: string }[] = [
  { handle: "women", name: "Women" },
  { handle: "plus", name: "Plus+Curve" },
  { handle: "men", name: "Men" },
  { handle: "sport", name: "Sport" },
  { handle: "kids", name: "Kids" },
  { handle: "beauty", name: "Beauty" },
];

// Shared content categories (second level)
const CATEGORIES: { handle: string; name: string }[] = [
  { handle: "dresses", name: "Dresses" },
  { handle: "tops", name: "Tops" },
  { handle: "bodysuits", name: "Bodysuits" },
  { handle: "jeans", name: "Jeans" },
  { handle: "bottoms", name: "Bottoms" },
  { handle: "matching-sets", name: "Matching Sets" },
  { handle: "swim", name: "Swim" },
  { handle: "outerwear", name: "Outerwear" },
  { handle: "activewear", name: "Activewear" },
  { handle: "shoes", name: "Shoes" },
  { handle: "accessories", name: "Accessories" },
  { handle: "beauty-products", name: "Beauty" },
];

const COLLECTIONS: { handle: string; title: string }[] = [
  { handle: "new", title: "New In" },
  { handle: "sale", title: "Sale" },
  { handle: "trending", title: "Trending" },
  { handle: "luxe", title: "Maison Luxe" },
];

const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"];
const SHOE_SIZES = ["6", "7", "8", "9", "10"];
const ONE_SIZE = ["One Size"];

interface ProdDef {
  title: string;
  handle: string;
  division: string;
  categories: string[];
  collection?: string;
  price: number; // BDT
  original?: number; // BDT
  material: string;
  care: string;
  occasion: string[];
  style: string[];
  trend: string[];
  colors: string[];
  sizes?: string[];
  offer?: { type: "bogo" | "discount"; label: string; percent?: number };
  description: string;
}

const P: ProdDef[] = [
  // ---------------- WOMEN ----------------
  { title: "Sculpt Seamless Bodysuit", handle: "sculpt-bodysuit", division: "women", categories: ["bodysuits", "tops"], collection: "new", price: 200, original: 250, material: "92% Nylon, 8% Elastane", care: "Hand wash cold, lay flat to dry", occasion: ["Going Out", "Everyday"], style: ["Bodycon", "Sexy"], trend: ["Femme & Flirty"], colors: ["Black", "Sand", "Olive"], offer: { type: "bogo", label: "BUY 1 GET 1 FREE" }, description: "A second-skin seamless bodysuit with a sculpted, snatched silhouette. Buttery soft, fully opaque, built to layer or stand alone." },
  { title: "Satin Slip Dress", handle: "satin-slip-dress", division: "women", categories: ["dresses"], collection: "luxe", price: 320, material: "100% Satin Polyester", care: "Dry clean only", occasion: ["Cocktail", "Wedding Guest"], style: ["Maxi", "Sexy"], trend: ["Satin"], colors: ["Champagne", "Black"], description: "A bias-cut satin slip dress with adjustable straps and a fluid drape. Effortless from dinner to dancefloor." },
  { title: "Ribbed Knit Tank", handle: "ribbed-knit-tank", division: "women", categories: ["tops"], collection: "sale", price: 150, original: 200, material: "95% Cotton, 5% Elastane", care: "Machine wash cold", occasion: ["Everyday"], style: ["Bodycon"], trend: ["Summer"], colors: ["White", "Black", "Sage"], offer: { type: "discount", label: "25% OFF", percent: 25 }, description: "A fitted ribbed tank in a soft stretch knit. Everyday essential with a flattering scoop neck." },
  { title: "Wide-Leg Trouser", handle: "wide-leg-trouser", division: "women", categories: ["bottoms"], collection: "new", price: 360, material: "68% Viscose, 30% Polyester, 2% Elastane", care: "Machine wash cold, iron low", occasion: ["Office", "Going Out"], style: ["Maxi"], trend: ["Linen"], colors: ["Stone", "Black"], description: "High-rise wide-leg trousers with a sharp crease and fluid drape. Polished tailoring with all-day comfort." },
  { title: "Floral Midi Dress", handle: "floral-midi-dress", division: "women", categories: ["dresses"], collection: "trending", price: 290, material: "100% Viscose", care: "Machine wash cold, line dry", occasion: ["Birthday", "Going Out"], style: ["Midi", "Off Shoulder"], trend: ["Floral", "Vacation"], colors: ["Rose", "Sage"], description: "A floaty floral midi with smocked bodice and tiered skirt. Made for golden-hour moments." },
  { title: "Strappy Heeled Sandal", handle: "strappy-heeled-sandal", division: "women", categories: ["shoes"], collection: "luxe", price: 420, material: "Vegan leather upper, TPR sole", care: "Wipe clean", occasion: ["Cocktail", "Prom"], style: ["Sexy"], trend: ["Satin"], colors: ["Champagne", "Black"], sizes: SHOE_SIZES, description: "A barely-there strappy heel with an adjustable ankle strap and a flattering 90mm rise." },

  // ---------------- PLUS+CURVE ----------------
  { title: "Curve Bodycon Dress", handle: "curve-bodycon-dress", division: "plus", categories: ["dresses"], collection: "new", price: 300, material: "88% Polyester, 12% Elastane", care: "Machine wash cold", occasion: ["Going Out", "Birthday"], style: ["Bodycon", "Midi"], trend: ["Femme & Flirty"], colors: ["Black", "Red"], sizes: ["XL", "1X", "2X", "3X"], description: "A curve-celebrating bodycon with double-lined power stretch and a ruched waist that hugs every angle." },
  { title: "Curve High-Rise Jeans", handle: "curve-high-rise-jeans", division: "plus", categories: ["jeans", "bottoms"], collection: "trending", price: 340, material: "92% Cotton, 6% Polyester, 2% Elastane", care: "Machine wash cold inside out", occasion: ["Everyday"], style: ["Skinny"], trend: ["Denim"], colors: ["Blue", "Black"], sizes: ["14", "16", "18", "20", "22"], description: "High-rise curve jeans with a contoured waistband that stays put — no gaping, all sculpt." },
  { title: "Curve Ribbed Top", handle: "curve-ribbed-top", division: "plus", categories: ["tops"], collection: "sale", price: 170, original: 220, material: "95% Viscose, 5% Elastane", care: "Machine wash cold", occasion: ["Everyday"], style: ["Bodycon"], trend: ["Summer"], colors: ["White", "Sage", "Black"], sizes: ["XL", "1X", "2X", "3X"], offer: { type: "discount", label: "23% OFF", percent: 23 }, description: "A soft ribbed long-sleeve with a square neck designed and graded for curves." },
  { title: "Curve Wrap Maxi", handle: "curve-wrap-maxi", division: "plus", categories: ["dresses"], collection: "luxe", price: 380, material: "100% Viscose", care: "Hand wash cold", occasion: ["Wedding Guest", "Cocktail"], style: ["Maxi", "Off Shoulder"], trend: ["Floral"], colors: ["Rose", "Navy"], sizes: ["XL", "1X", "2X", "3X"], description: "A true-wrap maxi with a flattering V-neck and tie waist that adjusts to you." },

  // ---------------- MEN ----------------
  { title: "Oxford Cotton Shirt", handle: "oxford-cotton-shirt", division: "men", categories: ["tops"], collection: "new", price: 240, material: "100% Cotton Oxford", care: "Machine wash warm, iron medium", occasion: ["Office", "Going Out"], style: ["Classic"], trend: ["Linen"], colors: ["White", "Blue"], sizes: ["S", "M", "L", "XL"], description: "A crisp button-down in breathable Oxford cotton. Tailored fit, all-day comfort, dress it up or down." },
  { title: "Slim Fit Chinos", handle: "slim-fit-chinos", division: "men", categories: ["bottoms"], collection: "trending", price: 300, material: "98% Cotton, 2% Elastane", care: "Machine wash cold", occasion: ["Office", "Everyday"], style: ["Slim"], trend: ["Linen"], colors: ["Khaki", "Navy"], sizes: ["30", "32", "34", "36"], description: "Versatile stretch-cotton chinos with a clean slim taper. Office to weekend in one pair." },
  { title: "Essential Crew Tee", handle: "essential-crew-tee", division: "men", categories: ["tops"], collection: "sale", price: 140, original: 200, material: "100% Combed Cotton", care: "Machine wash cold", occasion: ["Everyday"], style: ["Classic"], trend: ["Summer"], colors: ["Black", "Grey", "White"], sizes: ["S", "M", "L", "XL"], offer: { type: "discount", label: "30% OFF", percent: 30 }, description: "A heavyweight crew-neck tee in soft combed cotton. The everyday staple, now on sale." },
  { title: "Bomber Jacket", handle: "bomber-jacket", division: "men", categories: ["outerwear"], collection: "sale", price: 480, original: 640, material: "Shell 100% Nylon, Lining 100% Polyester", care: "Wipe clean / spot clean", occasion: ["Going Out"], style: ["Classic"], trend: ["Denim"], colors: ["Black", "Olive"], sizes: ["M", "L", "XL"], offer: { type: "discount", label: "25% OFF", percent: 25 }, description: "A classic ribbed-collar bomber with a smooth shell and zip front. Lightweight layering, marked down." },
  { title: "Tapered Denim", handle: "tapered-denim", division: "men", categories: ["jeans", "bottoms"], collection: "new", price: 360, material: "99% Cotton, 1% Elastane", care: "Machine wash cold inside out", occasion: ["Everyday"], style: ["Slim"], trend: ["Denim"], colors: ["Blue", "Black"], sizes: ["30", "32", "34", "36"], description: "Tapered-leg denim with a touch of stretch and a mid-rise. Clean wash, everyday wear." },
  { title: "Leather Court Sneaker", handle: "leather-court-sneaker", division: "men", categories: ["shoes"], collection: "new", price: 460, material: "Leather upper, rubber cup sole", care: "Wipe clean", occasion: ["Everyday", "Going Out"], style: ["Classic"], trend: ["Summer"], colors: ["White", "Black"], sizes: SHOE_SIZES, description: "A minimal low-top court sneaker in full-grain leather with a cushioned footbed." },

  // ---------------- SPORT ----------------
  { title: "Sculpt Performance Leggings", handle: "sculpt-performance-leggings", division: "sport", categories: ["activewear", "bottoms"], collection: "trending", price: 260, material: "76% Nylon, 24% Spandex", care: "Machine wash cold, no fabric softener", occasion: ["Gym", "Everyday"], style: ["Bodycon"], trend: ["Summer"], colors: ["Black", "Olive", "Navy"], description: "High-waisted compression leggings with a squat-proof sculpt knit and hidden waistband pocket." },
  { title: "Seamless Sports Bra", handle: "seamless-sports-bra", division: "sport", categories: ["activewear", "tops"], collection: "new", price: 180, material: "80% Nylon, 20% Elastane", care: "Machine wash cold", occasion: ["Gym"], style: ["Bodycon"], trend: ["Summer"], colors: ["Black", "Sage", "Pink"], description: "Medium-support seamless bra with a ribbed band and removable cups for studio-to-street wear." },
  { title: "Training Shorts", handle: "training-shorts", division: "sport", categories: ["activewear", "bottoms"], collection: "sale", price: 150, original: 190, material: "88% Polyester, 12% Elastane", care: "Machine wash cold", occasion: ["Gym"], style: ["Classic"], trend: ["Summer"], colors: ["Black", "Grey"], offer: { type: "discount", label: "21% OFF", percent: 21 }, description: "Lightweight 5-inch training shorts with a liner and zip pocket. Sweat-wicking and quick-dry." },
  { title: "Compression Tee", handle: "compression-tee", division: "sport", categories: ["activewear", "tops"], collection: "trending", price: 170, material: "90% Polyester, 10% Elastane", care: "Machine wash cold", occasion: ["Gym"], style: ["Slim"], trend: ["Summer"], colors: ["Black", "Navy", "White"], sizes: ["S", "M", "L", "XL"], description: "A second-skin compression tee with mesh ventilation panels and flatlock seams." },

  // ---------------- KIDS ----------------
  { title: "Kids Graphic Tee", handle: "kids-graphic-tee", division: "kids", categories: ["tops"], collection: "new", price: 90, material: "100% Cotton", care: "Machine wash cold", occasion: ["Everyday"], style: ["Classic"], trend: ["Summer"], colors: ["White", "Blue", "Pink"], sizes: ["2T", "3T", "4T", "5T", "6"], description: "A soft cotton tee with a playful print. Tagless neck and durable double-stitched seams." },
  { title: "Kids Jogger", handle: "kids-jogger", division: "kids", categories: ["bottoms"], collection: "sale", price: 120, original: 160, material: "80% Cotton, 20% Polyester Fleece", care: "Machine wash cold", occasion: ["Everyday"], style: ["Classic"], trend: ["Summer"], colors: ["Grey", "Navy"], sizes: ["2T", "3T", "4T", "5T", "6"], offer: { type: "discount", label: "25% OFF", percent: 25 }, description: "Cozy fleece joggers with an elastic waist and ribbed cuffs. Built for playground adventures." },
  { title: "Kids Denim Jacket", handle: "kids-denim-jacket", division: "kids", categories: ["outerwear"], collection: "trending", price: 180, material: "100% Cotton Denim", care: "Machine wash cold inside out", occasion: ["Everyday"], style: ["Classic"], trend: ["Denim"], colors: ["Blue"], sizes: ["2T", "3T", "4T", "5T", "6"], description: "A classic trucker denim jacket sized for little ones, with snap buttons and chest pockets." },

  // ---------------- BEAUTY ----------------
  { title: "Glow Drops Serum", handle: "glow-drops-serum", division: "beauty", categories: ["beauty-products", "accessories"], collection: "new", price: 240, material: "Vitamin C 10%, Hyaluronic Acid", care: "Store away from direct sunlight", occasion: ["Everyday"], style: ["Classic"], trend: ["Summer"], colors: ["One Shade"], sizes: ONE_SIZE, description: "A lightweight illuminating serum with vitamin C and hyaluronic acid for a lit-from-within glow." },
  { title: "Matte Lip Kit", handle: "matte-lip-kit", division: "beauty", categories: ["beauty-products", "accessories"], collection: "trending", price: 160, material: "Liquid lipstick + lip liner set", care: "Replace 12 months after opening", occasion: ["Going Out"], style: ["Classic"], trend: ["Femme & Flirty"], colors: ["Rose", "Red", "Sand"], sizes: ONE_SIZE, description: "A long-wear matte liquid lip paired with a precision liner. Transfer-proof, all-day color." },
  { title: "Velvet Blush", handle: "velvet-blush", division: "beauty", categories: ["beauty-products", "accessories"], collection: "sale", price: 110, original: 140, material: "Talc-free pressed powder", care: "Replace 18 months after opening", occasion: ["Everyday"], style: ["Classic"], trend: ["Summer"], colors: ["Pink", "Rose"], sizes: ONE_SIZE, offer: { type: "discount", label: "21% OFF", percent: 21 }, description: "A silky talc-free blush that blends to a soft-focus, second-skin flush." },
];

const sku = (handle: string, color: string, size: string) =>
  `${handle}-${color}-${size}`.toUpperCase().replace(/[^A-Z0-9-]/g, "");
const usd = (bdt: number) => Math.max(1, Math.round(bdt / 120));
const eur = (bdt: number) => Math.max(1, Math.round(bdt / 130));
const stockFor = (i: number) => 5 + ((i * 7) % 26); // deterministic 5..30

export default async function seedFashionCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const inventoryModule = container.resolve(Modules.INVENTORY);

  // ---- 1. WIPE existing products, inventory, collections, categories ----
  const { data: oldProducts } = await query.graph({ entity: "product", fields: ["id"] });
  if (oldProducts.length) {
    await productModule.deleteProducts(oldProducts.map((p) => p.id));
    logger.info(`Deleted ${oldProducts.length} existing products.`);
  }
  // Inventory items aren't removed with products and their SKUs would collide.
  const { data: oldItems } = await query.graph({ entity: "inventory_item", fields: ["id"] });
  if (oldItems.length) {
    await inventoryModule.deleteInventoryItems(oldItems.map((i) => i.id));
    logger.info(`Deleted ${oldItems.length} existing inventory items.`);
  }
  const { data: oldCols } = await query.graph({ entity: "product_collection", fields: ["id"] });
  if (oldCols.length) {
    await productModule.deleteProductCollections(oldCols.map((c) => c.id));
    logger.info(`Deleted ${oldCols.length} existing collections.`);
  }
  const { data: oldCats } = await query.graph({ entity: "product_category", fields: ["id"] });
  if (oldCats.length) {
    await productModule.deleteProductCategories(oldCats.map((c) => c.id));
    logger.info(`Deleted ${oldCats.length} existing categories.`);
  }

  // ---- 2. Create categories (divisions + content) ----
  const { result: createdCats } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: [...DIVISIONS, ...CATEGORIES].map((c) => ({ name: c.name, handle: c.handle, is_active: true })),
    },
  });
  const catId = new Map<string, string>(createdCats.map((c) => [c.handle, c.id]));
  logger.info(`Created ${createdCats.length} categories.`);

  // ---- 3. Create collections ----
  const { result: createdCols } = await createCollectionsWorkflow(container).run({
    input: { collections: COLLECTIONS.map((c) => ({ title: c.title, handle: c.handle })) },
  });
  const colId = new Map<string, string>(createdCols.map((c) => [c.handle, c.id]));
  logger.info(`Created ${createdCols.length} collections.`);

  // ---- 4. Build + create products ----
  const { data: channels } = await query.graph({ entity: "sales_channel", fields: ["id"] });
  const salesChannelId = channels[0].id;
  const { data: profiles } = await query.graph({ entity: "shipping_profile", fields: ["id"] });
  const shippingProfileId = profiles[0].id;

  const productsInput = P.map((p, idx) => {
    const sizes = p.sizes ?? APPAREL_SIZES;
    const sizeStock: Record<string, Record<string, number>> = {};
    const variants = p.colors.flatMap((c, ci) =>
      sizes.map((s, si) => {
        sizeStock[c] ??= {};
        sizeStock[c]![s] = stockFor(idx + ci * 3 + si);
        return {
          title: `${s} / ${c}`,
          sku: sku(p.handle, c, s),
          options: { Size: s, Color: c },
          prices: [
            { amount: p.price, currency_code: "bdt" },
            { amount: usd(p.price), currency_code: "usd" },
            { amount: eur(p.price), currency_code: "eur" },
          ],
        };
      }),
    );
    const metadata = {
      division: p.division,
      occasion: p.occasion,
      style: p.style,
      trend: p.trend,
      material: p.material,
      care: p.care,
      swatches: Object.fromEntries(p.colors.map((c) => [c, SWATCH[c] ?? "#cccccc"])),
      colorImages: Object.fromEntries(p.colors.map((c, ci) => [c, pair(idx + ci)])),
      colorPrices: Object.fromEntries(p.colors.map((c) => [c, p.price])),
      colorOriginalPrices: p.original ? Object.fromEntries(p.colors.map((c) => [c, p.original])) : {},
      sizeStock,
      ...(p.offer ? { offer: p.offer } : {}),
    };
    return {
      title: p.title,
      handle: p.handle,
      description: p.description,
      status: ProductStatus.PUBLISHED,
      shipping_profile_id: shippingProfileId,
      weight: 350,
      images: p.colors.flatMap((c, ci) => pair(idx + ci)).map((url) => ({ url })),
      options: [
        { title: "Size", values: sizes },
        { title: "Color", values: p.colors },
      ],
      variants,
      sales_channels: [{ id: salesChannelId }],
      metadata,
    };
  });

  await createProductsWorkflow(container).run({ input: { products: productsInput } });
  logger.info(`Created ${productsInput.length} products.`);

  // ---- 5. Inventory levels ----
  const { data: stockLocations } = await query.graph({ entity: "stock_location", fields: ["id"] });
  const locationId = stockLocations[0].id;
  const { data: items } = await query.graph({ entity: "inventory_item", fields: ["id", "location_levels.location_id"] });
  const needLevels = items.filter((it) => !(it.location_levels ?? []).some((l) => l?.location_id === locationId));
  if (needLevels.length) {
    await createInventoryLevelsWorkflow(container).run({
      input: { inventory_levels: needLevels.map((it: { id: string }) => ({ location_id: locationId, inventory_item_id: it.id, stocked_quantity: 100 })) },
    });
    logger.info(`Created ${needLevels.length} inventory levels.`);
  }

  // ---- 6. Link products to categories + collections ----
  const { data: created } = await query.graph({ entity: "product", fields: ["id", "handle"] });
  const idByHandle = new Map<string, string>(created.map((p) => [p.handle, p.id]));

  // category -> [productIds]
  const catProducts = new Map<string, string[]>();
  for (const p of P) {
    const pid = idByHandle.get(p.handle);
    if (!pid) continue;
    for (const h of [p.division, ...p.categories]) {
      const arr = catProducts.get(h) ?? [];
      arr.push(pid);
      catProducts.set(h, arr);
    }
  }
  for (const [handle, pids] of catProducts) {
    const id = catId.get(handle);
    if (id && pids.length) await batchLinkProductsToCategoryWorkflow(container).run({ input: { id, add: pids } });
  }
  logger.info(`Linked products to ${catProducts.size} categories.`);

  // collection -> [productIds]
  const colProducts = new Map<string, string[]>();
  for (const p of P) {
    if (!p.collection) continue;
    const pid = idByHandle.get(p.handle);
    if (!pid) continue;
    const arr = colProducts.get(p.collection) ?? [];
    arr.push(pid);
    colProducts.set(p.collection, arr);
  }
  for (const [handle, pids] of colProducts) {
    const id = colId.get(handle);
    if (id && pids.length) await updateProductsWorkflow(container).run({ input: { selector: { id: pids }, update: { collection_id: id } } });
  }
  logger.info(`Assigned products to ${colProducts.size} collections.`);

  logger.info("Fashion catalog seed complete.");
}
