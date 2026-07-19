"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@ecom/ui";

/**
 * Back-in-stock capture shown in place of "Add to Bag" when the selected size
 * is sold out (Fashion-Nova's bell flow). Emails the shopper when the variant
 * is restocked (admin sends from /admin/restock).
 */
export function RestockNotify({
  productHandle,
  productTitle,
  variantId,
  size,
  colorName,
}: {
  productHandle: string;
  productTitle: string;
  variantId: string;
  size: string;
  colorName: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Reset when the shopper picks a different sold-out variant.
  useEffect(() => {
    setStatus("idle");
    setError(null);
  }, [variantId]);

  const submit = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/restock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productHandle, productTitle, variantId, size, email }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Couldn't sign you up — try again.");
      }
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  };

  if (status === "done") {
    return (
      <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/5 px-4 py-3 text-sm text-foreground">
        <Check className="h-4 w-4 text-accent" />
        We&rsquo;ll email you when {colorName} / {size} is back.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Bell className="h-4 w-4" /> Sold out in {colorName} / {size} — get notified when it&rsquo;s back.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="you@email.com"
          aria-label="Email for restock notification"
          className="h-12 flex-1 rounded-full border border-input bg-card px-4 text-sm outline-none focus-visible:border-foreground"
        />
        <Button
          variant="solid"
          className="h-12 shrink-0 rounded-full px-6 text-sm"
          disabled={status === "loading"}
          onClick={submit}
        >
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : "Notify me"}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
