"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button, cn } from "@ecom/ui";
import { useCart } from "@/hooks/use-cart";

/** Promo-code input + applied-code chips. Used in cart + checkout summaries. */
export function PromoCode() {
  const { cart, applyPromo, removePromo } = useCart();
  const [code, setCode] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    applyPromo.mutate(c, { onSuccess: () => setCode("") });
  };

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Promo code"
          aria-label="Promo code"
          className={cn(
            "h-10 flex-1 rounded-md border border-input bg-card px-3 text-sm uppercase",
            "placeholder:normal-case placeholder:text-muted-foreground/60",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        />
        <Button type="submit" variant="outline" size="sm" loading={applyPromo.isPending} disabled={!code.trim()}>
          Apply
        </Button>
      </form>
      {applyPromo.isError && (
        <p className="text-xs text-destructive">{(applyPromo.error as Error).message}</p>
      )}
      {cart?.promoCodes.map((c) => (
        <div key={c} className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-1.5 text-xs">
          <span className="font-semibold uppercase tracking-wide text-gold">{c}</span>
          <button
            type="button"
            aria-label={`Remove ${c}`}
            onClick={() => removePromo.mutate(c)}
            disabled={removePromo.isPending}
            className="cursor-pointer text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
