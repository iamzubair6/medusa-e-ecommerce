"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buttonVariants, Container, cn } from "@ecom/ui";
import type { CountdownConfig } from "@ecom/cms";

const themeCls: Record<NonNullable<CountdownConfig["theme"]>, string> = {
  light: "bg-muted text-foreground",
  dark: "bg-ink text-primary-foreground",
  claret: "bg-accent text-accent-foreground",
};

interface Remaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function diff(target: number): Remaining | null {
  const ms = target - Date.now();
  if (ms <= 0) return null;
  const total = Math.floor(ms / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function Unit({ value, label, onLight }: { value: string; label: string; onLight: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "min-w-[2.6rem] rounded-md px-2 py-1.5 text-center font-display text-2xl font-bold tabular-nums md:text-3xl",
          onLight ? "bg-foreground/10" : "bg-white/15",
        )}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.18em] opacity-75">{label}</span>
    </div>
  );
}

/**
 * Urgency sale banner with a live ticking countdown to `endsAt`. Once elapsed,
 * the timer is replaced by the heading alone (still rendered for SSR/no-JS).
 */
export function Countdown({ config }: { config: CountdownConfig }) {
  const target = new Date(config.endsAt).getTime();
  const onLight = config.theme === "light";
  // Start null so SSR and the first client render agree (avoids hydration drift);
  // the interval fills it in immediately on mount.
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setRemaining(diff(target));
    const t = setInterval(() => setRemaining(diff(target)), 1000);
    return () => clearInterval(t);
  }, [target]);

  const live = mounted && remaining !== null;

  return (
    <section className="py-6">
      <Container>
        <div
          className={cn(
            "flex flex-col items-center gap-5 rounded-lg px-6 py-10 text-center",
            themeCls[config.theme],
          )}
        >
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">{config.heading}</h2>
            {config.subheading && (
              <p className={cn("text-sm", onLight ? "text-muted-foreground" : "opacity-80")}>
                {config.subheading}
              </p>
            )}
          </div>

          {live && remaining && (
            <div className="flex items-end gap-3 md:gap-4" role="timer" aria-live="off">
              <Unit value={pad(remaining.days)} label="Days" onLight={onLight} />
              <Unit value={pad(remaining.hours)} label="Hrs" onLight={onLight} />
              <Unit value={pad(remaining.minutes)} label="Min" onLight={onLight} />
              <Unit value={pad(remaining.seconds)} label="Sec" onLight={onLight} />
            </div>
          )}

          {config.cta && (
            <Link
              href={config.cta.href}
              className={cn(
                buttonVariants({ variant: onLight ? "solid" : "gold", size: "lg" }),
                config.theme === "claret" && "bg-white text-black hover:bg-white/90",
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
