/**
 * Idempotently (re)builds rich PUBLISHED per-division landing PageLayouts
 * (women / plus / men / sport / kids / beauty) rendered by /pages/[division].
 * NOTE: the route aliases /pages/curve -> division handle "plus", so the
 * Plus+Curve layout is seeded under slug `plus`. Section configs are validated
 * against their Zod schemas before insert, so this doubles as a contract check.
 *
 * SCOPE: only these 6 division PageLayouts + their sections are touched. The
 * home layout, nav menus, popups, and site settings are intentionally left
 * untouched.
 *
 * Run with: tsx prisma/seed-divisions.ts  (CMS_DATABASE_URL must point at the DB).
 */
import { prisma } from "../src/client";
import { parseSectionConfig } from "../src/schemas/index";

const img = (id: string, w = 1200, h = 1500) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const divisions = [
  {
    slug: "women",
    title: "Women",
    sections: [
      {
        type: "HERO" as const,
        config: {
          mode: "carousel",
          eyebrow: "Women · Summer 2026",
          headline: "Dressed to Turn Heads",
          subheadline: "Slip dresses, sculpting bodysuits and heels that mean business.",
          cta: { label: "Shop New In", href: "/collections/new", variant: "solid" },
          secondaryCta: { label: "Shop All Women", href: "/c/women", variant: "outline" },
          theme: "dark",
          align: "left",
          autoplayMs: 6000,
          slides: [
            { media: { url: img("1595777457583-95e059d581b8", 1600, 1000), alt: "Floaty midi dress look" } },
            { media: { url: img("1572804013309-59a88b7e92f1", 1600, 1000), alt: "Evening slip dress look" } },
            { media: { url: img("1539008835657-9e8e9680c956", 1600, 1000), alt: "Statement dress editorial" } },
          ],
        },
      },
      {
        type: "TREND_RAIL" as const,
        config: {
          heading: "Trending in Women",
          cards: [
            { media: { url: img("1595777457583-95e059d581b8") }, label: "Dresses", href: "/c/dresses" },
            { media: { url: img("1521572163474-6864f9cf17ab") }, label: "Tops", href: "/c/tops" },
            { media: { url: img("1542272604-787c3835535d") }, label: "Jeans", href: "/c/jeans" },
            { media: { url: img("1570976447640-ac859083963f") }, label: "Swim", href: "/c/swim" },
            { media: { url: img("1543163521-1bf539c55dd2") }, label: "Shoes", href: "/c/shoes" },
            { media: { url: img("1584917865442-de89df76afd3") }, label: "Accessories", href: "/c/accessories" },
          ],
        },
      },
      {
        type: "PRODUCT_ROW" as const,
        config: {
          heading: "New In Women",
          subheading: "This week's freshest drops",
          source: { kind: "newest", division: "women" },
          limit: 8,
          layout: "carousel",
          cta: { label: "View all new", href: "/collections/new", variant: "ghost" },
        },
      },
      {
        type: "PROMO_SPLIT" as const,
        config: {
          heading: "Two ways to wear the season",
          columns: 2,
          cards: [
            {
              media: { url: img("1502716119720-b23a93e5fe1b"), alt: "The dress shop" },
              eyebrow: "The Edit",
              heading: "The Dress Shop",
              subheading: "Midi, maxi and slip silhouettes.",
              cta: { label: "Shop Dresses", href: "/c/dresses", variant: "solid" },
            },
            {
              media: { url: img("1475178626620-a4d074967452"), alt: "Denim refresh" },
              eyebrow: "Wardrobe Core",
              heading: "Denim Refresh",
              subheading: "High-rise fits that sculpt.",
              cta: { label: "Shop Jeans", href: "/c/jeans", variant: "outline" },
            },
          ],
        },
      },
      {
        type: "COUNTDOWN" as const,
        config: {
          heading: "Women's flash sale",
          subheading: "Up to 50% off dresses, tops and heels — while stocks last.",
          endsAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
          cta: { label: "Shop the sale", href: "/collections/sale", variant: "solid" },
          theme: "claret",
        },
      },
      {
        type: "BANNER" as const,
        config: {
          heading: "Maison Luxe: the elevated occasion edit.",
          cta: { label: "Explore Luxe", href: "/collections/luxe", variant: "solid" },
          theme: "gold",
        },
      },
    ],
  },
  {
    // The /pages/curve route aliases to division handle "plus" — seed under `plus`.
    slug: "plus",
    title: "Plus + Curve",
    sections: [
      {
        type: "HERO" as const,
        config: {
          mode: "carousel",
          eyebrow: "Plus + Curve",
          headline: "Every Curve, Celebrated",
          subheadline: "Designed and graded for you — never sized up as an afterthought.",
          cta: { label: "Shop Curve", href: "/c/plus", variant: "solid" },
          secondaryCta: { label: "New Arrivals", href: "/collections/new", variant: "outline" },
          theme: "dark",
          align: "left",
          autoplayMs: 6000,
          slides: [
            { media: { url: img("1566174053879-31528523f8ae", 1600, 1000), alt: "Curve bodycon look" } },
            { media: { url: img("1583496661160-fb5886a0aaaa", 1600, 1000), alt: "Curve occasion dress" } },
          ],
        },
      },
      {
        type: "VALUE_PROPS" as const,
        config: {
          items: [
            { icon: "tag", label: "Sizes 12–24", sublabel: "Fit-tested on real bodies" },
            { icon: "sparkles", label: "Power stretch", sublabel: "Double-lined, no compromise" },
            { icon: "refresh", label: "30-day returns", sublabel: "Hassle-free exchanges" },
            { icon: "truck", label: "Free shipping", sublabel: "On orders over ৳2,000" },
          ],
        },
      },
      {
        type: "TREND_RAIL" as const,
        config: {
          heading: "Curve edits to know",
          cards: [
            { media: { url: img("1566174053879-31528523f8ae") }, label: "Bodycon", href: "/c/dresses" },
            { media: { url: img("1604176354204-9268737828e4") }, label: "High-Rise Denim", href: "/c/jeans" },
            { media: { url: img("1583496661160-fb5886a0aaaa") }, label: "Wrap Maxis", href: "/c/dresses" },
            { media: { url: img("1571513722275-4b41940f54b8") }, label: "Bodysuits", href: "/c/bodysuits" },
          ],
        },
      },
      {
        type: "PRODUCT_ROW" as const,
        config: {
          heading: "New In Curve",
          subheading: "Fresh fits, graded for curves",
          source: { kind: "newest", division: "plus" },
          limit: 8,
          layout: "carousel",
          cta: { label: "View all", href: "/c/plus", variant: "ghost" },
        },
      },
      {
        type: "PROMO_SPLIT" as const,
        config: {
          heading: "Built around you",
          columns: 2,
          cards: [
            {
              media: { url: img("1539008835657-9e8e9680c956"), alt: "Curve occasionwear" },
              eyebrow: "Occasion",
              heading: "Night-Out Dresses",
              subheading: "Ruched waists, true-wrap fits.",
              cta: { label: "Shop Dresses", href: "/c/dresses", variant: "solid" },
            },
            {
              media: { url: img("1582552938357-32b906df40cb"), alt: "Curve denim" },
              eyebrow: "No-Gap Guarantee",
              heading: "Curve Denim",
              subheading: "Contoured waistbands that stay put.",
              cta: { label: "Shop Denim", href: "/c/jeans", variant: "outline" },
            },
          ],
        },
      },
      {
        type: "BANNER" as const,
        config: {
          heading: "Same styles, every size — no exceptions.",
          cta: { label: "Shop Plus + Curve", href: "/c/plus", variant: "solid" },
          theme: "dark",
        },
      },
    ],
  },
  {
    slug: "men",
    title: "Men",
    sections: [
      {
        type: "MARQUEE" as const,
        config: {
          items: ["NEW MENSWEAR DROP", "FREE SHIPPING OVER ৳2,000", "PREMIUM DENIM RESTOCKED", "30-DAY RETURNS"],
          speedSeconds: 28,
        },
      },
      {
        type: "HERO" as const,
        config: {
          mode: "carousel",
          eyebrow: "Men · The New Standard",
          headline: "Sharper. Cleaner. Yours.",
          subheadline: "Tailored fits, heavyweight tees and premium denim built to last.",
          cta: { label: "Shop Men", href: "/c/men", variant: "solid" },
          secondaryCta: { label: "Trending Now", href: "/collections/trending", variant: "outline" },
          theme: "dark",
          align: "right",
          autoplayMs: 6000,
          slides: [
            { media: { url: img("1516257984-b1b4d707412e", 1600, 1000), alt: "Menswear editorial" } },
            { media: { url: img("1551028719-00167b16eac5", 1600, 1000), alt: "Leather jacket look" } },
            { media: { url: img("1520975954732-35dd22299614", 1600, 1000), alt: "Layered menswear look" } },
          ],
        },
      },
      {
        type: "CATEGORY_GRID" as const,
        config: {
          heading: "Shop Men by Category",
          columns: 3,
          tiles: [
            { media: { url: img("1591047139829-d91aecb6caea") }, label: "Outerwear", href: "/c/outerwear" },
            { media: { url: img("1542272604-787c3835535d") }, label: "Denim", href: "/c/jeans" },
            { media: { url: img("1583743814966-8936f5b7be1a") }, label: "Tops & Tees", href: "/c/tops" },
            { media: { url: img("1594633312681-425c7b97ccd1") }, label: "Trousers", href: "/c/bottoms" },
            { media: { url: img("1549298916-b41d501d3772") }, label: "Sneakers", href: "/c/shoes" },
            { media: { url: img("1591561954557-26941169b49e") }, label: "Accessories", href: "/c/accessories" },
          ],
        },
      },
      {
        type: "PRODUCT_ROW" as const,
        config: {
          heading: "Trending in Menswear",
          subheading: "What everyone's wearing right now",
          source: { kind: "newest", division: "men" },
          limit: 8,
          layout: "carousel",
          cta: { label: "View all trending", href: "/collections/trending", variant: "ghost" },
        },
      },
      {
        type: "PROMO_SPLIT" as const,
        config: {
          heading: "Pick your lane",
          columns: 2,
          cards: [
            {
              media: { url: img("1544022613-e87ca75a784a"), alt: "Tailored menswear" },
              eyebrow: "Office-Ready",
              heading: "The Tailored Edit",
              subheading: "Oxford shirts and sharp chinos.",
              cta: { label: "Shop Tailored", href: "/c/tops", variant: "solid" },
            },
            {
              media: { url: img("1495105787522-5334e3ffa0ef"), alt: "Street menswear" },
              eyebrow: "Off-Duty",
              heading: "The Street Edit",
              subheading: "Bombers, denim and court sneakers.",
              cta: { label: "Shop Street", href: "/c/outerwear", variant: "outline" },
            },
          ],
        },
      },
      {
        type: "BANNER" as const,
        config: {
          heading: "Final markdowns on menswear staples.",
          cta: { label: "Shop the Sale", href: "/collections/sale", variant: "solid" },
          theme: "dark",
        },
      },
    ],
  },
  {
    slug: "sport",
    title: "Sport",
    sections: [
      {
        type: "MARQUEE" as const,
        config: {
          items: ["SQUAT-PROOF. SWEAT-TESTED.", "NEW PERFORMANCE DROP", "FREE SHIPPING OVER ৳2,000", "TRAIN NOW, PAY LESS"],
          speedSeconds: 26,
        },
      },
      {
        type: "HERO" as const,
        config: {
          mode: "carousel",
          eyebrow: "Sport · Performance Line",
          headline: "Built for the Work",
          subheadline: "Compression that sculpts, seams that disappear, fabric that keeps up.",
          cta: { label: "Shop Activewear", href: "/c/activewear", variant: "solid" },
          secondaryCta: { label: "Shop All Sport", href: "/c/sport", variant: "outline" },
          theme: "dark",
          align: "left",
          autoplayMs: 5000,
          slides: [
            { media: { url: img("1518611012118-696072aa579a", 1600, 1000), alt: "Training session" } },
            { media: { url: img("1571019613454-1cb2f99b2d8b", 1600, 1000), alt: "Studio workout look" } },
            { media: { url: img("1517836357463-d25dfeac3438", 1600, 1000), alt: "Outdoor run look" } },
          ],
        },
      },
      {
        type: "PRODUCT_ROW" as const,
        config: {
          heading: "Trending in Sport",
          subheading: "Leggings, bras and layers on repeat",
          source: { kind: "newest", division: "sport" },
          limit: 8,
          layout: "carousel",
          cta: { label: "View all", href: "/c/sport", variant: "ghost" },
        },
      },
      {
        type: "PROMO_SPLIT" as const,
        config: {
          heading: "Train hard, recover soft",
          columns: 2,
          cards: [
            {
              media: { url: img("1538805060514-97d9cc17730c"), alt: "High-intensity training" },
              eyebrow: "High Intensity",
              heading: "The Sculpt Set",
              subheading: "Squat-proof leggings + seamless bras.",
              cta: { label: "Shop Training", href: "/c/activewear", variant: "solid" },
            },
            {
              media: { url: img("1483721310020-03333e577078"), alt: "Rest day layers" },
              eyebrow: "Rest Day",
              heading: "Off-Duty Layers",
              subheading: "Soft hoodies and lounge sets.",
              cta: { label: "Shop Lounge", href: "/c/sport", variant: "outline" },
            },
          ],
        },
      },
      {
        type: "COUNTDOWN" as const,
        config: {
          heading: "Performance drop ends soon",
          subheading: "Launch pricing on the new Sculpt line — 24 hours only.",
          endsAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          cta: { label: "Shop the drop", href: "/collections/new", variant: "solid" },
          theme: "dark",
        },
      },
      {
        type: "BANNER" as const,
        config: {
          heading: "Move-tested by athletes. Loved by everyone.",
          cta: { label: "Shop Sport", href: "/c/sport", variant: "solid" },
          theme: "dark",
        },
      },
    ],
  },
  {
    slug: "kids",
    title: "Kids",
    sections: [
      {
        type: "HERO" as const,
        config: {
          mode: "carousel",
          eyebrow: "Kids · Play-Ready",
          headline: "Made for Big Adventures",
          subheadline: "Soft, sturdy everyday pieces that survive the playground (and the wash).",
          cta: { label: "Shop Kids", href: "/c/kids", variant: "solid" },
          theme: "light",
          align: "center",
          autoplayMs: 7000,
          slides: [
            { media: { url: img("1519238263530-99bdd11df2ea", 1600, 1000), alt: "Kids playing outdoors" } },
            { media: { url: img("1503454537195-1dcabb73ffb9", 1600, 1000), alt: "Happy kids in colourful outfits" } },
          ],
        },
      },
      {
        type: "CATEGORY_GRID" as const,
        config: {
          heading: "Little wardrobes, sorted",
          columns: 3,
          tiles: [
            { media: { url: img("1622290291468-a28f7a7dc6a8") }, label: "Everyday Play", href: "/c/kids" },
            { media: { url: img("1518831959646-742c3a14ebf7") }, label: "New Season", href: "/collections/new" },
            { media: { url: img("1471286174890-9c112ffca5b4") }, label: "Mini Trainers", href: "/c/shoes" },
          ],
        },
      },
      {
        type: "PRODUCT_ROW" as const,
        config: {
          heading: "Just landed for kids",
          subheading: "Comfy new pieces they'll actually want to wear",
          source: { kind: "newest", division: "kids" },
          limit: 8,
          layout: "carousel",
          cta: { label: "See everything", href: "/c/kids", variant: "ghost" },
        },
      },
      {
        type: "VALUE_PROPS" as const,
        config: {
          items: [
            { icon: "sparkles", label: "Soft on skin", sublabel: "Gentle, breathable cotton" },
            { icon: "shield", label: "Built to play", sublabel: "Reinforced knees & seams" },
            { icon: "refresh", label: "Easy exchanges", sublabel: "Growth spurts happen" },
            { icon: "gift", label: "Gift-ready", sublabel: "Free wrapping on request" },
          ],
        },
      },
      {
        type: "BANNER" as const,
        config: {
          heading: "Matching mini-me sets for the whole crew.",
          cta: { label: "Shop Kids", href: "/c/kids", variant: "solid" },
          theme: "light",
        },
      },
    ],
  },
  {
    slug: "beauty",
    title: "Beauty",
    sections: [
      {
        type: "HERO" as const,
        config: {
          mode: "carousel",
          eyebrow: "Beauty · The Glow Edit",
          headline: "Your Best Skin, Bottled",
          subheadline: "Skincare, lips and glow essentials curated to work as hard as you do.",
          cta: { label: "Shop Beauty", href: "/c/beauty", variant: "solid" },
          secondaryCta: { label: "Luxe Beauty", href: "/collections/luxe", variant: "outline" },
          theme: "light",
          align: "center",
          autoplayMs: 6000,
          slides: [
            { media: { url: img("1596462502278-27bfdc403348", 1600, 1000), alt: "Skincare flat lay" } },
            { media: { url: img("1512496015851-a90fb38ba796", 1600, 1000), alt: "Lipstick collection" } },
            { media: { url: img("1522338242992-e1a54906a8da", 1600, 1000), alt: "Glowing skin close-up" } },
          ],
        },
      },
      {
        type: "VALUE_PROPS" as const,
        config: {
          items: [
            { icon: "sparkles", label: "Clean formulas", sublabel: "Dermatologist reviewed" },
            { icon: "gift", label: "Free samples", sublabel: "Two minis with every order" },
            { icon: "truck", label: "Fast delivery", sublabel: "Glow arrives in 2–4 days" },
            { icon: "refresh", label: "Easy returns", sublabel: "Unopened within 30 days" },
          ],
        },
      },
      {
        type: "PRODUCT_ROW" as const,
        config: {
          heading: "Beauty bestsellers",
          subheading: "The formulas everyone repurchases",
          source: { kind: "bestsellers", division: "beauty" },
          limit: 8,
          layout: "carousel",
          cta: { label: "Shop all beauty", href: "/c/beauty", variant: "ghost" },
        },
      },
      {
        type: "PROMO_SPLIT" as const,
        config: {
          heading: "Build your ritual",
          columns: 2,
          cards: [
            {
              media: { url: img("1596704017254-9b121068fb31"), alt: "Skincare routine" },
              eyebrow: "Step One",
              heading: "The Skin Prep",
              subheading: "Cleanse, treat, seal it in.",
              cta: { label: "Shop Skincare", href: "/c/beauty-products", variant: "solid" },
            },
            {
              media: { url: img("1571781926291-c477ebfd024b"), alt: "Makeup essentials" },
              eyebrow: "Step Two",
              heading: "The Finish",
              subheading: "Lips, glow and staying power.",
              cta: { label: "Shop Makeup", href: "/c/beauty-products", variant: "outline" },
            },
          ],
        },
      },
      {
        type: "EDITORIAL" as const,
        config: {
          media: { url: img("1487412947147-5cebf100ffc2", 1400, 1400), alt: "Minimal beauty editorial" },
          eyebrow: "The Philosophy",
          heading: "Less routine, more ritual",
          body: "We edit beauty the way we edit fashion — fewer, better formulas that earn their place on your shelf. Every product in the Glow Edit is tested by our team and reviewed by dermatologists before it makes the cut.",
          cta: { label: "Read the edit", href: "/collections/luxe", variant: "ghost" },
          imageSide: "right",
        },
      },
      {
        type: "BANNER" as const,
        config: {
          heading: "Members get first access to beauty launches.",
          cta: { label: "Join the list", href: "/account", variant: "solid" },
          theme: "gold",
        },
      },
    ],
  },
];

async function main() {
  // Validate every section config before any write.
  divisions.forEach((d) => d.sections.forEach((s) => parseSectionConfig(s.type, s.config)));

  // Rebuild ONLY the 6 division PageLayouts (+ their sections via cascade).
  // The home layout, nav, popups and site settings are intentionally left untouched.
  for (const d of divisions) {
    await prisma.pageLayout.deleteMany({ where: { slug: d.slug } });
    await prisma.pageLayout.create({
      data: {
        slug: d.slug,
        title: d.title,
        status: "PUBLISHED",
        publishedAt: new Date(),
        sections: {
          create: d.sections.map((s, i) => ({ type: s.type, position: i, config: s.config })),
        },
      },
    });
    // eslint-disable-next-line no-console
    console.log(`${d.slug} layout rebuilt with ${d.sections.length} sections: ${d.sections.map((s) => s.type).join(" → ")}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
