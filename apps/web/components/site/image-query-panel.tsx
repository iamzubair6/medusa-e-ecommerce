"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
/* eslint-disable @next/next/no-img-element -- the query image is a dynamic API route, not a static asset */
import { Camera, Loader2, X } from "lucide-react";
import { cn } from "@ecom/ui";

interface Hotspot {
  label: string;
  /** Normalized (0–1) dot position on the query image. */
  cx: number;
  cy: number;
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
 * The floating "Search By Image" panel on /search (Fashion Nova pattern):
 * shows the uploaded photo with a dot on each detected garment — tapping a dot
 * re-scopes results to that piece — plus an "Upload New Image" action.
 * Collapsible to a small pill so it never buries the results on mobile.
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

  const selectPart = (idx: number) => {
    const q = new URLSearchParams(searchParams.toString());
    if (idx === selectedPart) q.delete("part");
    else q.set("part", String(idx));
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
      const data = (await res.json()) as { resourceId?: string; division?: string | null; error?: string };
      if (!res.ok || !data.resourceId) throw new Error(data.error ?? "Search failed — try another photo.");
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
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] shadow-lg transition-colors hover:border-foreground motion-reduce:transition-none"
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
      className="fixed bottom-5 right-5 z-40 w-64 overflow-hidden rounded-md border border-border bg-card shadow-xl sm:w-72"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em]">
          Search by image{division ? ` · ${division}` : ""}
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
        {parts.map((p, i) => (
          <button
            key={`${p.label}-${i}`}
            type="button"
            onClick={() => selectPart(i)}
            aria-label={`Search the ${PART_NAMES[p.label] ?? p.label} in this photo`}
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
