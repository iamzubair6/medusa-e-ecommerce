/**
 * Seeds an initial home PageLayout, main nav, and a promo popup so the
 * storefront renders meaningful content before the admin UI exists.
 *
 * Section configs are validated against the Zod schemas before insert, so the
 * seed doubles as a contract check.
 */
import { prisma } from "../src/client";
import {
  parseSectionConfig,
  megaMenuSchema,
  popupConfigSchema,
} from "../src/schemas/index";

const img = (id: string, w = 1200, h = 1500) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

async function main() {
  // --- Home page ---
  await prisma.pageLayout.deleteMany({ where: { slug: "home" } });

  const sections = [
    {
      type: "MARQUEE" as const,
      config: {
        items: ["FREE SHIPPING OVER $75", "NEW DROP EVERY FRIDAY", "30-DAY RETURNS"],
        speedSeconds: 30,
      },
    },
    {
      type: "HERO" as const,
      config: {
        mode: "carousel",
        eyebrow: "Summer 2026",
        headline: "Own the Season",
        subheadline: "Bold silhouettes, premium fabrics, made to move.",
        cta: { label: "Shop New In", href: "/collections/new", variant: "solid" },
        secondaryCta: { label: "Explore Sale", href: "/collections/sale", variant: "outline" },
        theme: "dark",
        align: "right",
        autoplayMs: 6000,
        slides: [
          { media: { url: img("1490481651871-ab68de25d43d"), alt: "Editorial look one" } },
          { media: { url: img("1483985988355-763728e1935b"), alt: "Editorial look two" } },
          { media: { url: img("1485462537746-965f33f7f6a7"), alt: "Editorial look three" } },
        ],
      },
    },
    {
      type: "PRODUCT_ROW" as const,
      config: {
        heading: "New Arrivals",
        subheading: "Fresh off the runway",
        source: { kind: "newest" },
        limit: 8,
        layout: "carousel",
        cta: { label: "View all", href: "/collections/new", variant: "ghost" },
      },
    },
    {
      type: "CATEGORY_GRID" as const,
      config: {
        heading: "Shop by Category",
        columns: 3,
        tiles: [
          { media: { url: img("1551232864-3f0890e580d9") }, label: "Dresses", href: "/c/dresses" },
          { media: { url: img("1483118714900-540cf339fd46") }, label: "Tops", href: "/c/tops" },
          { media: { url: img("1542272604-787c3835535d") }, label: "Denim", href: "/c/denim" },
        ],
      },
    },
    {
      type: "EDITORIAL" as const,
      config: {
        media: { url: img("1469334031218-e382a71b716b", 1400, 1000) },
        eyebrow: "The Edit",
        heading: "Crafted for the bold",
        body: "Limited runs, considered details, and a fit that lasts. Discover the pieces defining the season.",
        cta: { label: "Explore the edit", href: "/collections/edit", variant: "outline" },
        imageSide: "right",
      },
    },
    {
      type: "PRODUCT_ROW" as const,
      config: {
        heading: "Best Sellers",
        source: { kind: "bestsellers" },
        limit: 8,
        layout: "grid",
      },
    },
    {
      type: "BANNER" as const,
      config: {
        heading: "Members get early access to every drop.",
        cta: { label: "Join the list", href: "/account", variant: "solid" },
        theme: "gold",
      },
    },
  ];

  // validate every section config before insert
  sections.forEach((s) => parseSectionConfig(s.type, s.config));

  await prisma.pageLayout.create({
    data: {
      slug: "home",
      title: "Home",
      status: "PUBLISHED",
      publishedAt: new Date(),
      sections: {
        create: sections.map((s, i) => ({ type: s.type, position: i, config: s.config })),
      },
    },
  });

  // --- Main navigation with one mega-menu ---
  await prisma.navMenu.deleteMany({ where: { key: "main" } });
  const womenMega = megaMenuSchema.parse({
    columns: [
      {
        heading: "Clothing",
        links: [
          { label: "Dresses", href: "/c/dresses" },
          { label: "Tops", href: "/c/tops" },
          { label: "Denim", href: "/c/denim" },
        ],
      },
      {
        heading: "Collections",
        links: [
          { label: "New In", href: "/collections/new" },
          { label: "Best Sellers", href: "/collections/best" },
        ],
      },
    ],
    featured: { media: { url: img("1525507119028-ed4c629a60a3") }, label: "Summer Edit", href: "/collections/edit" },
  });

  await prisma.navMenu.create({
    data: {
      key: "main",
      items: {
        create: [
          { label: "New", href: "/collections/new", position: 0 },
          { label: "Women", href: "/c/women", position: 1, megaMenu: womenMega },
          { label: "Men", href: "/c/men", position: 2 },
          { label: "Sale", href: "/collections/sale", position: 3 },
        ],
      },
    },
  });

  // --- Promo popup ---
  await prisma.popup.deleteMany({});
  await prisma.popup.create({
    data: {
      name: "Welcome 10% off",
      active: true,
      trigger: "TIMER",
      config: popupConfigSchema.parse({
        heading: "Get 10% off your first order",
        body: "Join the list for early drops and members-only deals.",
        captureEmail: true,
        cta: { label: "Unlock 10% off", href: "#", variant: "solid" },
        delayMs: 5000,
        frequencyDays: 7,
      }),
    },
  });

  // eslint-disable-next-line no-console
  console.log("CMS seed complete: home page, main nav, popup.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
