import Link from "next/link";
import { buttonVariants, Container, cn } from "@ecom/ui";
import type { BannerConfig } from "@ecom/cms";

const themeCls: Record<NonNullable<BannerConfig["theme"]>, string> = {
  light: "bg-muted text-foreground",
  dark: "bg-ink text-primary-foreground",
  gold: "bg-accent text-accent-foreground",
};

export function Banner({ config }: { config: BannerConfig }) {
  return (
    <section className="py-6">
      <Container>
        <div
          className={cn(
            "flex flex-col items-center gap-4 rounded-lg px-6 py-12 text-center md:flex-row md:justify-between md:text-left",
            themeCls[config.theme],
          )}
          style={
            config.media
              ? { backgroundImage: `url(${config.media.url})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          <h2 className="font-display text-2xl font-bold tracking-tight md:max-w-2xl md:text-3xl">
            {config.heading}
          </h2>
          {config.cta && (
            <Link
              href={config.cta.href}
              className={cn(
                "shrink-0",
                buttonVariants({ variant: config.theme === "gold" ? "solid" : "gold", size: "lg" }),
              )}
            >
              {config.cta.label}
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}
