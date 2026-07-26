"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Tap-to-copy promo code chip for the Offers page / account offers. */
export function OfferCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the code is still visible to type */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy code ${code}`}
      className="flex cursor-pointer items-center gap-2 rounded-sm border border-dashed border-gold/70 bg-gold/5 px-3 py-1.5 font-mono text-sm font-bold tracking-widest text-gold transition-colors hover:bg-gold/10"
    >
      {code}
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
