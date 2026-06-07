"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { Container, cn } from "@ecom/ui";

export interface BrandSlide {
  image: string;
  eyebrow?: string;
  title: string;
  href: string;
  cta?: string;
}

/** Full-width, full-height auto-advancing collab/video carousel (Fashion-Nova style). */
export function BrandCarousel({ slides, intervalMs = 5000 }: { slides: BrandSlide[]; intervalMs?: number }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const n = slides.length;

  useEffect(() => {
    if (reduce || n <= 1) return;
    const t = setInterval(() => setI((p) => (p + 1) % n), intervalMs);
    return () => clearInterval(t);
  }, [reduce, n, intervalMs]);

  if (n === 0) return null;

  return (
    <section className="relative h-[460px] w-full overflow-hidden bg-ink md:h-[560px]">
      {slides.map((s, idx) => (
        <div
          key={s.image + idx}
          className={cn("absolute inset-0 transition-opacity duration-700", idx === i ? "opacity-100" : "opacity-0")}
          aria-hidden={idx !== i}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={s.image} alt={s.title} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/55 to-transparent" />
        </div>
      ))}

      <Container className="relative flex h-full flex-col justify-center gap-3 text-white">
        {slides[i]!.eyebrow && <p className="text-sm font-bold uppercase tracking-[0.2em]">{slides[i]!.eyebrow}</p>}
        <h2 className="max-w-xl font-display text-4xl font-black uppercase leading-none md:text-6xl">{slides[i]!.title}</h2>
        <div>
          <Link href={slides[i]!.href} className="mt-2 inline-block rounded-full bg-white px-8 py-3 text-xs font-bold uppercase tracking-wide text-black transition hover:bg-white/90">
            {slides[i]!.cta ?? "Shop Now"}
          </Link>
        </div>
      </Container>

      {n > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn("h-2 rounded-full transition-all", idx === i ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80")}
            />
          ))}
        </div>
      )}
    </section>
  );
}
