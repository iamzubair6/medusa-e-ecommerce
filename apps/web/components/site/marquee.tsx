import type { MarqueeConfig } from "@ecom/cms";

/** Scrolling hype strip. Pure-CSS marquee (pauses for reduced-motion via globals). */
export function Marquee({ config }: { config: MarqueeConfig }) {
  const items = [...config.items, ...config.items]; // duplicate for seamless loop
  return (
    <div className="overflow-hidden border-y border-border bg-ink py-2.5 text-primary-foreground">
      <div
        className="flex w-max animate-marquee items-center gap-12 whitespace-nowrap"
        style={{ animationDuration: `${config.speedSeconds}s` }}
      >
        {items.map((item, i) => (
          <span key={i} className="text-xs font-semibold uppercase tracking-[0.2em]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
