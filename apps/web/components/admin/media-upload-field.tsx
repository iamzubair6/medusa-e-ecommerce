"use client";

import { useEffect, useState } from "react";
import { Images, UploadCloud, X } from "lucide-react";
import { cn } from "@ecom/ui";

interface Asset {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
}

/** Modal grid of previously-uploaded assets to pick from. */
function LibraryPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/media")
      .then((r) => r.json())
      .then((d: { assets?: Asset[] }) => setAssets(d.assets ?? []))
      .catch(() => setAssets([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-label="Media library">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h3 className="font-display font-bold">Media library</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading…</p>
          ) : assets.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No uploads yet — anything you upload here becomes reusable.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {assets.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => {
                    onPick(a.url);
                    onClose();
                  }}
                  className="relative aspect-square overflow-hidden rounded-sm border border-border hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {a.type === "VIDEO" ? (
                    <video src={a.url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Reusable media field: upload an image/video from the device OR paste a URL.
 * Controlled (value + onChange). Uploads via /api/admin/uploads (Medusa file
 * service). Storage backend is pluggable — see docs/PRODUCTION_DECISIONS.md.
 */
export function MediaUploadField({
  label,
  value,
  onChange,
  accept = "image/*",
  hint,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(value);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("files", files[0]!);
      const res = await fetch("/api/admin/uploads", { method: "POST", body: fd });
      const data = (await res.json()) as { urls?: string[]; error?: string };
      if (!res.ok || !data.urls?.[0]) throw new Error(data.error ?? "Upload failed");
      onChange(data.urls[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>}
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-sm border border-border bg-muted">
            {isVideo ? (
              <video src={value} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-full w-full object-cover" />
            )}
            <button type="button" aria-label="Remove" onClick={() => onChange("")} className="absolute right-0.5 top-0.5 cursor-pointer rounded-full bg-background/80 p-0.5 hover:bg-background">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <label className={cn("flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-[0.6rem] text-muted-foreground hover:border-foreground", uploading && "opacity-50")}>
            <UploadCloud className="h-5 w-5" />
            {uploading ? "Uploading…" : "Upload"}
            <input type="file" accept={accept} className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
          </label>
        )}
        <div className="flex flex-1 flex-col gap-1.5">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://… or upload from device"
            className="h-10 rounded-sm border border-input bg-card px-3 text-sm"
          />
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer text-xs text-accent hover:underline">
              {uploading ? "Uploading…" : "Upload from device"}
              <input type="file" accept={accept} className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
            </label>
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="flex items-center gap-1 text-xs text-accent hover:underline"
            >
              <Images className="h-3.5 w-3.5" /> Choose from library
            </button>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>
      {libraryOpen && <LibraryPicker onPick={onChange} onClose={() => setLibraryOpen(false)} />}
    </div>
  );
}
