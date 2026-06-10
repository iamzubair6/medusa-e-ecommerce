"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@ecom/ui";

export interface ComboOption {
  value: string;
  label: string;
}

/** shadcn-style searchable combobox (single select) — no extra deps. */
export function Combobox({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "Select…",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [query, options]);

  return (
    <div className="flex flex-col gap-2" ref={ref}>
      {label && (
        <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-12 w-full items-center justify-between rounded-sm border border-input bg-card/60 px-3.5 text-sm transition-colors hover:border-foreground/40 focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground/60")}>{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-full rounded-md border border-border bg-card shadow-xl">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 opacity-50" />
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
            </div>
            <div className="max-h-60 overflow-y-auto p-1">
              {filtered.length === 0 && <p className="px-3 py-2 text-sm text-muted-foreground">No matches.</p>}
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-muted",
                    o.value === value && "bg-muted/60",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                  {o.value === value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Type-narrowing wrapper around {@link Combobox} for fixed string-union enums
 * (e.g. RHF fields like `"video" | "carousel"`). Emits the literal union type
 * instead of a raw `string`, so it bridges to `setValue(name, value, …)`
 * without unsafe casts.
 */
export function EnumCombobox<T extends string>({
  label,
  value,
  onChange,
  options,
  required,
  placeholder,
}: {
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <Combobox
      label={label}
      value={value}
      required={required}
      placeholder={placeholder}
      options={options.map((o) => ({ value: o.value, label: o.label }))}
      onChange={(v) => {
        const match = options.find((o) => o.value === v);
        if (match) onChange(match.value);
      }}
    />
  );
}
