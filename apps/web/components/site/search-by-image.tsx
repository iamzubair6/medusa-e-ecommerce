"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronUp, ImagePlus, Link2, Loader2, X } from "lucide-react";
import { cn } from "@ecom/ui";

interface Sample {
  thumbnail: string;
  title: string;
}

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

/**
 * The Fashion Nova "Search By Image" panel — ONE popover, one position, three
 * states that crossfade in place (never a second floating widget):
 *  - upload: drag-drop / upload photo / paste link / sample styles
 *  - searching: overlay while the query runs and results render
 *  - query: the active search's photo with garment dots — the selected garment
 *    shows a translucent highlight instead of its dot; taps re-scope results.
 * The panel lives in the navbar, so it survives navigation to /search — the
 * upload state morphs into the query state with no jump or reload feel.
 */
export function SearchByImagePopover({
  open,
  onClose,
  onCollapse,
  activeQueryId,
  reduce,
}: {
  open: boolean;
  /** Plain close (outside click, Escape). */
  onClose: () => void;
  /** The ^ chevron — collapse back to the text-search dropdown, FN style. */
  onCollapse: () => void;
  /** resourceId when the shopper is on /search viewing image results. */
  activeQueryId: string | null;
  reduce: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [link, setLink] = useState("");
  const [searching, setSearching] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [forceUpload, setForceUpload] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const view: "query" | "upload" = activeQueryId && !forceUpload ? "query" : "upload";

  // Keyboard support: focus lands in the dialog on open, Escape closes it.
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  // When the results page arrives, the SAME panel flips from the searching
  // overlay to the query view — no close/reopen, no position change.
  useEffect(() => {
    if (pendingId && searchParams.get("resourceId") === pendingId) {
      setPendingId(null);
      setSearching(false);
      setForceUpload(false);
    }
  }, [pendingId, searchParams]);

  // Leaving /search (chip cleared, normal browsing) resets to upload mode.
  useEffect(() => {
    if (!activeQueryId) setForceUpload(false);
  }, [activeQueryId]);

  const { data: samples } = useQuery({
    queryKey: ["visual-search-samples"],
    enabled: open && view === "upload",
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }): Promise<Sample[]> => {
      const res = await fetch("/api/visual-search/samples", { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as { samples?: Sample[] };
      return data.samples ?? [];
    },
  });

  const { data: queryMeta } = useQuery({
    queryKey: ["visual-query-meta", activeQueryId],
    enabled: open && view === "query" && Boolean(activeQueryId),
    staleTime: Infinity,
    queryFn: async ({ signal }): Promise<{ division: string | null; parts: QueryPart[] }> => {
      const res = await fetch(`/api/visual-search/query/${activeQueryId}`, { signal });
      if (!res.ok) throw new Error("meta failed");
      return (await res.json()) as { division: string | null; parts: QueryPart[] };
    },
  });

  const parts = queryMeta?.parts ?? [];
  const partParam = searchParams.get("part");
  const selectedPart =
    view !== "query" || partParam === "all" || parts.length === 0
      ? undefined
      : partParam !== null && Number.isInteger(Number(partParam)) && Number(partParam) >= 0 && Number(partParam) < parts.length
        ? Number(partParam)
        : 0;
  const selected = selectedPart !== undefined ? parts[selectedPart] : undefined;
  const urlDivision = searchParams.get("division");
  const division = urlDivision && urlDivision !== "all" ? urlDivision : undefined;

  const pushSearchParams = useCallback(
    (mutate: (q: URLSearchParams) => void) => {
      const q = new URLSearchParams(searchParams.toString());
      mutate(q);
      q.delete("page");
      router.push(`/search?${q.toString()}`);
    },
    [router, searchParams],
  );

  const selectPart = (idx: number) =>
    pushSearchParams((q) => q.set("part", idx === selectedPart ? "all" : String(idx)));

  const goToResults = useCallback(
    (resourceId: string, div: string | null) => {
      const q = new URLSearchParams();
      if (div) q.set("division", div);
      q.set("resourceId", resourceId);
      setPendingId(resourceId);
      router.push(`/search?${q.toString()}`);
    },
    [router],
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

  const fade = {
    initial: reduce ? undefined : { opacity: 0 },
    animate: { opacity: 1 },
    exit: reduce ? undefined : { opacity: 0 },
    transition: { duration: 0.18, ease: "easeOut" as const },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -6, scaleY: 0.92, scaleX: 0.99 }}
          animate={{ opacity: 1, y: 0, scaleY: 1, scaleX: 1 }}
          exit={reduce ? undefined : { opacity: 0, y: -6, scaleY: 0.96 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          role="dialog"
          aria-label="Search by image"
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,446px)] origin-top rounded-2xl border border-border bg-card shadow-2xl focus-visible:outline-none"
        >
          {/* header — identical in every state, so the panel never "changes widget" */}
          <div className="relative flex items-center justify-center border-b border-border px-4 py-3.5">
            <span className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground">
              <Camera className="h-4 w-4" />
            </span>
            <h2 className="font-serif text-lg">Search By Image</h2>
            <div className="absolute right-4 flex items-center gap-1">
              {view === "query" && (
                <button
                  type="button"
                  onClick={() => setForceUpload(true)}
                  aria-label="Search with a different image"
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onCollapse}
                aria-label="Back to text search"
                className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
              >
                <ChevronUp className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait" initial={false}>
              {view === "query" ? (
                <motion.div key="query" {...fade} className="p-4">
                  <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- dynamic API route */}
                    <img
                      src={`/api/visual-search/query/${activeQueryId}/image`}
                      alt="Your uploaded search photo"
                      className="block max-h-[380px] w-auto"
                    />
                    <button
                      type="button"
                      onClick={() => router.push("/products")}
                      aria-label="Clear this image search"
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 motion-reduce:transition-none"
                    >
                      <X className="h-4 w-4" />
                    </button>

                    {/* FN highlight: the selected garment stays CLEAR while the
                        rest of the photo dims — a transparent cutout whose huge
                        spread shadow darkens everything around it (clipped by
                        the rounded overflow-hidden wrapper). */}
                    {selected && (
                      <button
                        type="button"
                        onClick={() => selectPart(selectedPart!)}
                        aria-label={`Stop searching only the ${PART_NAMES[selected.label] ?? selected.label}`}
                        style={{
                          left: `${selected.box.x * 100}%`,
                          top: `${selected.box.y * 100}%`,
                          width: `${selected.box.w * 100}%`,
                          height: `${selected.box.h * 100}%`,
                        }}
                        className="absolute rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] ring-2 ring-white/90 focus-visible:outline-none focus-visible:ring-4"
                      />
                    )}
                    {parts.map((p, i) =>
                      selectedPart === i ? null : (
                        <button
                          key={`${p.label}-${i}`}
                          type="button"
                          onClick={() => selectPart(i)}
                          aria-label={`Search the ${PART_NAMES[p.label] ?? p.label} in this photo`}
                          style={{ left: `${p.cx * 100}%`, top: `${p.cy * 100}%` }}
                          className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white/40 shadow-md backdrop-blur-sm transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                        >
                          <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                        </button>
                      ),
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-center gap-3">
                    {selected && (
                      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Showing: {PART_NAMES[selected.label] ?? selected.label}
                      </span>
                    )}
                    {division && (
                      <button
                        type="button"
                        onClick={() => pushSearchParams((q) => q.set("division", "all"))}
                        aria-label={`Remove the ${division} filter`}
                        className="flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] transition-colors hover:border-foreground motion-reduce:transition-none"
                      >
                        {division}
                        <X className="h-2.5 w-2.5" aria-hidden />
                      </button>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="upload" {...fade} className="p-4">
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
                      "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none sm:flex-row",
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
                  <div className="flex items-center gap-2 rounded-full border border-border px-4 py-1 shadow-sm focus-within:border-foreground">
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
                            className="group relative aspect-[3/4] overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                </motion.div>
              )}
            </AnimatePresence>

            {error && <p className="px-4 pb-3 text-xs text-destructive">{error}</p>}

            {/* searching overlay — sits over whichever state is showing */}
            {searching && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-b-2xl bg-card/90 text-center">
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
