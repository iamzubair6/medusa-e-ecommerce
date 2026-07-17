"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Upload, X } from "lucide-react";
import { Skeleton } from "@ecom/ui";
import { useVisualSearch } from "@/lib/visual-search-context";

interface Result {
  productId: string;
  handle: string;
  title: string;
  thumbnail: string;
  price: string;
  score: number;
}

export function ShopSimilarModal() {
  const { open, mode, productId, refImage, close } = useVisualSearch();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Similar-to-product when opened from a PDP.
  useEffect(() => {
    if (!open) return;
    setError(null);
    setPreview(refImage ?? null);
    setResults([]);
    if (mode === "product" && productId) {
      setLoading(true);
      fetch(`/api/visual-search?productId=${encodeURIComponent(productId)}`)
        .then((r) => r.json())
        .then((d: { results?: Result[]; error?: string }) => {
          if (d.error) setError(d.error);
          setResults(d.results ?? []);
        })
        .catch(() => setError("Search failed"))
        .finally(() => setLoading(false));
    }
  }, [open, mode, productId, refImage]);

  const onFile = async (file: File) => {
    setError(null);
    setLoading(true);
    setPreview(URL.createObjectURL(file));
    try {
      // The server embeds the image with the SAME descriptor as the index —
      // computing vectors in the browser produced incomparable results.
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/visual-search", { method: "POST", body: fd });
      const d = (await res.json()) as { results?: Result[]; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Search failed");
      setResults(d.results ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50" onClick={close} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Shop Similar"
            initial={{ scale: 0.97, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 10, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h2 className="font-display text-lg font-bold uppercase tracking-wide">Shop Similar</h2>
                {results.length > 0 && (
                  <span className="text-xs text-muted-foreground">{results.length} items · most similar</span>
                )}
              </div>
              <button type="button" aria-label="Close" onClick={close} className="cursor-pointer p-1.5 hover:text-accent">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid flex-1 grid-cols-1 gap-5 overflow-y-auto p-5 sm:grid-cols-[180px_1fr]">
              {/* reference + upload */}
              <div className="flex flex-col gap-3">
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-muted">
                  {preview ? (
                    <Image src={preview} alt="Reference" fill sizes="180px" className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-center text-xs text-muted-foreground">
                      Upload an image to find similar styles
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-foreground py-2.5 text-xs font-semibold uppercase tracking-wide hover:bg-foreground hover:text-background"
                >
                  <Upload className="h-4 w-4" /> Upload Image
                </button>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>

              {/* results */}
              <div>
                {loading ? (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="aspect-[3/4]" />
                    ))}
                  </div>
                ) : results.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    {error ? "Couldn't search right now." : "No similar items yet — upload an image to start."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {results.map((r) => (
                      <Link key={r.productId} href={`/products/${r.handle}`} onClick={close} className="group">
                        <div className="relative aspect-[3/4] overflow-hidden rounded-sm bg-muted">
                          <Image src={r.thumbnail} alt={r.title} fill sizes="180px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                        </div>
                        <p className="mt-1.5 line-clamp-1 text-xs">{r.title}</p>
                        <p className="text-sm font-bold">{r.price}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
