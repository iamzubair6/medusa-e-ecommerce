"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- the query image is a dynamic API route, not a static asset */
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@ecom/ui";

interface Hotspot {
  label: string;
  /** Normalized (0–1) dot position + garment box on the query image. */
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
 * The "Search By Image" panel on /search (Fashion Nova pattern): sits where
 * the search popover was — top right, under the header — so the flow from
 * popover → results feels continuous. Shows the uploaded photo with a dot per
 * detected garment; the selected garment gets a translucent highlight box and
 * scopes the results. Tapping the selected dot again searches the whole photo.
 * Collapsible to a pill so it never buries results on mobile.
 */
export function ImageQueryPanel({
  resourceId,
  parts,
  selectedPart,
  division,
}: {
  resourceId: string;
  parts: Hotspot[];
  selectedPart?: number;
  division?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const imageSrc = `/api/visual-search/query/${resourceId}/image`;
  const selected = selectedPart !== undefined ? parts[selectedPart] : undefined;

  const selectPart = (idx: number) => {
    const q = new URLSearchParams(searchParams.toString());
    // Re-tapping the active dot searches the whole photo ("all" — the most
    // prominent garment is otherwise auto-selected server-side).
    if (idx === selectedPart) q.set("part", "all");
    else q.set("part", String(idx));
    q.delete("page");
    router.push(`/search?${q.toString()}`);
  };

  const clearDivision = () => {
    const q = new URLSearchParams(searchParams.toString());
    q.set("division", "all");
    q.delete("page");
    router.push(`/search?${q.toString()}`);
  };

  const uploadNew = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/visual-search/query", { method: "POST", body: fd });
      // A gateway timeout returns HTML — never surface a JSON parse error to the shopper.
      const data: { resourceId?: string; division?: string | null; error?: string } = res.headers
        .get("content-type")
        ?.includes("json")
        ? await res.json()
        : {};
      if (!res.ok || !data.resourceId) {
        throw new Error(data.error ?? "Search timed out — please try again.");
      }
      const q = new URLSearchParams();
      if (data.division) q.set("division", data.division);
      q.set("resourceId", data.resourceId);
      router.push(`/search?${q.toString()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 top-36 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] shadow-lg transition-colors hover:border-foreground motion-reduce:transition-none sm:right-6"
        aria-label="Show your search image"
      >
        <Camera className="h-4 w-4" />
        Your image
      </button>
    );
  }

  return (
    <aside
      aria-label="Search by image"
      className="fixed right-4 top-36 z-40 w-60 overflow-hidden rounded-md border border-border bg-card shadow-2xl sm:right-6 sm:w-72"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="flex min-w-0 items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
          <span className="truncate">Search by image</span>
          {division && (
            <button
              type="button"
              onClick={clearDivision}
              aria-label={`Remove the ${division} filter`}
              className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[0.6rem] transition-colors hover:border-foreground motion-reduce:transition-none"
            >
              {division}
              <X className="h-2.5 w-2.5" aria-hidden />
            </button>
          )}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Minimize the search image panel"
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground motion-reduce:transition-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        <img src={imageSrc} alt="Your uploaded search photo" className="block w-full" />

        {/* FN-style translucent highlight over the selected garment */}
        {selected && (
          <span
            aria-hidden
            style={{
              left: `${selected.box.x * 100}%`,
              top: `${selected.box.y * 100}%`,
              width: `${selected.box.w * 100}%`,
              height: `${selected.box.h * 100}%`,
            }}
            className="absolute rounded-lg bg-white/25 ring-2 ring-white/80"
          />
        )}

        {parts.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            type="button"
            onClick={() => selectPart(i)}
            aria-label={
              selectedPart === i
                ? `Stop searching only the ${PART_NAMES[p.label] ?? p.label}`
                : `Search the ${PART_NAMES[p.label] ?? p.label} in this photo`
            }
            aria-pressed={selectedPart === i}
            style={{ left: `${p.cx * 100}%`, top: `${p.cy * 100}%` }}
            className={cn(
              "absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              selectedPart === i
                ? "border-foreground bg-background/95 shadow-[0_0_0_4px_rgba(0,0,0,0.18)]"
                : "border-white/90 bg-white/40 backdrop-blur-sm shadow-md",
            )}
          >
            <span
              className={cn(
                "absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full",
                selectedPart === i ? "bg-foreground" : "bg-white",
              )}
            />
          </button>
        ))}
      </div>

      {selected && (
        <p className="border-t border-border px-4 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Showing: {PART_NAMES[selected.label] ?? selected.label}
        </p>
      )}

      <div className="border-t border-border p-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => uploadNew(e.target.files)}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-sm border border-foreground px-4 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-foreground hover:text-background disabled:opacity-60 motion-reduce:transition-none"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Camera className="h-4 w-4" />}
          {uploading ? "Searching…" : "Upload new image"}
        </button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    </aside>
  );
}
