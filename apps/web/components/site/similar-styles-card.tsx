"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";

interface StyleRef {
  handle: string;
  title: string;
  thumbnail: string;
}

/**
 * Fashion Nova's "WE SEE SIMILAR STYLES" PDP module: thumbnails of the
 * closest indexed styles, a Shop Similar action, and "STYLE IT WITH" pieces
 * from this product's tagged look. Shop Similar feeds the product photo into
 * the visual-search engine — the shopper lands on /search with the garment
 * dots, size filters and similarity ordering (same flow as a camera upload).
 */
export function SimilarStylesCard({
  queryImage,
  similar,
  styleWith,
}: {
  queryImage: string;
  similar: StyleRef[];
  styleWith: StyleRef[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (similar.length === 0 && styleWith.length === 0) return null;

  const shopSimilar = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/visual-search/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: queryImage }),
      });
      const data: { resourceId?: string; division?: string | null; error?: string } = res.headers
        .get("content-type")
        ?.includes("json")
        ? await res.json()
        : {};
      if (!res.ok || !data.resourceId) {
        throw new Error(data.error ?? "Couldn't search right now — try again.");
      }
      const q = new URLSearchParams();
      if (data.division) q.set("division", data.division);
      q.set("resourceId", data.resourceId);
      router.push(`/search?${q.toString()}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <aside className="rounded-md border border-border p-4" aria-label="Similar styles">
      {similar.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="flex shrink-0 -space-x-2">
              {similar.slice(0, 3).map((s) => (
                <span
                  key={s.handle}
                  className="relative h-12 w-9 overflow-hidden rounded-[4px] border border-background shadow-sm"
                >
                  <Image src={s.thumbnail} alt="" fill sizes="36px" className="object-cover" />
                </span>
              ))}
            </div>
            <p className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em]">
              We see similar styles
            </p>
          </div>
          <button
            type="button"
            onClick={shopSimilar}
            disabled={busy}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-foreground px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-foreground hover:text-background disabled:opacity-60 motion-reduce:transition-none"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <Sparkles className="h-3.5 w-3.5" />}
            Shop Similar
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      {styleWith.length > 0 && (
        <div className={similar.length > 0 ? "mt-4 border-t border-border pt-4" : ""}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Style it with
          </p>
          <div className="mt-2.5 flex gap-3">
            {styleWith.map((s) => (
              <Link key={s.handle} href={`/products/${s.handle}`} className="group w-16 shrink-0">
                <span className="relative block aspect-[3/4] overflow-hidden rounded-[4px] bg-muted">
                  <Image
                    src={s.thumbnail}
                    alt={s.title}
                    fill
                    sizes="64px"
                    className="object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                  />
                </span>
                <span className="mt-1 block truncate text-[0.65rem] text-muted-foreground group-hover:text-foreground">
                  {s.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
