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

type Trigger = "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";

interface PromoPopupProps {
  id: string;
  trigger: Trigger;
  config: PopupConfig;
}

const emailSchema = z.object({ email: z.string().email("Enter a valid email") });
type EmailValues = z.infer<typeof emailSchema>;

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
  const reduce = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  useEffect(() => {
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
  }, [id, trigger, config.delayMs, config.scrollPercent, config.frequencyDays]);

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
      body: JSON.stringify({ email: values.email, source: "popup" }),
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
            className="relative z-10 w-full max-w-md overflow-hidden rounded-lg bg-card shadow-2xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={dismiss}
              className="absolute right-3 top-3 z-10 cursor-pointer rounded-full bg-background/70 p-1.5 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
            {config.media && (
              <div className="relative h-40 w-full">
                <Image src={config.media.url} alt="" fill className="object-cover" />
              </div>
            )}
            <div className="flex flex-col gap-4 p-6 text-center">
              <h2 className="font-display text-2xl font-bold tracking-tight">{config.heading}</h2>
              {config.body && <p className="text-sm text-muted-foreground">{config.body}</p>}

              {config.captureEmail ? (
                done ? (
                  <p className="text-sm font-medium text-gold">You&apos;re in. Check your inbox!</p>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      aria-label="Email address"
                      error={errors.email?.message}
                      {...register("email")}
                    />
                    <Button type="submit" variant="gold" loading={isSubmitting}>
                      {config.cta?.label ?? "Subscribe"}
                    </Button>
                  </form>
                )
              ) : (
                <Button variant="gold" onClick={dismiss}>
                  {config.cta?.label ?? "Shop now"}
                </Button>
              )}

              <button
                type="button"
                onClick={dismiss}
                className="cursor-pointer text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground"
              >
                {config.dismissLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
