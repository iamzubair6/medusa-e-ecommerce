"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ChevronRight, Heart, Menu, Search, User, X } from "lucide-react";
import { Container } from "@ecom/ui";
import type { Announcement, MegaMenu } from "@ecom/cms";
import { CartButton } from "@/components/cart/cart-button";
import { CartDrawer } from "@/components/cart/cart-drawer";

export interface NavLink {
  label: string;
  href: string;
  mega?: MegaMenu;
}

interface NavbarProps {
  links: NavLink[];
  announcement?: Announcement;
}

// Fashion-Nova-style top departments.
const DEPARTMENTS = [
  { label: "Women", href: "/c/women" },
  { label: "Plus+Curve", href: "/c/plus" },
  { label: "Men", href: "/c/men" },
  { label: "Sport", href: "/c/sport" },
  { label: "Kids", href: "/c/kids" },
  { label: "Beauty", href: "/c/beauty" },
];

export function Navbar({ links, announcement }: NavbarProps) {
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();
  const message = announcement?.active ? announcement.message : "FREE SHIPPING ON ORDERS OVER $75";

  return (
    <header className="sticky top-0 z-30 w-full bg-background">
      {/* announcement */}
      <div className="bg-black text-center text-white">
        <Container className="py-2 text-[11px] font-bold uppercase tracking-[0.08em]">
          {message}{" "}
          <Link href={announcement?.href ?? "/products"} className="underline underline-offset-2">
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

            <Link href="/" className="font-display text-2xl font-black uppercase tracking-tight">
              MAISON
            </Link>

            {/* departments */}
            <nav className="ml-4 hidden items-center gap-5 lg:flex" aria-label="Departments">
              {DEPARTMENTS.map((d) => (
                <Link
                  key={d.label}
                  href={d.href}
                  className="text-xs font-bold uppercase tracking-wide text-foreground/80 transition-colors hover:text-foreground"
                >
                  {d.label}
                </Link>
              ))}
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
                  placeholder="Search..."
                  aria-label="Search"
                  className="w-40 bg-transparent text-sm outline-none lg:w-52"
                />
                <button type="button" aria-label="Search by image" className="cursor-pointer text-muted-foreground hover:text-foreground">
                  <Camera className="h-4 w-4" />
                </button>
              </form>
              <button type="button" aria-label="Search" className="cursor-pointer p-2 md:hidden">
                <Search className="h-5 w-5" />
              </button>
              <Link href="/account" aria-label="Account" className="p-2 transition-colors hover:text-accent">
                <User className="h-5 w-5" />
              </Link>
              <Link href="/account" aria-label="Wishlist" className="hidden p-2 transition-colors hover:text-accent sm:block">
                <Heart className="h-5 w-5" />
              </Link>
              <CartButton />
            </div>
          </div>
        </Container>
      </div>

      {/* category subnav with mega menus */}
      <div className="border-b border-border bg-background">
        <Container>
          <ul className="hidden items-center gap-6 overflow-x-auto py-2.5 lg:flex">
            {links.map((link) => (
              <li
                key={link.label}
                className="relative shrink-0"
                onMouseEnter={() => setOpenMega(link.mega ? link.label : null)}
                onMouseLeave={() => setOpenMega(null)}
              >
                <Link
                  href={link.href}
                  className="link-underline text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground/75 transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
                {link.mega && (
                  <AnimatePresence>
                    {openMega === link.label && <MegaPanel mega={link.mega} reduce={!!reduce} />}
                  </AnimatePresence>
                )}
              </li>
            ))}
            <li className="ml-auto shrink-0 text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
            </li>
          </ul>
        </Container>
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileDrawer links={links} reduce={!!reduce} onClose={() => setMobileOpen(false)} />
        )}
      </AnimatePresence>

      <CartDrawer />
    </header>
  );
}

function MegaPanel({ mega, reduce }: { mega: MegaMenu; reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: 6 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="absolute left-0 top-full z-40 w-[680px] border border-border bg-card p-7 shadow-2xl"
    >
      <div className="flex gap-8">
        <div className="grid flex-1 grid-cols-3 gap-7">
          {mega.columns.map((col, i) => (
            <div key={i}>
              {col.heading && (
                <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground">
                  {col.heading}
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[0.8rem] text-foreground/70 transition-colors hover:text-accent hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {mega.featured && (
          <Link href={mega.featured.href} className="group relative h-44 w-40 shrink-0 overflow-hidden">
            <Image
              src={mega.featured.media.url}
              alt={mega.featured.media.alt ?? mega.featured.label}
              fill
              sizes="160px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute bottom-2 left-2 text-xs font-bold uppercase tracking-wide text-white drop-shadow">
              {mega.featured.label}
            </span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}

function MobileDrawer({
  links,
  reduce,
  onClose,
}: {
  links: NavLink[];
  reduce: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85%] flex-col bg-background p-6 lg:hidden"
        initial={reduce ? false : { x: "-100%" }}
        animate={{ x: 0 }}
        exit={reduce ? undefined : { x: "-100%" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-display text-xl font-black uppercase">MAISON</span>
          <button type="button" aria-label="Close menu" className="cursor-pointer p-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground">Shop</p>
        <ul className="flex flex-col">
          {[...DEPARTMENTS, ...links].map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                onClick={onClose}
                className="block border-b border-border py-3 text-sm font-bold uppercase tracking-wide transition-colors hover:text-accent"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </motion.div>
    </>
  );
}
