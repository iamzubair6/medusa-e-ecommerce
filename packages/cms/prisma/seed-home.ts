/**
 * Idempotently (re)builds a rich PUBLISHED `home` PageLayout that showcases a
 * Fashion-Nova-style mix of OLD + NEW section types. Section configs are
 * validated against their Zod schemas before insert, so this doubles as a
 * contract check.
 *
 * SCOPE: only the `home` PageLayout + its sections are touched. Nav menus,
 * popups, and site settings are intentionally left untouched.
 *
 * Run with: tsx prisma/seed-home.ts  (CMS_DATABASE_URL must point at the DB).
 */
import { prisma } from "../src/client";
import { parseSectionConfig } from "../src/schemas/index";

const img = (id: string, w = 1200, h = 1500) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

async function main() {
  const sections = [
    {
      type: "MARQUEE" as const,
      config: {
        items: ["FREE SHIPPING OVER ৳2,000", "NEW DROP EVERY FRIDAY", "30-DAY RETURNS", "MEMBERS GET EARLY ACCESS"],
        speedSeconds: 28,
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
          { media: { url: img("1490481651871-ab68de25d43d", 1600, 1000), alt: "Editorial look one" } },
          { media: { url: img("1483985988355-763728e1935b", 1600, 1000), alt: "Editorial look two" } },
          { media: { url: img("1485462537746-965f33f7f6a7", 1600, 1000), alt: "Editorial look three" } },
        ],
      },
    },
    {
      type: "VALUE_PROPS" as const,
      config: {
        items: [
          { icon: "truck", label: "Free shipping", sublabel: "On orders over ৳2,000" },
          { icon: "refresh", label: "30-day returns", sublabel: "Hassle-free exchanges" },
          { icon: "shield", label: "Secure checkout", sublabel: "Encrypted payments" },
          { icon: "headset", label: "24/7 support", sublabel: "We're always here" },
        ],
      },
    },
    {
      type: "PROMO_SPLIT" as const,
      config: {
        heading: "Shop the split",
        columns: 2,
        cards: [
          {
            media: { url: img("1539109136881-3be0616acf4b"), alt: "Women's edit" },
            eyebrow: "New In",
            heading: "Women",
            subheading: "Statement dresses & elevated basics.",
            cta: { label: "Shop Women", href: "/c/women", variant: "solid" },
          },
          {
            media: { url: img("1516257984-b1b4d707412e"), alt: "Men's edit" },
            eyebrow: "New In",
            heading: "Men",
            subheading: "Tailored fits, premium denim.",
            cta: { label: "Shop Men", href: "/c/men", variant: "outline" },
          },
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
      type: "TREND_RAIL" as const,
      config: {
        heading: "Trending now",
        cards: [
          { media: { url: img("1551232864-3f0890e580d9") }, label: "Dresses", href: "/c/dresses" },
          { media: { url: img("1483118714900-540cf339fd46") }, label: "Tops", href: "/c/tops" },
          { media: { url: img("1542272604-787c3835535d") }, label: "Denim", href: "/c/denim" },
          { media: { url: img("1485462537746-965f33f7f6a7") }, label: "Outerwear", href: "/c/outerwear" },
          { media: { url: img("1469334031218-e382a71b716b") }, label: "Knits", href: "/c/knits" },
          { media: { url: img("1490481651871-ab68de25d43d") }, label: "Editorial", href: "/collections/edit" },
        ],
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
      type: "COUNTDOWN" as const,
      config: {
        heading: "Flash sale ends soon",
        subheading: "Up to 50% off selected styles — while stocks last.",
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 36).toISOString(),
        cta: { label: "Shop the sale", href: "/collections/sale", variant: "solid" },
        theme: "claret",
      },
    },
    {
      type: "BRAND_CAROUSEL" as const,
      config: {
        slides: [
          { media: { url: img("1441984904996-e0b6ba687e04", 1600, 900) }, eyebrow: "Collab", title: "Maison × Active", href: "/collections/sale", cta: "Shop Now" },
          { media: { url: img("1490481651871-ab68de25d43d", 1600, 900) }, eyebrow: "Limited", title: "The Summer Capsule", href: "/collections/edit", cta: "Explore" },
        ],
        intervalMs: 5000,
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

  // Validate every section config before any write.
  sections.forEach((s) => parseSectionConfig(s.type, s.config));

  // Rebuild ONLY the home PageLayout (+ its sections via cascade). Nav, popups
  // and site settings are intentionally left untouched.
  await prisma.pageLayout.deleteMany({ where: { slug: "home" } });
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

  // eslint-disable-next-line no-console
  console.log(`Home layout rebuilt with ${sections.length} sections: ${sections.map((s) => s.type).join(" → ")}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
