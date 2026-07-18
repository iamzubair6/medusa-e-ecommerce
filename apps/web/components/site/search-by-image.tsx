"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronUp, ImagePlus, Link2, Loader2 } from "lucide-react";
import { cn } from "@ecom/ui";

interface Sample {
  thumbnail: string;
  title: string;
}

/**
 * Fashion Nova-style "Search By Image" popover: drag-and-drop / upload photo,
 * paste an image link, or try a sample style. A successful search navigates to
 * /search?division=…&resourceId=… (the division is auto-detected server-side).
 */
export function SearchByImagePopover({
  open,
  onClose,
  reduce,
}: {
  open: boolean;
  onClose: () => void;
  reduce: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [link, setLink] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyboard support: focus lands in the dialog on open, Escape closes it.
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  const { data: samples } = useQuery({
    queryKey: ["visual-search-samples"],
    enabled: open,
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<Sample[]> => {
      const res = await fetch("/api/visual-search/samples", { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as { samples?: Sample[] };
      return data.samples ?? [];
    },
  });

  const goToResults = useCallback(
    (resourceId: string, division: string | null) => {
      const q = new URLSearchParams();
      if (division) q.set("division", division);
      q.set("resourceId", resourceId);
      onClose();
      router.push(`/search?${q.toString()}`);
    },
    [onClose, router],
  );

  const runSearch = useCallback(
    async (init: RequestInit) => {
      setSearching(true);
      setError(null);
      try {
        const res = await fetch("/api/visual-search/query", { method: "POST", ...init });
        // A gateway timeout returns HTML — never surface a JSON parse error to the shopper.
        const data: { resourceId?: string; division?: string | null; error?: string } = res.headers
          .get("content-type")
          ?.includes("json")
          ? await res.json()
          : {};
        if (!res.ok || !data.resourceId) {
          throw new Error(data.error ?? "Search timed out — please try again.");
        }
        goToResults(data.resourceId, data.division ?? null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setSearching(false);
      }
    },
    [goToResults],
  );

  const searchFile = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("image", file);
      void runSearch({ body: fd });
      if (fileRef.current) fileRef.current.value = "";
    },
    [runSearch],
  );

  const searchUrl = useCallback(
    (url: string) => {
      const trimmed = url.trim();
      if (!trimmed) return;
      try {
        new URL(trimmed);
      } catch {
        setError("Paste a valid image link (https://…).");
        return;
      }
      void runSearch({
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
    },
    [runSearch],
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          role="dialog"
          aria-label="Search by image"
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,560px)] rounded-md border border-border bg-card shadow-2xl focus-visible:outline-none"
        >
          {/* header */}
          <div className="relative flex items-center justify-center border-b border-border px-4 py-3.5">
            <span className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-sm border border-border text-muted-foreground">
              <Camera className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg">Search By Image</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close image search"
              className="absolute right-4 rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          <div className="relative p-4">
            {/* drop zone */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                searchFile(e.dataTransfer.files);
              }}
              className={cn(
                "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-sm border border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none sm:flex-row",
                dragOver ? "border-foreground bg-muted/60" : "border-border bg-background/40",
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => searchFile(e.target.files)}
              />
              <span className="text-sm text-muted-foreground">Drag an image here or</span>
              <span className="inline-flex items-center gap-2 rounded-full border border-foreground px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground hover:text-background motion-reduce:transition-none">
                <ImagePlus className="h-4 w-4" />
                Upload photo
              </span>
            </label>

            {/* OR divider */}
            <div className="my-4 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                or
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* paste a link (not a <form> — this popover renders inside the navbar's search form) */}
            <div className="flex items-center gap-2 rounded-full border border-border px-4 py-1 focus-within:border-foreground">
              <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    searchUrl(link);
                  }
                }}
                placeholder="Paste an image link"
                aria-label="Paste an image link"
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
              {link.trim() && (
                <button
                  type="button"
                  onClick={() => searchUrl(link)}
                  className="shrink-0 text-xs font-semibold uppercase tracking-wide text-accent"
                >
                  Search
                </button>
              )}
            </div>

            {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

            {/* sample styles */}
            {(samples?.length ?? 0) > 0 && (
              <div className="mt-5">
                <p className="text-center text-sm text-muted-foreground">
                  You can try one of these styles below
                </p>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {samples!.map((s) => (
                    <button
                      key={s.thumbnail}
                      type="button"
                      onClick={() => searchUrl(s.thumbnail)}
                      className="group relative aspect-[3/4] overflow-hidden rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Search styles like ${s.title}`}
                    >
                      <Image
                        src={s.thumbnail}
                        alt=""
                        fill
                        sizes="130px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* searching overlay */}
            {searching && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/90 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent motion-reduce:animate-none" />
                <p className="text-sm font-medium">Finding similar styles…</p>
                <p className="max-w-56 text-xs text-muted-foreground">
                  The first search can take up to a minute.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
