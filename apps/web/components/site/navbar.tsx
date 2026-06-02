"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Menu, Search, User, X } from "lucide-react";
import { Container, cn } from "@ecom/ui";
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

export function Navbar({ links, announcement }: NavbarProps) {
  const [openMega, setOpenMega] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <header className="sticky top-0 z-30 w-full">
      {announcement?.active && (
        <div className="bg-ink text-center text-primary-foreground">
          <Container className="py-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {announcement.href ? (
              <Link href={announcement.href} className="hover:text-gold-soft transition-colors">
                {announcement.message}
              </Link>
            ) : (
              announcement.message
            )}
          </Container>
        </div>
      )}

      <div className="border-b border-border bg-background/80 backdrop-blur-md">
        <Container>
          <nav className="flex h-16 items-center justify-between gap-4" aria-label="Primary">
            {/* mobile menu toggle */}
            <button
              type="button"
              className="cursor-pointer p-2 lg:hidden"
              aria-label="Open menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/" className="font-display text-2xl font-medium tracking-[-0.02em]">
              Maison
            </Link>

            {/* desktop links + mega menu */}
            <ul className="hidden flex-1 items-center justify-center gap-9 lg:flex">
              {links.map((link) => (
                <li
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => setOpenMega(link.mega ? link.label : null)}
                  onMouseLeave={() => setOpenMega(null)}
                >
                  <Link
                    href={link.href}
                    className="link-underline flex h-16 items-center text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-foreground/75 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                  {link.mega && (
                    <AnimatePresence>
                      {openMega === link.label && (
                        <MegaPanel mega={link.mega} reduce={!!reduce} />
                      )}
                    </AnimatePresence>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-1">
              <button type="button" aria-label="Search" className="cursor-pointer p-2 transition-colors hover:text-accent">
                <Search className="h-5 w-5" />
              </button>
              <Link href="/account" aria-label="Account" className="p-2 transition-colors hover:text-accent">
                <User className="h-5 w-5" />
              </Link>
              <CartButton />
            </div>
          </nav>
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
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="absolute left-1/2 top-full z-40 w-[640px] -translate-x-1/2 rounded-lg border border-border bg-card p-6 shadow-xl"
    >
      <div className="flex gap-8">
        <div className="grid flex-1 grid-cols-2 gap-6">
          {mega.columns.map((col, i) => (
            <div key={i}>
              {col.heading && (
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.heading}
                </p>
              )}
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-foreground/80 transition-colors hover:text-gold">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {mega.featured && (
          <Link href={mega.featured.href} className="group relative h-40 w-44 overflow-hidden rounded-md">
            <Image
              src={mega.featured.media.url}
              alt={mega.featured.media.alt ?? mega.featured.label}
              fill
              sizes="176px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute bottom-2 left-2 text-xs font-semibold uppercase tracking-wide text-white drop-shadow">
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
          <span className="font-display text-xl font-medium">Maison</span>
          <button type="button" aria-label="Close menu" className="cursor-pointer p-2" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="flex flex-col gap-1">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                onClick={onClose}
                className={cn(
                  "block rounded-md px-3 py-3 text-sm font-semibold uppercase tracking-wide",
                  "transition-colors hover:bg-muted",
                )}
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
