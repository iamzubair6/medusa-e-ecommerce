"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, ChevronDown, Heart, Loader2, Menu, Search, User, X } from "lucide-react";
import { Container, cn } from "@ecom/ui";
import { z } from "zod";
import type { NavCategory, NavData } from "@/lib/nav-data";
import type { NavCollection, Navigation } from "@/lib/navigation";
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
  // Admin-managed collections for this division (else fall back to the auto menu).
  const adminCollections = navData.navigation.divisions.find((d) => d.handle === division)?.collections ?? [];
  const useAdminNav = adminCollections.length > 0;

  return (
    <header className="sticky top-0 z-30 w-full bg-background">
      {/* announcement */}
      {announcement.active && (
        <div className="bg-ink text-center text-primary-foreground">
          <Container className="py-2 text-[11px] font-bold uppercase tracking-[0.08em]">
            {announcement.message}{" "}
            <Link href={announcement.href} className="underline underline-offset-2">
              Shop Now
            </Link>
          </Container>
        </div>
      )}

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
                const href = d.handle === "women" ? "/" : `/pages/${d.handle}`;
                const active = d.handle === division;
                return (
                  <Link
                    key={d.handle}
                    href={href}
                    className={cn(
                      "relative text-xs font-bold uppercase tracking-wide underline-offset-[6px] transition-colors hover:text-foreground",
                      active ? "text-foreground underline decoration-2" : "text-foreground/70",
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
              <SearchAutocomplete divLabel={divLabel} onVisualSearch={openUpload} reduce={!!reduce} />
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
        {useAdminNav ? (
          <>
            <Container>
              <ul className="flex flex-wrap items-center gap-6 py-2.5">
                {adminCollections.map((col, i) => (
                  <li key={i} className="shrink-0" onMouseEnter={() => setOpenMega(col.columns.length ? `col:${i}` : null)}>
                    <Link
                      href={col.href}
                      className={cn(
                        "text-[0.7rem] font-bold uppercase tracking-[0.1em] transition-colors hover:text-accent",
                        col.highlight ? "text-accent" : "text-foreground/75",
                        col.columns.length > 0 && "link-underline",
                      )}
                    >
                      {col.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </Container>
            <AnimatePresence>
              {openMega?.startsWith("col:") && (adminCollections[Number(openMega.slice(4))]?.columns.length ?? 0) > 0 && (
                <AdminMegaPanel collection={adminCollections[Number(openMega.slice(4))]!} reduce={!!reduce} />
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            <Container>
              <ul className="flex flex-wrap items-center gap-6 py-2.5">
                <li className="shrink-0" onMouseEnter={() => setOpenMega(null)}>
                  <Link href={`/collections/new?division=${division}`} className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground/75 transition-colors hover:text-accent">
                    New In
                  </Link>
                </li>
                <li className="shrink-0" onMouseEnter={() => setOpenMega("__clothing__")}>
                  <Link href={`/collections/${division}?division=${division}`} className="link-underline text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground/75 transition-colors hover:text-accent">
                    Clothing
                  </Link>
                </li>
                {categories.map((c) => (
                  <li key={c.handle} className="shrink-0" onMouseEnter={() => setOpenMega(c.handle)}>
                    <Link
                      href={`/collections/${c.handle}?division=${division}`}
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
                  mode={openMega === "__clothing__" ? "broad" : "type"}
                  category={categories.find((c) => c.handle === openMega)}
                  types={categories}
                  facets={facets}
                  reduce={!!reduce}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <MobileDrawer
            brand={brand}
            divisions={divisions}
            categoriesByDivision={categoriesByDivision}
            navigation={navData.navigation}
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

// --- Search autocomplete ------------------------------------------------------

const suggestionSchema = z.object({
  id: z.string(),
  handle: z.string(),
  title: z.string(),
  thumbnail: z.string(),
  price: z.string(),
});
const suggestionsResponseSchema = z.object({ results: z.array(suggestionSchema) });
type Suggestion = z.infer<typeof suggestionSchema>;

const SUGGEST_DEBOUNCE_MS = 250;
const SUGGEST_MIN_CHARS = 2;
const SUGGEST_LIMIT = 6;

/** Desktop search box with a product-suggestion dropdown (combobox pattern). */
function SearchAutocomplete({
  divLabel,
  onVisualSearch,
  reduce,
}: {
  divLabel: string;
  onVisualSearch: () => void;
  reduce: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Debounce the typed value; the debounced value drives useQuery below.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(term.trim()), SUGGEST_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [term]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const enabled = debounced.length >= SUGGEST_MIN_CHARS;
  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ["search-suggestions", debounced],
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }): Promise<Suggestion[]> => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}&limit=${SUGGEST_LIMIT}`, { signal });
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      return suggestionsResponseSchema.parse(await res.json()).results;
    },
  });

  const suggestions = enabled && !isError ? (data ?? []) : [];
  // Options = suggestion rows + the trailing "See all results" row.
  const optionCount = suggestions.length > 0 ? suggestions.length + 1 : 0;
  // Errors show an honest row instead of silently hiding the panel.
  const showPanel = open && enabled;

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      close();
      return;
    }
    if (!showPanel || optionCount === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % optionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + optionCount) % optionCount);
    } else if (e.key === "Enter" && active >= 0) {
      if (active < suggestions.length) {
        e.preventDefault();
        const s = suggestions[active]!;
        close();
        router.push(`/products/${s.handle}`);
      }
      // active === "See all results" → fall through to the form's GET submit.
    }
  };

  return (
    <form
      ref={formRef}
      action="/products"
      role="search"
      onSubmit={close}
      className="relative hidden items-center gap-2 rounded-sm border border-border bg-muted/50 px-3 py-2 md:flex"
    >
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        name="q"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={`Search within ${divLabel}'s`}
        aria-label="Search"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="search-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
        className="w-40 bg-transparent text-sm outline-none lg:w-56"
      />
      {enabled && isFetching && (
        <Loader2 aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground motion-safe:animate-spin" />
      )}
      <button
        type="button"
        aria-label="Search by image"
        onClick={onVisualSearch}
        className="cursor-pointer text-muted-foreground hover:text-accent"
      >
        <Camera className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 4 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden border border-border bg-card shadow-xl"
          >
            {isError ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">Search unavailable — press Enter to search</p>
            ) : isPending ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">Searching…</p>
            ) : suggestions.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No matches — press Enter to search</p>
            ) : (
              <ul id="search-suggestions" role="listbox" aria-label="Product suggestions">
                {suggestions.map((s, i) => (
                  // role="option" sits on the interactive element itself — ARIA
                  // options must not have interactive descendants.
                  <li key={s.id}>
                    <Link
                      href={`/products/${s.handle}`}
                      id={`search-option-${i}`}
                      role="option"
                      aria-selected={active === i}
                      onClick={close}
                      onMouseEnter={() => setActive(i)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted",
                        active === i && "bg-muted",
                      )}
                    >
                      {s.thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={s.thumbnail} alt="" className="h-12 w-10 shrink-0 object-cover" />
                      ) : (
                        <span aria-hidden className="h-12 w-10 shrink-0 bg-muted" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
                      <span className="shrink-0 text-xs font-semibold">{s.price}</span>
                    </Link>
                  </li>
                ))}
                <li className="border-t border-border">
                  <button
                    type="submit"
                    id={`search-option-${suggestions.length}`}
                    role="option"
                    aria-selected={active === suggestions.length}
                    onMouseEnter={() => setActive(suggestions.length)}
                    className={cn(
                      "w-full cursor-pointer px-3 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground/75 transition-colors hover:bg-muted hover:text-accent",
                      active === suggestions.length && "bg-muted text-accent",
                    )}
                  >
                    See all results for &ldquo;{term.trim()}&rdquo;
                  </button>
                </li>
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

function MegaColumn({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; href: string; swatch?: string; highlight?: boolean }[];
}) {
  if (links.length === 0) return null;
  return (
    <div>
      {/* An empty heading = FN-style "Featured" lifecycle column: links only. */}
      {heading && <p className="mb-3 text-[0.7rem] font-bold uppercase tracking-[0.1em] text-foreground">{heading}</p>}
      <ul className="flex flex-col gap-2">
        {links.map((l, i) => (
          <li key={l.href + i}>
            <Link
              href={l.href}
              className={cn(
                "flex items-center gap-2 text-[0.8rem] transition-colors hover:text-accent hover:underline",
                l.highlight ? "font-medium text-accent" : "text-foreground/70",
              )}
            >
              {l.swatch && <span className="h-3 w-3 shrink-0 rounded-full border border-border" style={{ backgroundColor: l.swatch }} />}
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const BRANDS = [
  { label: "Maison Luxe", href: "/collections/luxe" },
  { label: "Maison Men", href: "/collections/men?division=men" },
  { label: "Maison Curve", href: "/collections/plus?division=plus" },
  { label: "Maison Sport", href: "/collections/sport?division=sport" },
  { label: "Maison Kids", href: "/collections/kids?division=kids" },
];

/** Full-width popover rendered from an admin-managed collection (columns + promo tile). */
function AdminMegaPanel({ collection, reduce }: { collection: NavCollection; reduce: boolean }) {
  const columns = collection.columns.filter((c) => c.links.length > 0);
  // The tile needs 2 of the 12 tracks — drop it rather than wrap when 6 columns are set.
  const showImage = Boolean(collection.image) && columns.length < 6;
  if (columns.length === 0 && !showImage) return null;
  const tracks = columns.length + (showImage ? 1 : 0);
  const span = tracks > 4 ? "md:col-span-2" : "md:col-span-3";
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: 4 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="absolute left-0 right-0 top-full z-40 border-b border-border bg-card shadow-xl"
    >
      <Container className="grid grid-cols-2 gap-6 py-7 md:grid-cols-12">
        {columns.map((col, i) => (
          <div key={i} className={span}>
            <MegaColumn heading={col.heading} links={col.links} />
          </div>
        ))}
        {showImage && (
          <Link href={collection.href} className="group relative hidden h-56 overflow-hidden md:col-span-2 md:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={collection.image} alt={collection.label} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
            <span className="absolute bottom-3 left-3 rounded-sm bg-background/90 px-2 py-1 text-xs font-bold uppercase tracking-wide">
              Shop {collection.label}
            </span>
          </Link>
        )}
      </Container>
    </motion.div>
  );
}

function MegaPanel({
  division,
  mode,
  category,
  types,
  facets,
  reduce,
}: {
  division: string;
  mode: "broad" | "type";
  category?: NavCategory;
  types: NavCategory[];
  facets: NavData["facets"];
  reduce: boolean;
}) {
  if (mode === "type" && !category) return null;
  const wrap = (children: React.ReactNode) => (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, y: 4 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      className="absolute left-0 right-0 top-full z-40 border-b border-border bg-card shadow-xl"
    >
      <Container className="grid grid-cols-2 gap-6 py-7 md:grid-cols-12">{children}</Container>
    </motion.div>
  );

  if (mode === "broad") {
    const divBase = `/collections/${division}?division=${division}`;
    return wrap(
      <>
        <div className="md:col-span-2">
          <Link href={divBase} className="text-[0.8rem] font-bold text-foreground hover:text-accent hover:underline">
            Shop All Clothing
          </Link>
        </div>
        <div className="md:col-span-3">
          <MegaColumn heading="All Clothing" links={types.map((t) => ({ label: t.name, href: `/collections/${t.handle}?division=${division}` }))} />
        </div>
        <div className="md:col-span-2">
          <MegaColumn heading="Shop by Occasion" links={facets.occasion.map((o) => ({ label: o, href: `${divBase}&occasion=${enc(o)}` }))} />
        </div>
        <div className="md:col-span-3">
          <MegaColumn heading="Shop by Trend" links={facets.trend.map((t) => ({ label: t, href: `${divBase}&trend=${enc(t)}` }))} />
        </div>
        <div className="md:col-span-2">
          <MegaColumn heading="Shop Maison Brands" links={BRANDS.map((b) => ({ label: b.label, href: b.href }))} />
        </div>
      </>,
    );
  }

  const name = category!.name;
  const base = `/collections/${category!.handle}?division=${division}`;
  const lifecycle = [
    { label: `Shop All ${name}`, href: base },
    { label: `New In ${name}`, href: `/collections/new?division=${division}` },
    { label: `Back In Stock ${name}`, href: base },
    { label: `${name} Deals`, href: `/collections/sale?division=${division}` },
    { label: `Sale ${name}`, href: `/collections/sale?division=${division}`, red: true },
  ];
  return wrap(
    <>
      <div className="md:col-span-2">
        <ul className="flex flex-col gap-2">
          {lifecycle.map((l, i) => (
            <li key={l.href + i}>
              <Link href={l.href} className={cn("text-[0.8rem] font-medium transition-colors hover:text-accent hover:underline", l.red ? "text-accent" : "text-foreground/80")}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="md:col-span-2">
        <MegaColumn heading="Shop by Style" links={facets.style.map((s) => ({ label: `${s}`, href: `${base}&style=${enc(s)}` }))} />
      </div>
      <div className="md:col-span-2">
        <MegaColumn heading="Shop by Occasion" links={facets.occasion.map((o) => ({ label: `${o} ${name}`, href: `${base}&occasion=${enc(o)}` }))} />
      </div>
      <div className="md:col-span-2">
        <MegaColumn heading="Shop by Trend" links={facets.trend.map((t) => ({ label: `${t} ${name}`, href: `${base}&trend=${enc(t)}` }))} />
      </div>
      <div className="md:col-span-2">
        <MegaColumn heading="Shop by Color" links={facets.colors.map((c) => ({ label: c.name, href: `${base}&color=${enc(c.name)}`, swatch: c.swatch }))} />
      </div>
      <Link href={base} className="group relative hidden h-56 overflow-hidden md:col-span-2 md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PROMO_IMG} alt={name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        <span className="absolute bottom-3 left-3 rounded-sm bg-background/90 px-2 py-1 text-xs font-bold uppercase tracking-wide">Shop {name}</span>
      </Link>
    </>,
  );
}

function MobileDrawer({
  brand,
  divisions,
  categoriesByDivision,
  navigation,
  reduce,
  onClose,
}: {
  brand: string;
  divisions: NavData["divisions"];
  categoriesByDivision: NavData["categoriesByDivision"];
  navigation: Navigation;
  reduce: boolean;
  onClose: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [openCol, setOpenCol] = useState<string | null>(null);
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
            // Same source as the desktop mega menu: admin nav wins, auto categories otherwise.
            const adminCols = navigation.divisions.find((x) => x.handle === d.handle)?.collections ?? [];
            const expandable = adminCols.length > 0 || cats.length > 0;
            const expanded = open === d.handle;
            return (
              <li key={d.handle} className="border-b border-border">
                <div className="flex items-center justify-between">
                  <Link href={d.handle === "women" ? "/" : `/pages/${d.handle}`} onClick={onClose} className="block py-3 text-sm font-bold uppercase tracking-wide hover:text-accent">
                    {d.label}
                  </Link>
                  {expandable && (
                    <button type="button" aria-label={`Expand ${d.label}`} aria-expanded={expanded} onClick={() => setOpen(expanded ? null : d.handle)} className="p-2">
                      <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                    </button>
                  )}
                </div>
                {expanded && adminCols.length > 0 && (
                  <ul className="pb-2 pl-3">
                    {adminCols.map((col, ci) => {
                      const key = `${d.handle}:${ci}`;
                      const hasSections = col.columns.some((x) => x.links.length > 0);
                      const colOpen = openCol === key;
                      return (
                        <li key={key}>
                          <div className="flex items-center justify-between">
                            <Link
                              href={col.href}
                              onClick={onClose}
                              className={cn("block py-1.5 text-sm hover:text-accent", col.highlight ? "font-semibold text-accent" : "text-foreground/75")}
                            >
                              {col.label}
                            </Link>
                            {hasSections && (
                              <button type="button" aria-label={`Expand ${col.label}`} aria-expanded={colOpen} onClick={() => setOpenCol(colOpen ? null : key)} className="p-2">
                                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", colOpen && "rotate-180")} />
                              </button>
                            )}
                          </div>
                          {colOpen && (
                            <div className="pb-2 pl-3">
                              {col.columns.filter((x) => x.links.length > 0).map((x, xi) => (
                                <div key={xi} className="py-1">
                                  {x.heading && (
                                    <p className="py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">{x.heading}</p>
                                  )}
                                  <ul>
                                    {x.links.map((l, li) => (
                                      <li key={l.href + li}>
                                        <Link
                                          href={l.href}
                                          onClick={onClose}
                                          className={cn("flex items-center gap-2 py-1 text-sm hover:text-accent", l.highlight ? "text-accent" : "text-foreground/70")}
                                        >
                                          {l.swatch && <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-border" style={{ backgroundColor: l.swatch }} />}
                                          {l.label}
                                        </Link>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                {expanded && adminCols.length === 0 && (
                  <ul className="pb-2 pl-3">
                    {cats.map((c) => (
                      <li key={c.handle}>
                        <Link href={`/collections/${c.handle}?division=${d.handle}`} onClick={onClose} className="block py-1.5 text-sm text-foreground/75 hover:text-accent">
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
