"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ChevronDown, Heart, Menu, Search, User, X } from "lucide-react";
import { Container, cn } from "@ecom/ui";
import type { NavCategory, NavData } from "@/lib/nav-data";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { ShopSimilarModal } from "@/components/site/shop-similar-modal";
import { useVisualSearch } from "@/lib/visual-search-context";
import { useWishlist } from "@/lib/wishlist-context";

interface NavbarProps {
  navData: NavData;
}

const PROMO_IMG =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=750&q=80";
const enc = encodeURIComponent;

export function Navbar({ navData }: NavbarProps) {
  const { divisions, categoriesByDivision, facets, brandByDivision, announcement } = navData;
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { openUpload } = useVisualSearch();
  const { count: wishlistCount } = useWishlist();
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    fetch("/api/account/me")
      .then((r) => r.json())
      .then((d: { loggedIn?: boolean }) => setLoggedIn(Boolean(d.loggedIn)))
      .catch(() => {});
  }, []);

  const divisionHandles = useMemo(() => new Set(divisions.map((d) => d.handle)), [divisions]);
  const division = useMemo(() => {
    const m = pathname.match(/^\/c\/([^/]+)/);
    if (m && divisionHandles.has(m[1]!)) return m[1]!;
    const pm = pathname.match(/^\/pages\/([^/]+)/);
    if (pm) {
      const slug = pm[1] === "curve" ? "plus" : pm[1]!;
      if (divisionHandles.has(slug)) return slug;
    }
    return "women";
  }, [pathname, divisionHandles]);

  const brand = brandByDivision[division] ?? "MAISON";
  const divLabel = divisions.find((d) => d.handle === division)?.label ?? "Women";
  const categories = categoriesByDivision[division] ?? [];

  return (
    <header className="sticky top-0 z-30 w-full bg-background">
      {/* announcement */}
      <div className="bg-ink text-center text-primary-foreground">
        <Container className="py-2 text-[11px] font-bold uppercase tracking-[0.08em]">
          {announcement.message}{" "}
          <Link href={announcement.href} className="underline underline-offset-2">
            Shop Now
          </Link>
        </Container>
      </div>

      {/* main bar */}
      <div className="border-b border-border">
        <Container>
          <div className="flex h-14 items-center gap-4">
            <button
              type="button"
              className="cursor-pointer p-1 lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link href="/" className="shrink-0 font-display text-2xl font-black uppercase tracking-tight">
              {brand}
            </Link>

            {/* divisions */}
            <nav className="ml-4 hidden items-center gap-5 lg:flex" aria-label="Departments">
              {divisions.map((d) => {
                const href = d.handle === "women" ? "/" : `/c/${d.handle}`;
                const active = d.handle === division;
                return (
                  <Link
                    key={d.handle}
                    href={href}
                    className={cn(
                      "relative text-xs font-bold uppercase tracking-wide transition-colors hover:text-foreground",
                      active ? "text-foreground" : "text-foreground/70",
                    )}
                  >
                    {d.badge && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-[2px] bg-accent px-1 text-[0.5rem] font-bold leading-tight text-accent-foreground">
                        {d.badge}
                      </span>
                    )}
                    {d.label}
                  </Link>
                );
              })}
            </nav>

            {/* search + utilities */}
            <div className="ml-auto flex items-center gap-2">
              <form
                action="/products"
                className="hidden items-center gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2 md:flex"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  name="q"
                  placeholder={`Search within ${divLabel}'s`}
                  aria-label="Search"
                  className="w-40 bg-transparent text-sm outline-none lg:w-56"
                />
                <button
                  type="button"
                  aria-label="Search by image"
                  onClick={openUpload}
                  className="cursor-pointer text-muted-foreground hover:text-accent"
                >
                  <Camera className="h-4 w-4" />
                </button>
              </form>
              <button type="button" aria-label="Search" className="cursor-pointer p-2 md:hidden">
                <Search className="h-5 w-5" />
              </button>
              <Link href="/account" aria-label={loggedIn ? "My account" : "Sign in"} className="relative p-2 transition-colors hover:text-accent">
                <User className={cn("h-5 w-5", loggedIn && "text-accent")} />
                {loggedIn && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />}
              </Link>
              <Link href="/wishlist" aria-label="Wishlist" className="relative hidden p-2 transition-colors hover:text-accent sm:block">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.55rem] font-bold text-accent-foreground">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <CartButton />
            </div>
          </div>
        </Container>
      </div>

      {/* second-level category bar + full-width mega menu */}
      <div className="relative hidden border-b border-border bg-background lg:block" onMouseLeave={() => setOpenMega(null)}>
        <Container>
          <ul className="flex flex-wrap items-center gap-6 py-2.5">
            <li className="shrink-0" onMouseEnter={() => setOpenMega(null)}>
              <Link href={`/collections/new?division=${division}`} className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground/75 transition-colors hover:text-accent">
                New In
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.handle} className="shrink-0" onMouseEnter={() => setOpenMega(c.handle)}>
                <Link
                  href={`/c/${division}?cat=${c.handle}`}
                  className="link-underline text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground/75 transition-colors hover:text-accent"
                >
                  {c.name}
                </Link>
              </li>
            ))}
            {division === "men" && (
              <li className="shrink-0" onMouseEnter={() => setOpenMega(null)}>
                <Link href={`/collections/sale?division=men`} className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-accent transition-colors hover:underline">
                  Sale
                </Link>
              </li>
            )}
          </ul>
        </Container>

        <AnimatePresence>
          {openMega && (
            <MegaPanel
              division={division}
              category={categories.find((c) => c.handle === openMega)}
              facets={facets}
              reduce={!!reduce}
            />
          )}
        </AnimatePresence>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileDrawer
            brand={brand}
            divisions={divisions}
            categoriesByDivision={categoriesByDivision}
            reduce={!!reduce}
            onClose={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <CartDrawer />
      <ShopSimilarModal />
    </header>
  );
}

