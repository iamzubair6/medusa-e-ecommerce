"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@ecom/ui";
import type { StoreProduct } from "@/lib/commerce";
import { ProductCard } from "./product-card";

interface QueryPart {
  label: string;
  cx: number;
  cy: number;
  box: { x: number; y: number; w: number; h: number };
}

const PART_NAMES: Record<string, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  outerwear: "Outerwear",
  shoes: "Shoes",
  bag: "Bag",
  accessory: "Accessory",
};

type Sort = "similar" | "price-asc" | "price-desc";
const priceNum = (p: StoreProduct) => Number(p.price.replace(/[^0-9.]/g, "")) || 0;

/**
 * Fashion-Nova "SHOP SIMILAR" modal on the PDP: the product photo with garment
 * dots + upload on the left (tap a dot to re-scope, or upload a different
 * photo), the ranked similar products on the right with size facets and a sort
 * control. Runs on the same self-hosted CLIP engine as the camera search — no
 * page navigation.
 */
export function ShopSimilarModal({
  open,
  onClose,
  productId,
  productTitle,
  queryImage,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  queryImage: string;
}) {
  const reduce = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [part, setPart] = useState<number | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [sizeFilter, setSizeFilter] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<Sort>("similar");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset when the modal opens for a different product.
  useEffect(() => {
    if (open) {
      setResourceId(null);
      setPart(null);
      setUploadedImage(null);
      setSizeFilter(new Set());
      setSort("similar");
      setError(null);
      dialogRef.current?.focus();
    }
  }, [open, productId]);

  // Close on Escape (keyboard operability).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Revoke any object URL created for an uploaded photo when it's replaced/unmounted.
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  // Fire-and-forget: build a query from the product photo so garment dots +
  // re-scoping become available (the grid already works without it).
  useEffect(() => {
    if (!open || resourceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/visual-search/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: queryImage }),
        });
        const data = (await res.json().catch(() => ({}))) as { resourceId?: string };
        if (!cancelled && data.resourceId) setResourceId(data.resourceId);
      } catch {
        /* dots are optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, resourceId, queryImage]);

  const meta = useQuery({
    queryKey: ["shop-similar-meta", resourceId],
    enabled: open && Boolean(resourceId),
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<{ parts: QueryPart[] }> => {
      const res = await fetch(`/api/visual-search/query/${resourceId}`, { signal });
      if (!res.ok) throw new Error("meta failed");
      return (await res.json()) as { parts: QueryPart[] };
    },
  });
  const parts = meta.data?.parts ?? [];

  // Grid: initially "similar to this product"; once a dot/upload sets a query,
  // ranked by that query/part vector.
  const initial = useQuery({
    queryKey: ["shop-similar-initial", productId],
    enabled: open,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<StoreProduct[]> => {
      const res = await fetch(`/api/products/similar?productId=${productId}`, { signal });
      if (!res.ok) throw new Error("similar failed");
      return ((await res.json()) as { products: StoreProduct[] }).products;
    },
  });

  // Use the query engine once a garment dot is selected OR the shopper uploaded
  // a different photo (whole-image results); otherwise show similars of THIS
  // product. This is what makes an uploaded photo actually change the grid.
  const usingQuery = Boolean(resourceId) && (part !== null || Boolean(uploadedImage));

  const scoped = useQuery({
    queryKey: ["shop-similar-scoped", resourceId, part],
    enabled: open && usingQuery,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<StoreProduct[]> => {
      const q = part !== null ? `?part=${part}` : "";
      const res = await fetch(`/api/visual-search/query/${resourceId}/results${q}`, { signal });
      if (!res.ok) throw new Error("results failed");
      return ((await res.json()) as { products: StoreProduct[] }).products;
    },
  });

  const baseProducts = usingQuery ? (scoped.data ?? []) : (initial.data ?? []);
  const loading = usingQuery ? scoped.isPending : initial.isPending;

  const allSizes = useMemo(() => {
    const s = new Set<string>();
    for (const p of baseProducts) for (const c of p.cardColors ?? []) for (const z of c.sizes) if (z.variantId) s.add(z.size);
    return [...s].sort((a, b) => (Number(a) || 0) - (Number(b) || 0) || a.localeCompare(b));
  }, [baseProducts]);

  const products = useMemo(() => {
    let list = baseProducts;
    if (sizeFilter.size > 0) {
      list = list.filter((p) => (p.cardColors ?? []).some((c) => c.sizes.some((z) => z.variantId && sizeFilter.has(z.size))));
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => priceNum(a) - priceNum(b));
    else if (sort === "price-desc") list = [...list].sort((a, b) => priceNum(b) - priceNum(a));
    return list;
  }, [baseProducts, sizeFilter, sort]);

  const uploadNew = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/visual-search/query", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { resourceId?: string; error?: string };
      if (!res.ok || !data.resourceId) throw new Error(data.error ?? "Search failed.");
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const objUrl = URL.createObjectURL(file);
      objectUrlRef.current = objUrl;
      setUploadedImage(objUrl);
      setResourceId(data.resourceId);
      setPart(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggleSize = (s: string) =>
    setSizeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const image = uploadedImage ?? queryImage;
  const selected = part !== null ? parts[part] : undefined;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label={`Shop similar to ${productTitle}`}
            ref={dialogRef}
            tabIndex={-1}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xl focus-visible:outline-none"
          >
            {/* header */}
            <div className="relative flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-lg font-bold uppercase tracking-wide">Shop Similar</h2>
              <div className="flex items-center gap-4">
                <label className="hidden text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:flex sm:items-center sm:gap-2">
                  Sort by
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    className="cursor-pointer rounded-sm border border-border bg-card px-2 py-1 text-foreground"
                  >
                    <option value="similar">Most similar</option>
                    <option value="price-asc">Price: low to high</option>
                    <option value="price-desc">Price: high to low</option>
                  </select>
                </label>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={onClose}
                  className="cursor-pointer p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col md:flex-row">
              {/* left: image + dots + upload + size facets */}
              <aside className="shrink-0 border-b border-border p-4 md:w-64 md:border-b-0 md:border-r">
                <div className="relative overflow-hidden rounded-md bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- dynamic/object-url source */}
                  <img src={image} alt="Your item" className="block w-full" />
                  {selected && (
                    <button
                      type="button"
                      onClick={() => setPart(null)}
                      aria-label={`Stop scoping to ${PART_NAMES[selected.label] ?? selected.label}`}
                      style={{
                        left: `${selected.box.x * 100}%`,
                        top: `${selected.box.y * 100}%`,
                        width: `${selected.box.w * 100}%`,
                        height: `${selected.box.h * 100}%`,
                      }}
                      className="absolute rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] ring-2 ring-white/90"
                    />
                  )}
                  {parts.map((p, i) =>
                    part === i ? null : (
                      <button
                        key={`${p.label}-${i}`}
                        type="button"
                        onClick={() => setPart(i)}
                        aria-label={`Shop the ${PART_NAMES[p.label] ?? p.label}`}
                        style={{ left: `${p.cx * 100}%`, top: `${p.cy * 100}%` }}
                        className="absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white/40 shadow-md backdrop-blur-sm transition-transform hover:scale-110 motion-reduce:transition-none"
                      >
                        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                      </button>
                    ),
                  )}
                  <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(e) => uploadNew(e.target.files)} />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors hover:bg-background disabled:opacity-60 motion-reduce:transition-none"
                  >
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Camera className="h-3.5 w-3.5" />}
                    Upload
                  </button>
                </div>
                {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

                {allSizes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-bold uppercase tracking-wide">Size</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {allSizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={sizeFilter.has(s)}
                          onClick={() => toggleSize(s)}
                          className={cn(
                            "min-w-9 rounded-sm border px-2.5 py-1.5 text-xs transition-colors motion-reduce:transition-none",
                            sizeFilter.has(s) ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>

              {/* right: results grid */}
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {loading ? "Finding matches…" : `${products.length} item${products.length === 1 ? "" : "s"}`}
                  {selected ? ` · ${PART_NAMES[selected.label] ?? selected.label}` : ""}
                </p>
                {loading ? (
                  <div className="flex h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-accent motion-reduce:animate-none" />
                  </div>
                ) : products.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    No close matches{sizeFilter.size > 0 ? " in those sizes" : ""}.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3">
                    {products.map((p) => (
                      <ProductCard key={p.handle} product={p} />
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
