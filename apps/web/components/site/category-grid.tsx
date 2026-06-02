import Link from "next/link";
import Image from "next/image";
import { Container, Reveal, cn } from "@ecom/ui";
import type { CategoryGridConfig } from "@ecom/cms";

const columnsCls: Record<number, string> = {
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
};

export function CategoryGrid({ config }: { config: CategoryGridConfig }) {
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
        <div className={cn("grid grid-cols-2 gap-4", columnsCls[config.columns])}>
          {config.tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={tile.media.url}
                alt={tile.media.alt ?? tile.label}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-700 ease-fluid group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <span className="absolute bottom-4 left-4 font-display text-lg font-bold text-white">
                {tile.label}
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
