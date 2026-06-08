"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@ecom/ui";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

/** shadcn-style date picker (calendar popover) — no extra deps. */
export function DatePicker({
  label,
  value,
  onChange,
  required,
  placeholder = "Pick a date",
}: {
  label?: string;
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseYmd(value);
  const [viewed, setViewed] = useState<Date>(selected ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const year = viewed.getFullYear();
  const month = viewed.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

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
          <span className={cn(!selected && "text-muted-foreground/60")}>
            {selected ? selected.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : placeholder}
          </span>
          <Calendar className="h-4 w-4 opacity-60" />
        </button>

        {open && (
          <div className="absolute z-30 mt-1 w-72 rounded-md border border-border bg-card p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" aria-label="Previous month" onClick={() => setViewed(new Date(year, month - 1, 1))} className="rounded-sm p-1 hover:bg-muted">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{MONTHS[month]} {year}</span>
              <button type="button" aria-label="Next month" onClick={() => setViewed(new Date(year, month + 1, 1))} className="rounded-sm p-1 hover:bg-muted">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-0.5 text-center text-[0.65rem] font-semibold uppercase text-muted-foreground">
              {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (day === null) return <span key={i} />;
                const d = new Date(year, month, day);
                const isSel = selected && ymd(d) === ymd(selected);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { onChange(ymd(d)); setOpen(false); }}
                    className={cn(
                      "h-8 rounded-sm text-sm hover:bg-muted",
                      isSel && "bg-foreground font-semibold text-background hover:bg-foreground",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
            {value && (
              <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="mt-2 w-full rounded-sm py-1.5 text-xs text-muted-foreground hover:bg-muted">
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
