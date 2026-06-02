"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, Container, cn } from "@ecom/ui";
import type { Cta, HeroConfig } from "@ecom/cms";

/** Renders a video OR carousel hero based on `config.mode`. Editorial overlay. */
export function Hero({ config }: { config: HeroConfig }) {
  return (
    <section className="grain relative h-[88vh] min-h-[600px] w-full overflow-hidden bg-ink text-[hsl(40_33%_94%)]">
      {config.mode === "video" ? <HeroVideo config={config} /> : <HeroCarousel config={config} />}
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/70 via-black/20 to-black/30" />
      <Overlay config={config} />
      <ScrollCue />
    </section>
  );
}

function ScrollCue() {
  return (
    <div className="absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex">
      <span className="text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-white/60">Scroll</span>
      <span className="h-10 w-px bg-gradient-to-b from-white/70 to-transparent" />
    </div>
  );
}

function Overlay({ config }: { config: HeroConfig }) {
  const reduce = useReducedMotion();
  const words = config.headline.split(" ");
  const alignCls = config.align === "center" ? "items-center text-center" : "items-start text-left";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-end pb-20 md:pb-24">
      <Container className={cn("flex flex-col gap-6", alignCls)}>
        {config.eyebrow && (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn("flex items-center gap-3", config.align === "center" && "justify-center")}
          >
            <span className="h-px w-8 bg-gold" />
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-soft">
              {config.eyebrow}
            </span>
          </motion.div>
        )}

        {/* Headline — staggered word reveal with overflow mask */}
        <h1 className="max-w-4xl font-display text-[clamp(2.75rem,8vw,6.5rem)] font-medium leading-[0.95] tracking-[-0.02em]">
          {words.map((word, i) => (
            <span key={i} className="mr-[0.25em] inline-block overflow-hidden align-bottom">
              <motion.span
                className="inline-block"
                initial={reduce ? false : { y: "110%" }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
              </motion.span>
            </span>
          ))}
        </h1>

        {config.subheadline && (
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 + words.length * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-md text-base text-white/75"
          >
            {config.subheadline}
          </motion.p>
        )}

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 + words.length * 0.08, ease: [0.22, 1, 0.36, 1] }}
          className={cn("pointer-events-auto mt-2 flex flex-wrap gap-3", config.align === "center" && "justify-center")}
        >
          {config.cta && <CtaButton cta={config.cta} variant="accent" />}
          {config.secondaryCta && <CtaButton cta={config.secondaryCta} variant="outline" />}
        </motion.div>
      </Container>
    </div>
  );
}

function CtaButton({ cta, variant }: { cta: Cta; variant: "accent" | "outline" }) {
  const resolved = cta.variant === "outline" ? "outline" : variant;
  return (
    <Button
      asChild
      variant={resolved}
      size="lg"
      className={resolved === "outline" ? "border-white/50 text-white hover:bg-white hover:text-ink" : undefined}
    >
      <Link href={cta.href}>{cta.label}</Link>
    </Button>
  );
}

function HeroVideo({ config }: { config: HeroConfig }) {
  const reduce = useReducedMotion();
  if (reduce && config.video?.poster) {
    return <Image src={config.video.poster} alt={config.headline} fill priority className="object-cover" />;
  }
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      poster={config.video?.poster}
      aria-label={config.headline}
    >
      {config.video && <source src={config.video.url} type="video/mp4" />}
    </video>
  );
}

function HeroCarousel({ config }: { config: HeroConfig }) {
  const slides = config.slides ?? [];
  const [index, setIndex] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), config.autoplayMs);
    return () => clearInterval(t);
  }, [reduce, slides.length, config.autoplayMs]);

  if (slides.length === 0) return null;

  return (
    <>
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <div className={cn("absolute inset-0", !reduce && "animate-kenburns")}>
            <Image
              src={slides[index]!.media.url}
              alt={slides[index]!.media.alt ?? config.headline}
              fill
              priority={index === 0}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 && (
        <div className="absolute bottom-8 right-6 z-20 flex gap-2 md:right-10">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-px cursor-pointer transition-all duration-500",
                i === index ? "w-12 bg-gold" : "w-6 bg-white/50 hover:bg-white/80",
              )}
            />
          ))}
        </div>
      )}
    </>
  );
}