function MegaColumn({ heading, links }: { heading: string; links: { label: string; href: string; swatch?: string }[] }) {
  if (links.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground">{heading}</p>
      <ul className="flex flex-col gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="flex items-center gap-2 text-[0.8rem] text-foreground/70 transition-colors hover:text-accent hover:underline">
              {l.swatch && <span className="h-3 w-3 rounded-full border border-border" style={{ backgroundColor: l.swatch }} />}
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MegaPanel({
  division,
  category,
  facets,
  reduce,
}: {
  division: string;
  category?: NavCategory;
  facets: NavData["facets"];
  reduce: boolean;
}) {
  if (!category) return null;
  const name = category.name;
  const base = `/c/${division}?cat=${category.handle}`;
  const quick = [
    { label: `Shop All ${name}`, href: base },
    { label: `New In ${name}`, href: `/collections/new?division=${division}` },
    { label: `Back In Stock ${name}`, href: base },
    { label: `${name} Deals`, href: `/collections/sale?division=${division}` },
    { label: `Luxe ${name}`, href: `/collections/luxe?division=${division}` },
    { label: `Sale ${name}`, href: `/collections/sale?division=${division}` },
  ];
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: 4 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="absolute left-0 right-0 top-full z-40 border-b border-border bg-card shadow-xl"
    >
      <Container className="grid grid-cols-2 gap-6 py-7 md:grid-cols-12">
        <div className="md:col-span-2">
          <ul className="flex flex-col gap-2">
            {quick.map((l, i) => (
              <li key={l.href + i}>
                <Link href={l.href} className={cn("text-[0.8rem] font-medium transition-colors hover:text-accent hover:underline", i === quick.length - 1 ? "text-accent" : "text-foreground/80")}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2">
          <MegaColumn heading="Shop by Occasion" links={facets.occasion.map((o) => ({ label: o, href: `${base}&occasion=${enc(o)}` }))} />
        </div>
        <div className="md:col-span-2">
          <MegaColumn heading="Shop by Style" links={facets.style.map((s) => ({ label: s, href: `${base}&style=${enc(s)}` }))} />
        </div>
        <div className="md:col-span-2">
          <MegaColumn heading="Shop by Trend" links={facets.trend.map((t) => ({ label: t, href: `${base}&trend=${enc(t)}` }))} />
        </div>
        <div className="md:col-span-2">
          <MegaColumn heading="Shop by Color" links={facets.colors.map((c) => ({ label: c.name, href: `${base}&color=${enc(c.name)}`, swatch: c.swatch }))} />
        </div>
        <Link href={base} className="group relative hidden h-56 overflow-hidden md:col-span-2 md:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PROMO_IMG} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          <span className="absolute bottom-3 left-3 rounded-sm bg-background/90 px-2 py-1 text-xs font-bold uppercase tracking-wide">
            Shop {name}
          </span>
        </Link>
      </Container>
    </motion.div>
  );
}

function MobileDrawer({
  brand,
  divisions,
  categoriesByDivision,
  reduce,
  onClose,
}: {
  brand: string;
  divisions: NavData["divisions"];
  categoriesByDivision: NavData["categoriesByDivision"];
  reduce: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <motion.div className="fixed inset-0 z-40 bg-black/40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85%] flex-col overflow-y-auto bg-background p-6 lg:hidden"
        initial={reduce ? false : { x: "-100%" }}
        animate={{ x: 0 }}
        exit={reduce ? undefined : { x: "-100%" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-xl font-black uppercase">{brand}</span>
          <button type="button" aria-label="Close menu" className="cursor-pointer p-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="flex flex-col">
          {divisions.map((d) => {
            const cats = categoriesByDivision[d.handle] ?? [];
            const expanded = open === d.handle;
            return (
              <li key={d.handle} className="border-b border-border">
                <div className="flex items-center justify-between">
                  <Link href={d.handle === "women" ? "/" : `/c/${d.handle}`} onClick={onClose} className="block py-3 text-sm font-bold uppercase tracking-wide hover:text-accent">
                    {d.label}
                  </Link>
                  {cats.length > 0 && (
                    <button type="button" aria-label="Expand" onClick={() => setOpen(expanded ? null : d.handle)} className="p-2">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  )}
                </div>
                {expanded && (
                  <ul className="pb-2 pl-3">
                    {cats.map((c) => (
                      <li key={c.handle}>
                        <Link href={`/c/${d.handle}?cat=${c.handle}`} onClick={onClose} className="block py-1.5 text-sm text-foreground/75 hover:text-accent">
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </motion.div>
    </>
  );
}
