"use client";

import { useMemo } from "react";

export interface Country {
  code: string; // ISO
  name: string;
  dial: string; // e.g. +880
  flag: string;
}

// Curated list — Bangladesh first (default), then common markets.
export const COUNTRIES: Country[] = [
  { code: "BD", name: "Bangladesh", dial: "+880", flag: "🇧🇩" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳" },
  { code: "PK", name: "Pakistan", dial: "+92", flag: "🇵🇰" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧" },
  { code: "AE", name: "UAE", dial: "+971", flag: "🇦🇪" },
  { code: "SA", name: "Saudi Arabia", dial: "+966", flag: "🇸🇦" },
  { code: "MY", name: "Malaysia", dial: "+60", flag: "🇲🇾" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦" },
];

const DEFAULT_DIAL = "+880";

/** Split an E.164 value into a known dial code + national digits. */
function split(value: string): { dial: string; national: string } {
  const v = (value || "").trim();
  const match = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => v.startsWith(c.dial));
  if (match) return { dial: match.dial, national: v.slice(match.dial.length).replace(/\D/g, "") };
  return { dial: DEFAULT_DIAL, national: v.replace(/\D/g, "") };
}

/** International phone field → emits E.164 (`+<dial><national>`). Default Bangladesh. */
export function PhoneInput({
  value,
  onChange,
  className,
  autoFocus,
}: {
  value: string;
  onChange: (e164: string) => void;
  className?: string;
  autoFocus?: boolean;
}) {
  const { dial, national } = useMemo(() => split(value), [value]);

  const emit = (d: string, n: string) => {
    const digits = n.replace(/\D/g, "").replace(/^0+/, ""); // strip leading zeros from national
    onChange(digits ? `${d}${digits}` : "");
  };

  return (
    <div className={`flex h-12 w-full overflow-hidden rounded-sm border border-input bg-card focus-within:border-foreground focus-within:ring-1 focus-within:ring-ring ${className ?? ""}`}>
      <select
        aria-label="Country code"
        value={dial}
        onChange={(e) => emit(e.target.value, national)}
        className="cursor-pointer border-r border-input bg-card px-2 text-sm outline-none"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.dial}>
            {c.flag} {c.dial}
          </option>
        ))}
      </select>
      <input
        type="tel"
        inputMode="tel"
        autoFocus={autoFocus}
        value={national}
        onChange={(e) => emit(dial, e.target.value)}
        placeholder="1XXXXXXXXX"
        className="min-w-0 flex-1 bg-card px-3 text-sm outline-none"
        autoComplete="tel-national"
      />
    </div>
  );
}
