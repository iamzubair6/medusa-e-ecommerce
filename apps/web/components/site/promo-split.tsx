import Link from "next/link";
import Image from "next/image";
import { buttonVariants, Container, Reveal, cn } from "@ecom/ui";
import type { PromoSplitConfig } from "@ecom/cms";

const columnsCls: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

/** A 2-up/3-up row of large promo image cards with overlay copy + CTA. */
export function PromoSplit({ config }: { config: PromoSplitConfig }) {
  return (
    <section className="py-12 md:py-16">
      <Container>
        {config.heading && (
          <Reveal>
            <h2 className="mb-6 font-display text-2xl font-bold tracking-tight md:text-3xl">
              {config.heading}
            </h2>
          </Reveal>
        )}
        <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", columnsCls[config.columns])}>
          {config.cards.map((card, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <article className="group relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={card.media.url}
                  alt={card.media.alt ?? card.heading}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  className="object-cover transition-transform duration-700 ease-fluid group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-start justify-end gap-2 p-6 text-white md:p-8">
                  {card.eyebrow && (
                    <span className="text-xs font-bold uppercase tracking-[0.2em]">{card.eyebrow}</span>
                  )}
                  <h3 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
                    {card.heading}
                  </h3>
                  {card.subheading && (
                    <p className="max-w-xs text-sm text-white/85">{card.subheading}</p>
                  )}
                  {card.cta && (
                    <Link
                      href={card.cta.href}
                      className={cn(
                        "mt-2",
                        buttonVariants({ variant: card.cta.variant === "solid" ? "gold" : "outline", size: "md" }),
                        card.cta.variant !== "solid" && "border-white/70 text-white hover:bg-white hover:text-black",
                      )}
                    >
                      {card.cta.label}
                    </Link>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
