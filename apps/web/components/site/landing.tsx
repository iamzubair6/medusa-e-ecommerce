import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container, cn } from "@ecom/ui";
import type { CategoryTile, LandingData } from "@/lib/commerce";
import { ShopTheLatest } from "./shop-the-latest";

const U = (id: string, w = 1600, h = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;

const TREND_CARDS = [
  { label: "Second Skin", img: "1490481651871-ab68de25d43d", href: "/c/women?cat=bodysuits" },
  { label: "Vacation Strolls", img: "1469334031218-e382a71b716b", href: "/c/women?trend=Vacation" },
  { label: "Hotter on Vacation", img: "1525507119028-ed4c629a60a3", href: "/collections/trending" },
  { label: "Swim Escape", img: "1542272604-787c3835535d", href: "/c/women?cat=swim" },
];

const BRANDS = [
  { label: "Maison Men", href: "/c/men", img: "1485462537746-965f33f7f6a7" },
  { label: "Maison", href: "/c/women", img: "1490481651871-ab68de25d43d" },
  { label: "Maison Curve", href: "/c/plus", img: "1525507119028-ed4c629a60a3" },
  { label: "Maison Kids", href: "/c/kids", img: "1483118714900-540cf339fd46" },
  { label: "Maison Sport", href: "/c/sport", img: "1542272604-787c3835535d" },
  { label: "Maison Luxe", href: "/collections/luxe", img: "1483985988355-763728e1935b" },
];

export function Landing({ data }: { data: LandingData }) {
  return (
    <>
      {/* Hero offer */}
      <section className="relative h-[460px] w-full overflow-hidden md:h-[560px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={U("1483985988355-763728e1935b", 1800, 1000)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
        <Container className="relative flex h-full flex-col justify-center gap-3 text-white">
          <p className="text-sm font-bold uppercase tracking-[0.2em]">New Season</p>
          <h1 className="max-w-md font-display text-4xl font-black uppercase leading-none md:text-6xl">BOGO Free</h1>
          <p className="max-w-sm text-lg font-medium">Get ৳500 off ৳2,500+ — use code <span className="font-bold">MAISON25</span></p>
          <div>
            <Link href="/collections/sale" className="mt-2 inline-block rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
              Shop Now
            </Link>
          </div>
        </Container>
      </section>

      {/* Brand collab strip */}
      <section className="relative h-44 w-full overflow-hidden bg-ink md:h-52">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={U("1542272604-787c3835535d", 1800, 600)} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <Container className="relative flex h-full flex-col items-start justify-center gap-2 text-white">
          <p className="font-display text-2xl font-black uppercase md:text-3xl">Maison × Active</p>
          <Link href="/c/sport" className="text-xs font-bold uppercase tracking-wide underline underline-offset-4">Shop Now</Link>
        </Container>
      </section>

      {/* Trend report */}
      <Container className="py-12">
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
        <img src={U("1490481651871-ab68de25d43d", 1800, 900)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/30" />
        <Container className="relative flex h-full flex-col items-center justify-center gap-3 text-center text-white">
          <h2 className="font-display text-4xl font-black uppercase md:text-6xl">Up to 80% Off Sitewide</h2>
          <Link href="/collections/sale" className="rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
            Shop Now
          </Link>
        </Container>
      </section>

      {/* Shop by Brand */}
      <Container className="py-12">
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
        <img src={U("1525507119028-ed4c629a60a3", 1800, 950)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <Container className="relative flex h-full flex-col items-start justify-end gap-3 pb-10 text-white">
          <h2 className="font-display text-4xl font-black uppercase md:text-5xl">Golden Hours</h2>
          <Link href="/collections/luxe" className="rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
            Shop the Edit
          </Link>
        </Container>
      </section>

      {/* Shop by Category — bento */}
      <Container className="py-12">
        <h2 className="mb-6 font-display text-2xl font-bold uppercase tracking-tight md:text-3xl">Shop by Category</h2>
        <Bento tiles={data.categoryTiles} />
      </Container>

      {/* Sale strip */}
      <section className="relative h-40 w-full overflow-hidden bg-accent">
        <Container className="relative flex h-full flex-col items-center justify-center gap-2 text-center text-accent-foreground">
          <h2 className="font-display text-3xl font-black uppercase md:text-4xl">60–80% Off Sale</h2>
          <Link href="/collections/sale" className="rounded-full bg-accent-foreground px-7 py-2.5 text-xs font-bold uppercase tracking-wide text-accent">
            Shop Now
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
