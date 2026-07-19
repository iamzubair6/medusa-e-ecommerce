"use client";

import { useState } from "react";
import { Check, Copy, Trash2 } from "lucide-react";
import { Card, ConfirmDialog } from "@ecom/ui";
import { useToast } from "./toast";

export interface MediaItem {
  id: string;
  url: string;
  type: "IMAGE" | "VIDEO";
}

/** Browse + copy-URL + remove uploaded assets. Remove only unlinks from the
 *  library; it does not delete the underlying file. */
export function MediaLibraryClient({ items }: { items: MediaItem[] }) {
  const toast = useToast();
  const [assets, setAssets] = useState(items);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Couldn't copy.");
    }
  };

  const remove = async (id: string) => {
    setConfirming(null);
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setAssets((a) => a.filter((x) => x.id !== id));
      toast.success("Removed from library.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (assets.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No media yet. Anything you upload through an image field is saved here for reuse.
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {assets.map((a) => (
          <div key={a.id} className="group relative aspect-square overflow-hidden rounded-sm border border-border bg-muted">
            {a.type === "VIDEO" ? (
              <video src={a.url} className="h-full w-full object-cover" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt="" className="h-full w-full object-cover" />
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                aria-label="Copy URL"
                onClick={() => copy(a.url)}
                className="rounded-full bg-background/90 p-1.5 hover:bg-background"
              >
                {copied === a.url ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                aria-label="Remove"
                onClick={() => setConfirming(a.id)}
                className="rounded-full bg-background/90 p-1.5 text-destructive hover:bg-background"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={confirming !== null}
        title="Remove from library?"
        description="This only removes it from the library list — the file itself stays where it's used."
        confirmLabel="Remove"
        destructive
        onConfirm={() => confirming && remove(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </>
  );
}
