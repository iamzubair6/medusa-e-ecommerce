import Link from "next/link";
import Image from "next/image";
import { buttonVariants, Container, Reveal, cn } from "@ecom/ui";
import type { EditorialConfig } from "@ecom/cms";

export function Editorial({ config }: { config: EditorialConfig }) {
  return (
    <section className="py-12 md:py-16">
      <Container>
        <div
          className={cn(
            "grid items-center gap-8 md:grid-cols-2",
            config.imageSide === "right" && "md:[&>*:first-child]:order-2",
          )}
        >
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <Image
              src={config.media.url}
              alt={config.media.alt ?? config.heading}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <Reveal className="flex flex-col gap-4">
            {config.eyebrow && (
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
                {config.eyebrow}
              </span>
            )}
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              {config.heading}
            </h2>
            {config.body && <p className="max-w-md text-muted-foreground">{config.body}</p>}
            {config.cta && (
              <Link
                href={config.cta.href}
                className={cn("mt-2 w-fit", buttonVariants({ variant: "outline", size: "md" }))}
              >
                {config.cta.label}
              </Link>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
