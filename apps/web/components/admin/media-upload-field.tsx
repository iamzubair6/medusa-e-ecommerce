"use client";

import { useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@ecom/ui";

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
          <div className="flex items-center gap-3">
            <label className="cursor-pointer text-xs text-accent hover:underline">
              {uploading ? "Uploading…" : "Upload from device"}
              <input type="file" accept={accept} className="hidden" disabled={uploading} onChange={(e) => upload(e.target.files)} />
            </label>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      </div>
    </div>
  );
}
