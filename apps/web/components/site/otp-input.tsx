"use client";

import { useRef } from "react";
import { cn } from "@ecom/ui";

/** Individual-box OTP input (auto-advance, backspace, paste). */
export function OtpInput({
  value,
  onChange,
  length = 4,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  length?: number;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const setAt = (i: number, d: string) => {
    const next = value.padEnd(length, " ").split("");
    next[i] = d || " ";
    onChange(next.join("").replace(/\s/g, ""));
  };

  return (
    <div className="flex justify-center gap-2">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          value={digits[i]!.trim()}
          onChange={(e) => {
            const d = e.target.value.replace(/\D/g, "").slice(-1);
            setAt(i, d);
            if (d && i < length - 1) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !digits[i]!.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
            if (pasted) {
              onChange(pasted);
              refs.current[Math.min(pasted.length, length - 1)]?.focus();
            }
          }}
          className={cn(
            "h-14 w-12 rounded-sm border border-input bg-card text-center text-2xl font-semibold outline-none focus:border-foreground focus:ring-1 focus:ring-ring",
          )}
        />
      ))}
    </div>
  );
}
