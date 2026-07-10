import Link from "next/link";
import type { Look } from "@/lib/shop-the-look";

/**
 * PDP "Shop the Look" — the tagged outfit photo with numbered dots linking each
 * piece to its product page. Server component: pure links, no client JS; the
 * dot pulse is CSS-only and disabled under prefers-reduced-motion.
 */
export function ShopTheLook({ look }: { look: Look }) {
  return (
    <section aria-label="Shop the look" className="mt-12">
      <h2 className="font-display text-xl font-bold uppercase tracking-tight">Shop the Look</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tap a dot to shop each piece.</p>
      <div className="relative mt-4 inline-block max-w-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={look.imageUrl} alt="Model wearing the full look" className="w-full" />
        {look.hotspots.map((h, i) => (
          <Link
            key={i}
            href={`/products/${h.productHandle}`}
            aria-label={h.label || `Shop tagged item ${i + 1}`}
            className="group absolute -translate-x-1/2 -translate-y-1/2 focus-visible:outline-none"
            style={{ left: `${h.x}%`, top: `${h.y}%` }}
          >
            <span className="relative flex h-7 w-7 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 motion-safe:animate-ping motion-safe:[animation-duration:2s]" />
              <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-ink/20 bg-white text-[11px] font-bold text-ink shadow-sm transition-transform group-hover:scale-110 group-focus-visible:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-accent">
                {i + 1}
              </span>
            </span>
            {h.label && (
              <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 hidden -translate-x-1/2 whitespace-nowrap bg-ink px-2 py-1 text-xs text-white group-hover:block group-focus-visible:block">
                {h.label}
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
