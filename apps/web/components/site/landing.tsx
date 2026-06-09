import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container, cn } from "@ecom/ui";
import type { CategoryTile, LandingData } from "@/lib/commerce";
import { type SiteSettings, DEFAULT_SITE_SETTINGS } from "@/lib/site-settings";
import { ShopTheLatest } from "./shop-the-latest";
import { BrandCarousel, type BrandSlide } from "./brand-carousel";
import { Marquee } from "./marquee";

const U = (id: string, w = 1600, h = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const USP_ITEMS = ["Free Shipping Over ৳2,000", "Cash on Delivery", "Easy 30-Day Returns", "New Drops Weekly", "Shop the App"];

const BRAND_SLIDES: BrandSlide[] = [
  { image: U("1483985988355-763728e1935b", 1800, 1000), eyebrow: "Collab", title: "Maison × Active", href: "/collections/sport?division=sport" },
  { image: U("1469334031218-e382a71b716b", 1800, 1000), eyebrow: "The Edit", title: "Vacation Mindset", href: "/collections/trending" },
  { image: U("1525507119028-ed4c629a60a3", 1800, 1000), eyebrow: "New", title: "Golden Hours", href: "/collections/luxe" },
];

const TREND_CARDS = [
  { label: "Second Skin", img: "1490481651871-ab68de25d43d", href: "/collections/bodysuits?division=women" },
  { label: "Vacation Strolls", img: "1469334031218-e382a71b716b", href: "/collections/women?division=women&trend=Vacation" },
  { label: "Hotter on Vacation", img: "1525507119028-ed4c629a60a3", href: "/collections/trending" },
  { label: "Swim Escape", img: "1542272604-787c3835535d", href: "/collections/swim?division=women" },
];

const BRANDS = [
  { label: "Maison Men", href: "/collections/men?division=men", img: "1485462537746-965f33f7f6a7" },
  { label: "Maison", href: "/collections/women?division=women", img: "1490481651871-ab68de25d43d" },
  { label: "Maison Curve", href: "/collections/plus?division=plus", img: "1525507119028-ed4c629a60a3" },
  { label: "Maison Kids", href: "/collections/kids?division=kids", img: "1483118714900-540cf339fd46" },
  { label: "Maison Sport", href: "/collections/sport?division=sport", img: "1542272604-787c3835535d" },
  { label: "Maison Luxe", href: "/collections/luxe", img: "1483985988355-763728e1935b" },
];

export function Landing({ data, site }: { data: LandingData; site?: SiteSettings }) {
  const marqueeItems = site?.marquee.items.length ? site.marquee.items : USP_ITEMS;
  const showMarquee = site ? site.marquee.enabled : true;
  const L = site?.landing ?? DEFAULT_SITE_SETTINGS.landing;
  return (
    <>
      {/* USP marquee (under the announcement bar) */}
      {showMarquee && <Marquee config={{ items: marqueeItems, speedSeconds: 30 }} />}

      {/* Hero offer */}
      <section className="relative h-[460px] w-full overflow-hidden md:h-[560px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={L.hero.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
        <Container className="relative flex h-full flex-col justify-center gap-3 text-white">
          {L.hero.eyebrow && <p className="text-sm font-bold uppercase tracking-[0.2em]">{L.hero.eyebrow}</p>}
          <h1 className="max-w-md font-display text-4xl font-black uppercase leading-none md:text-6xl">{L.hero.headline}</h1>
          {L.hero.subtext && <p className="max-w-sm text-lg font-medium">{L.hero.subtext}</p>}
          <div>
            <Link href={L.hero.ctaHref} className="mt-2 inline-block rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
              {L.hero.ctaLabel}
            </Link>
          </div>
        </Container>
      </section>

      {/* Brand collab / video carousel — same height as hero */}
      <BrandCarousel slides={BRAND_SLIDES} />

      {/* Trend report */}
      <Container className="py-8">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">The Trend Report</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {TREND_CARDS.map((c) => (
            <Link key={c.label} href={c.href} className="group relative block aspect-[3/4] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={U(c.img, 600, 800)} alt={c.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-sm bg-background/90 px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide">
                {c.label} <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </Container>

      {/* Big promo banner */}
      <section className="relative h-72 w-full overflow-hidden md:h-96">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={L.promo.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <Container className="relative flex h-full flex-col items-center justify-center gap-3 text-center text-white">
          <h2 className="font-display text-4xl font-black uppercase md:text-6xl">{L.promo.heading}</h2>
          <Link href={L.promo.ctaHref} className="rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
            {L.promo.ctaLabel}
          </Link>
        </Container>
      </section>

      {/* Shop by Brand */}
      <Container className="py-8">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">Shop by Brand</h2>
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {BRANDS.map((b) => (
            <Link key={b.label} href={b.href} className="group relative block aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={U(b.img, 400, 400)} alt={b.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-center text-xs font-black uppercase tracking-wide text-white">
                {b.label}
              </span>
            </Link>
          ))}
        </div>
      </Container>

      {/* Full-width feature */}
      <section className="relative h-80 w-full overflow-hidden md:h-[460px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={L.feature.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <Container className="relative flex h-full flex-col items-start justify-end gap-3 pb-10 text-white">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl">{L.feature.heading}</h2>
          <Link href={L.feature.ctaHref} className="rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
            {L.feature.ctaLabel}
          </Link>
        </Container>
      </section>

      {/* Shop by Category — bento */}
      <Container className="py-8">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">Shop by Category</h2>
        <Bento tiles={data.categoryTiles.slice(0, site?.categoryTileCount ?? 7)} />
      </Container>

      {/* Sale strip */}
      <section className="relative h-40 w-full overflow-hidden bg-accent">
        <Container className="relative flex h-full flex-col items-center justify-center gap-2 text-center text-accent-foreground">
          <h2 className="font-display text-3xl font-black uppercase md:text-4xl">{L.sale.heading}</h2>
          <Link href={L.sale.ctaHref} className="rounded-full bg-accent-foreground px-7 py-2.5 text-xs font-bold uppercase tracking-wide text-accent">
            {L.sale.ctaLabel}
          </Link>
        </Container>
      </section>

      {/* Shop the Latest */}
      <Container>
        <ShopTheLatest tabs={data.latest} />
      </Container>
    </>
  );
}

function Bento({ tiles }: { tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;
  const [feature, ...rest] = tiles;
  // positions 0 and 3 of `rest` are double-width
  const span = (i: number) => (i === 0 || i === 3 ? "sm:col-span-2 lg:col-span-4" : "lg:col-span-2");
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:h-[640px] lg:grid-cols-12 lg:grid-rows-2">
      {feature && <BentoTile tile={feature} className="col-span-2 h-64 sm:col-span-4 lg:col-span-4 lg:row-span-2 lg:h-full" big />}
      {rest.slice(0, 6).map((t, i) => (
        <BentoTile key={t.handle} tile={t} className={cn("h-56 lg:h-full", span(i))} />
      ))}
    </div>
  );
}

function BentoTile({ tile, className, big }: { tile: CategoryTile; className?: string; big?: boolean }) {
  return (
    <Link href={tile.href} className={cn("group relative block overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tile.image} alt={tile.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/25" />
      <span className={cn("absolute bottom-4 left-4 font-display font-black uppercase tracking-tight text-white drop-shadow", big ? "text-3xl" : "text-xl")}>
        {tile.name}
      </span>
    </Link>
  );
}
