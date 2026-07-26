"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { Button, Input } from "@ecom/ui";
import type { PopupConfig } from "@ecom/cms";
import { CONSENT_EVENT, getConsent } from "./cookie-consent";

type Trigger = "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";

interface PromoPopupProps {
  id: string;
  trigger: Trigger;
  config: PopupConfig;
}

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
type EmailValues = z.infer<typeof emailSchema>;

const PREFS = ["Women", "Men", "Curve", "Kids", "Beauty"];

const storageKey = (id: string) => `popup:${id}:dismissedAt`;

function recentlyDismissed(id: string, frequencyDays: number): boolean {
  if (frequencyDays <= 0) return false;
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return false;
    const elapsed = Date.now() - Number(raw);
    return elapsed < frequencyDays * 86_400_000;
  } catch {
    return false;
  }
}

export function PromoPopup({ id, trigger, config }: PromoPopupProps) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [prefs, setPrefs] = useState<Set<string>>(new Set());
  const [consent, setConsent] = useState(true);
  // Only show after the first-visit phone popup is resolved (verify OR skip).
  const [ready, setReady] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Marketing popup: needs cookie consent ("essential only" suppresses it),
    // then waits for the first-visit phone popup to resolve.
    const armAfterPhone = () => {
      if (localStorage.getItem("maison_phone_prompt") === "done") {
        setReady(true);
        return undefined;
      }
      const on = () => setReady(true);
      window.addEventListener("maison:phone-resolved", on, { once: true });
      return () => window.removeEventListener("maison:phone-resolved", on);
    };
    const choice = getConsent();
    if (choice === "all") return armAfterPhone();
    if (choice === "essential") return;
    let inner: (() => void) | undefined;
    const onConsent = (e: Event) => {
      if ((e as CustomEvent).detail === "all") inner = armAfterPhone();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
      inner?.();
    };
  }, []);

  const togglePref = (p: string) =>
    setPrefs((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  useEffect(() => {
    if (!ready) return;
    if (recentlyDismissed(id, config.frequencyDays)) return;
    let cleanup: (() => void) | undefined;

    if (trigger === "IMMEDIATE") {
      setOpen(true);
    } else if (trigger === "TIMER") {
      const t = setTimeout(() => setOpen(true), config.delayMs);
      cleanup = () => clearTimeout(t);
    } else if (trigger === "SCROLL") {
      const onScroll = () => {
        const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (pct >= config.scrollPercent) setOpen(true);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      cleanup = () => window.removeEventListener("scroll", onScroll);
    } else if (trigger === "EXIT_INTENT") {
      const onLeave = (e: MouseEvent) => {
        if (e.clientY <= 0) setOpen(true);
      };
      document.addEventListener("mouseout", onLeave);
      cleanup = () => document.removeEventListener("mouseout", onLeave);
    }
    return cleanup;
  }, [ready, id, trigger, config.delayMs, config.scrollPercent, config.frequencyDays]);

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey(id), String(Date.now()));
    } catch {
      /* ignore storage failures */
    }
  };

  const onSubmit = async (values: EmailValues) => {
    await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: values.email,
        source: "popup",
        capturedFields: { preferences: [...prefs], consent },
      }),
    });
    setDone(true);
    setTimeout(dismiss, 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={dismiss} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={config.heading}
            initial={reduce ? false : { scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={reduce ? undefined : { scale: 0.95, y: 12, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 grid w-full max-w-3xl grid-cols-1 overflow-hidden rounded-lg bg-card shadow-2xl md:grid-cols-2"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={dismiss}
              className="absolute right-3 top-3 z-10 cursor-pointer rounded-full bg-background/70 p-1.5 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative h-44 w-full md:h-auto md:min-h-[440px]">
              <Image
                src={config.media?.url ?? "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&h=800&q=80"}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 384px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col justify-center gap-4 p-7 text-center md:p-9">
              <span className="font-display text-xl font-bold uppercase tracking-[0.1em]">MAISON</span>
              <div>
                <h2 className="font-display text-3xl font-bold uppercase leading-tight tracking-tight">
                  {config.heading}
                </h2>
                {config.body && <p className="mt-1 text-sm text-muted-foreground">{config.body}</p>}
              </div>

              {config.captureEmail ? (
                done ? (
                  <p className="py-4 text-sm font-medium text-accent">You&apos;re in. Check your inbox!</p>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                    {/* preferences */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
                        Choose your preferences
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {PREFS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            aria-pressed={prefs.has(p)}
                            onClick={() => togglePref(p)}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                              prefs.has(p)
                                ? "border-foreground bg-foreground text-background"
                                : "border-border hover:border-foreground"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Input
                      type="email"
                      placeholder="you@email.com"
                      aria-label="Email address"
                      error={errors.email?.message}
                      {...register("email")}
                    />

                    <label className="flex cursor-pointer items-start gap-2 text-left text-[0.7rem] leading-snug text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-3.5 w-3.5 accent-[hsl(var(--accent))]"
                      />
                      <span>
                        Yes! Sign me up for email updates. I agree to the Terms of Service and Privacy Policy.
                      </span>
                    </label>

                    <Button type="submit" variant="solid" loading={isSubmitting} className="rounded-full">
                      {config.cta?.label ?? "I Love Saving Money!"}
                    </Button>
                  </form>
                )
              ) : (
                <Button variant="solid" onClick={dismiss} className="rounded-full">
                  {config.cta?.label ?? "Shop now"}
                </Button>
              )}

              <button
                type="button"
                onClick={dismiss}
                className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground underline-offset-2 hover:underline"
              >
                {config.dismissLabel || "I'll pay full price"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
