"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Cookie } from "lucide-react";
import { Button } from "@ecom/ui";

export const CONSENT_KEY = "maison_consent";
export const CONSENT_EVENT = "maison:consent";
export type ConsentChoice = "all" | "essential";

/** The visitor's stored choice, or null before they've decided. */
export function getConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === "all" || v === "essential" ? v : null;
}

/**
 * Cookie/marketing consent (#134): shown once, site-wide, until a choice is
 * made. "Accept" allows marketing capture (phone/email popups); "Essential
 * only" keeps the store fully working but suppresses marketing popups.
 */
export function CookieConsent() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setOpen(true);
  }, []);

  const choose = (choice: ConsentChoice) => {
    localStorage.setItem(CONSENT_KEY, choice);
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          role="region"
          aria-label="Cookie preferences"
          initial={reduce ? false : { y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduce ? undefined : { y: 24, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-md rounded-lg border border-border bg-card p-5 shadow-2xl sm:left-6 sm:right-auto sm:mx-0"
        >
          <p className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide">
            <Cookie className="h-4 w-4 text-gold" /> Your privacy, your call
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            We use essential cookies to run the store (cart, sign-in) and, with your OK, a little
            memory for offers and updates. No third-party ad trackers — ever. Details in our{" "}
            <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
              privacy policy
            </Link>
            .
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="gold" onClick={() => choose("all")}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={() => choose("essential")}>
              Essential only
            </Button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
