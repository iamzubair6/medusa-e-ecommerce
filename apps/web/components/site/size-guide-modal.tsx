"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

const ROWS = [
  { size: "XS", bust: "76–80", waist: "60–64", hips: "84–88" },
  { size: "S", bust: "81–85", waist: "65–69", hips: "89–93" },
  { size: "M", bust: "86–90", waist: "70–74", hips: "94–98" },
  { size: "L", bust: "91–96", waist: "75–80", hips: "99–104" },
  { size: "XL", bust: "97–103", waist: "81–87", hips: "105–111" },
  { size: "XXL", bust: "104–110", waist: "88–94", hips: "112–118" },
];

export function SizeGuideModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion();
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
            aria-label="Size guide"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl"
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="font-display text-xl font-bold">Size Guide</h2>
            <p className="mt-1 text-sm text-muted-foreground">Body measurements in centimetres. If you’re between sizes, size up for a relaxed fit.</p>
            <div className="mt-5 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-xs [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-muted-foreground">
                    <th>Size</th>
                    <th>Bust</th>
                    <th>Waist</th>
                    <th>Hips</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.size} className="border-t border-border [&>td]:px-3 [&>td]:py-2.5">
                      <td className="font-semibold">{r.size}</td>
                      <td className="text-muted-foreground">{r.bust}</td>
                      <td className="text-muted-foreground">{r.waist}</td>
                      <td className="text-muted-foreground">{r.hips}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              <strong className="text-foreground">How to measure:</strong> Bust — around the fullest part. Waist — the narrowest point. Hips — around the fullest part.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
