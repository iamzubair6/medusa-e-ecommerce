"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Ruler, X } from "lucide-react";
import { Button, cn } from "@ecom/ui";
import type { SizeGuide } from "@/lib/size-guides";

type Fit = "snug" | "regular" | "relaxed";

/** Parse "28-30" / "32" → [min, max] in the stored unit (inches). */
function range(value: string): [number, number] | null {
  const nums = value.match(/\d+(\.\d+)?/g)?.map(Number);
  if (!nums || nums.length === 0) return null;
  return [nums[0]!, nums[nums.length - 1]!];
}

/**
 * Recommend a size from a structured guide's measurement table. Each answered
 * body measurement scores the rows; the size that best fits all measurements
 * wins, nudged by the shopper's fit preference on ties/gaps.
 */
function recommend(guide: SizeGuide, inputs: Record<number, number>, fit: Fit): string | null {
  const answered = Object.entries(inputs).filter(([, v]) => v > 0);
  if (answered.length === 0) return null;

  let best: { size: string; score: number; slack: number } | null = null;
  for (const row of guide.rows) {
    let score = 0;
    let slack = 0; // distance to the size when not an exact containment
    for (const [colStr, value] of answered) {
      const col = Number(colStr);
      const r = range(row.values[col] ?? "");
      if (!r) continue;
      const [min, max] = r;
      if (value >= min && value <= max) score += 1;
      else slack += value < min ? min - value : value - max;
    }
    const cand = { size: row.size, score, slack };
    if (!best || cand.score > best.score || (cand.score === best.score && cand.slack < best.slack)) {
      best = cand;
    }
  }
  if (!best) return null;

  // Fit nudge: snug → prefer one smaller, relaxed → one larger (when it exists).
  const idx = guide.rows.findIndex((r) => r.size === best!.size);
  if (fit === "snug" && idx > 0) return guide.rows[idx - 1]!.size;
  if (fit === "relaxed" && idx < guide.rows.length - 1) return guide.rows[idx + 1]!.size;
  return best.size;
}

export function FindMySize({ guide }: { guide: SizeGuide }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [inputs, setInputs] = useState<Record<number, number>>({});
  const [fit, setFit] = useState<Fit>("regular");
  const [result, setResult] = useState<string | null | undefined>(undefined);

  // The body-measurement columns (skip an "inseam"-style length column heuristically).
  const cols = guide.columns.map((label, i) => ({ label, i })).filter((c) => !/inseam|length/i.test(c.label));

  const compute = () => {
    const inches: Record<number, number> = {};
    for (const [k, v] of Object.entries(inputs)) inches[Number(k)] = unit === "cm" ? v / 2.54 : v;
    setResult(recommend(guide, inches, fit));
  };

  const reset = () => {
    setInputs({});
    setFit("regular");
    setResult(undefined);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        <Ruler className="h-3.5 w-3.5" /> Find my size
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              role="dialog"
              aria-label="Find my size"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
            >
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="font-display text-lg font-bold">Find my size</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your body measurements — we&rsquo;ll suggest the best size for the {guide.title.replace(/ size guide/i, "")}.
              </p>

              {result === undefined ? (
                <div className="mt-5 flex flex-col gap-4">
                  <div className="flex justify-end">
                    <div className="flex overflow-hidden rounded-md border border-border text-xs font-semibold">
                      {(["in", "cm"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setUnit(u)}
                          aria-pressed={unit === u}
                          className={cn("px-3 py-1", unit === u ? "bg-foreground text-background" : "hover:bg-muted")}
                        >
                          {u === "in" ? "in." : "cm"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {cols.map((c) => (
                    <label key={c.i} className="flex items-center justify-between gap-3 text-sm">
                      <span>{c.label.replace(/\(.*\)/, "").trim()}</span>
                      <span className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={inputs[c.i] ?? ""}
                          onChange={(e) => setInputs((p) => ({ ...p, [c.i]: Number(e.target.value) }))}
                          className="h-10 w-24 rounded-sm border border-input bg-card px-3 text-sm"
                        />
                        <span className="text-xs text-muted-foreground">{unit}</span>
                      </span>
                    </label>
                  ))}
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preferred fit</span>
                    <div className="mt-2 flex gap-2">
                      {(["snug", "regular", "relaxed"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFit(f)}
                          aria-pressed={fit === f}
                          className={cn(
                            "flex-1 rounded-sm border px-3 py-2 text-sm capitalize transition-colors motion-reduce:transition-none",
                            fit === f ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                          )}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="solid" onClick={compute} className="w-full">
                    Get my size
                  </Button>
                </div>
              ) : result ? (
                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  <p className="text-sm text-muted-foreground">Your recommended size</p>
                  <p className="font-display text-5xl font-bold">{result}</p>
                  <p className="text-xs text-muted-foreground">Based on your measurements and a {fit} fit.</p>
                  <Button variant="outline" onClick={reset} className="mt-2">
                    Try again
                  </Button>
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  <p className="text-sm">We couldn&rsquo;t match a size — try the full size guide.</p>
                  <Button variant="outline" onClick={reset}>
                    Back
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
