"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@ecom/ui";
import { toCm, type SizeGuide } from "@/lib/size-guides";

const isHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

/**
 * Fashion-Nova-style size guide modal. Prefers a structured `guide`
 * (How-It-Fits bar → Fit Reference photos → Measurements with an in./cm
 * toggle → How To Measure); falls back to the per-product/global rich-text
 * `content` when no structured guide matches. Sections without data hide.
 */
export function SizeGuideModal({
  open,
  onClose,
  guide,
  content,
}: {
  open: boolean;
  onClose: () => void;
  guide?: SizeGuide;
  content?: string;
}) {
  const reduce = useReducedMotion();
  const [unit, setUnit] = useState<"in" | "cm">("in");

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={guide?.title ?? "Size guide"}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          >
            {/* sticky header, FN style */}
            <div className="relative border-b border-border px-6 py-4 text-center">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">
                {guide?.title ?? "Size Guide"}
              </h2>
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5">
              {guide ? (
                <div className="flex flex-col gap-7">
                  {/* How It Fits */}
                  <section>
                    <h3 className="font-display text-base font-bold">How It Fits</h3>
                    <p className="mt-3 text-sm font-semibold">What Customers are Saying</p>
                    <div className="mt-2.5 flex gap-1.5" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1.5 flex-1 rounded-full",
                            i === guide.fitFeedback - 1 ? "bg-foreground" : "bg-muted",
                          )}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex justify-between text-sm">
                      <span className={cn(guide.fitFeedback <= 2 && "font-semibold")}>Small</span>
                      <span className={cn(guide.fitFeedback === 3 && "font-semibold")}>True to size</span>
                      <span className={cn(guide.fitFeedback >= 4 && "font-semibold")}>Large</span>
                    </div>
                  </section>

                  {/* Fit Reference Guide */}
                  {guide.fitReference.filter((f) => f.image).length > 0 && (
                    <section>
                      <h3 className="font-display text-base font-bold">Fit Reference Guide</h3>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {guide.fitReference
                          .filter((f) => f.image)
                          .map((f) => (
                            <figure key={`${f.label}-${f.image}`} className="text-center">
                              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-muted">
                                <Image src={f.image} alt={f.label} fill sizes="150px" className="object-cover" />
                              </div>
                              <figcaption className="mt-2">
                                <p className="text-xs font-bold uppercase tracking-wide">{f.label}</p>
                                {f.caption && (
                                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{f.caption}</p>
                                )}
                              </figcaption>
                            </figure>
                          ))}
                      </div>
                    </section>
                  )}

                  {/* Measurements */}
                  {guide.rows.length > 0 && (
                    <section>
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-base font-bold">Measurements</h3>
                        <div
                          className="flex overflow-hidden rounded-md border border-border text-xs font-semibold"
                          role="group"
                          aria-label="Units"
                        >
                          {(["in", "cm"] as const).map((u) => (
                            <button
                              key={u}
                              type="button"
                              onClick={() => setUnit(u)}
                              aria-pressed={unit === u}
                              className={cn(
                                "cursor-pointer px-3.5 py-1.5 transition-colors motion-reduce:transition-none",
                                unit === u ? "bg-foreground text-background" : "hover:bg-muted",
                              )}
                            >
                              {u === "in" ? "in." : "cm"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/50 text-left">
                            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                              <th>Size</th>
                              {guide.columns.map((c) => (
                                <th key={c}>{unit === "cm" ? c.replace(/\(in\)/i, "(cm)") : c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {guide.rows.map((r) => (
                              <tr key={r.size} className="border-t border-border [&>td]:px-3 [&>td]:py-2.5">
                                <td className="font-semibold">{r.size}</td>
                                {guide.columns.map((c, i) => (
                                  <td key={c} className="text-muted-foreground">
                                    {unit === "cm" ? toCm(r.values[i] ?? "") : (r.values[i] ?? "")}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  )}

                  {/* How to Measure */}
                  {(guide.measureImage || guide.measurePoints.length > 0) && (
                    <section>
                      <h3 className="font-display text-base font-bold">How to Measure</h3>
                      {guide.measureImage && (
                        <div className="relative mx-auto mt-3 aspect-[3/4] w-56 overflow-hidden rounded-md bg-muted">
                          <Image src={guide.measureImage} alt="" fill sizes="224px" className="object-cover" />
                        </div>
                      )}
                      {guide.measurePoints.length > 0 && (
                        <ol className="mt-4 space-y-3">
                          {guide.measurePoints.map((p, i) => (
                            <li key={p.label} className="flex gap-3 text-sm">
                              <span
                                aria-hidden
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.65rem] font-bold text-background"
                              >
                                {i + 1}
                              </span>
                              <p>
                                <strong>{p.label}</strong>
                                <span className="block text-muted-foreground">{p.text}</span>
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>
                  )}
                </div>
              ) : content && content.trim() ? (
                isHtml(content) ? (
                  <div
                    className="prose-pdp text-sm leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1.5"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{content}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  No size guide available for this product yet.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
