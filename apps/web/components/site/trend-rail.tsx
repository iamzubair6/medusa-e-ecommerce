import Link from "next/link";
import Image from "next/image";
import { Container, Reveal } from "@ecom/ui";
import type { TrendRailConfig } from "@ecom/cms";

/** Horizontally-scrolling rail of tall labeled image cards (snap-scroll). */
export function TrendRail({ config }: { config: TrendRailConfig }) {
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
      </Container>
      <Container>
        <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {config.cards.map((card, i) => (
            <Link
              key={`${card.href}-${i}`}
              href={card.href}
              className="group relative aspect-[3/5] w-[58%] shrink-0 snap-start overflow-hidden rounded-lg bg-muted sm:w-[38%] md:w-[26%] lg:w-[20%]"
            >
              <Image
                src={card.media.url}
                alt={card.media.alt ?? card.label}
                fill
                sizes="(max-width: 640px) 58vw, (max-width: 1024px) 26vw, 20vw"
                className="object-cover transition-transform duration-700 ease-fluid group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
              <span className="absolute bottom-4 left-4 right-4 font-display text-lg font-bold leading-tight text-white">
                {card.label}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
