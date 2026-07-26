"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { buttonVariants, cn, Container, Skeleton } from "@ecom/ui";
import { useWishlist, type WishlistItem } from "@/lib/wishlist-context";

const fluid: [number, number, number, number] = [0.22, 1, 0.36, 1];

const gridVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: fluid } },
};

export function WishlistView() {
  const { items, remove } = useWishlist();
  const reduce = useReducedMotion() ?? false;

  // The wishlist hydrates from localStorage after mount — hold a quiet skeleton
  // until then so the empty state never flashes over someone's saved pieces.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  return (
    <Container className="py-14 md:py-20">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your edit</p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">Saved pieces</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {hydrated && items.length > 0
            ? `${items.length} piece${items.length === 1 ? "" : "s"}, kept aside while you decide.`
            : "Everything you have hearted, kept in one quiet place."}
        </p>
      </header>

      {!hydrated ? (
        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="mt-3 h-3 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.ul
          className="mt-12 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
          initial={reduce ? false : "hidden"}
          animate="visible"
          variants={reduce ? undefined : gridVariants}
        >
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <SavedPiece key={item.handle} item={item} reduce={reduce} onRemove={() => remove(item.handle)} />
            ))}
          </AnimatePresence>
        </motion.ul>
      )}
    </Container>
  );
}

function SavedPiece({ item, reduce, onRemove }: { item: WishlistItem; reduce: boolean; onRemove: () => void }) {
  return (
    <motion.li
      layout={reduce ? false : "position"}
      variants={reduce ? undefined : itemVariants}
      exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, transition: { duration: 0.25, ease: fluid } }}
      className="group relative"
    >
      <button
        type="button"
        aria-label={`Remove ${item.title} from saved pieces`}
        onClick={onRemove}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-background/80 backdrop-blur transition-colors hover:bg-background"
      >
        <X className="h-4 w-4" />
      </button>
      <Link href={`/products/${item.handle}`} className="block">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {item.thumbnail && (
            <Image
              src={item.thumbnail}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 ease-fluid motion-safe:group-hover:scale-[1.03]"
            />
          )}
        </div>
        <div className="mt-3">
          <p className="line-clamp-1 text-sm">{item.title}</p>
          <p className="mt-0.5 text-sm font-bold">{item.price}</p>
        </div>
      </Link>
    </motion.li>
  );
}

function EmptyState() {
  return (
    <div className="mt-14 max-w-xl md:mt-20">
      <div className="rule-brass" aria-hidden />
      <h2 className="mt-10 font-display text-2xl font-medium tracking-tight md:text-3xl">Nothing saved yet.</h2>
      <p className="mt-3 max-w-md text-muted-foreground">
        When a piece catches your eye, tap the heart and it will wait for you here.
      </p>
      <Link href="/collections/new" className={cn(buttonVariants({ variant: "outline" }), "mt-8")}>
        Shop new arrivals
      </Link>
    </div>
  );
}
