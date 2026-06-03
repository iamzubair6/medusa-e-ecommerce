"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, X } from "lucide-react";
import { buttonVariants, Container } from "@ecom/ui";
import { useWishlist } from "@/lib/wishlist-context";

export function WishlistView() {
  const { items, remove } = useWishlist();

  return (
    <Container className="py-12">
      <h1 className="font-display text-3xl font-bold tracking-tight">Wishlist</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} saved {items.length === 1 ? "piece" : "pieces"}</p>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Heart className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground">Your wishlist is empty.</p>
          <Link href="/products" className={buttonVariants({ variant: "solid" })}>
            Explore the collection
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.handle} className="group relative">
              <button
                type="button"
                aria-label="Remove from wishlist"
                onClick={() => remove(item.handle)}
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
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  )}
                </div>
                <div className="mt-2">
                  <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                  <p className="text-sm font-bold">{item.price}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
