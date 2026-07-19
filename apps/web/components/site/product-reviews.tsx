"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { Button, cn } from "@ecom/ui";

export interface ReviewItem {
  id: string;
  rating: number;
  author: string;
  title: string | null;
  body: string;
  photos: string[];
  createdAt: string;
}
export interface ReviewSummary {
  count: number;
  average: number;
}

type SortKey = "newest" | "highest" | "lowest";

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex", className)} aria-label={`${value} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          className={cn("h-4 w-4", i < Math.round(value) ? "fill-foreground text-foreground" : "text-muted-foreground/40")}
        />
      ))}
    </span>
  );
}

export function ProductReviews({
  handle,
  summary,
  initialReviews,
}: {
  handle: string;
  summary: ReviewSummary;
  initialReviews: ReviewItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [liveSummary, setLiveSummary] = useState<ReviewSummary>(summary);

  const [sort, setSort] = useState<SortKey>("newest");
  const [onlyPhotos, setOnlyPhotos] = useState(false);

  const shown = useMemo(() => {
    let list = onlyPhotos ? reviews.filter((r) => r.photos.length > 0) : reviews;
    if (sort === "highest") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === "lowest") list = [...list].sort((a, b) => a.rating - b.rating);
    else list = [...list].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return list;
  }, [reviews, onlyPhotos, sort]);
  const photoCount = reviews.filter((r) => r.photos.length > 0).length;

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 4).forEach((f) => fd.append("files", f));
      const res = await fetch("/api/reviews/upload", { method: "POST", body: fd });
      const d = (await res.json().catch(() => ({}))) as { urls?: string[]; error?: string };
      if (!res.ok || !d.urls) throw new Error(d.error ?? "Upload failed");
      setPhotos((p) => [...p, ...d.urls!].slice(0, 6));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (rating < 1) return setError("Please pick a star rating.");
    if (!author.trim()) return setError("Add your name.");
    if (body.trim().length < 3) return setError("Write a short review.");
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productHandle: handle, rating, author, title: title || undefined, body, photos }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Could not submit review");
      }
      const created = (await res.json().catch(() => ({}))) as { id?: string };
      const newReview: ReviewItem = {
        id: created.id ?? `tmp-${reviews.length + 1}`,
        rating,
        author: author.trim(),
        title: title.trim() || null,
        body: body.trim(),
        photos,
        createdAt: new Date().toISOString(),
      };
      setReviews((prev) => [newReview, ...prev]);
      setLiveSummary((prev) => {
        const count = prev.count + 1;
        const average = Math.round(((prev.average * prev.count + rating) / count) * 10) / 10;
        return { count, average };
      });
      setOpen(false);
      setRating(0);
      setAuthor("");
      setTitle("");
      setBody("");
      setPhotos([]);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section id="reviews" className="mt-20 scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h2 className="font-display text-2xl font-bold tracking-tight">Reviews</h2>
          <div className="mt-2 flex items-center gap-2">
            <Stars value={liveSummary.average} />
            <span className="text-sm text-muted-foreground">
              {liveSummary.count > 0 ? `${liveSummary.average} · ${liveSummary.count} review${liveSummary.count === 1 ? "" : "s"}` : "No reviews yet"}
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={() => setOpen((o) => !o)}>
          {open ? "Cancel" : "Write a review"}
        </Button>
      </div>

      {open && (
        <div className="mt-6 flex max-w-xl flex-col gap-4 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your rating<span className="text-destructive"> *</span></span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star`}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  className="cursor-pointer p-0.5"
                >
                  <Star className={cn("h-7 w-7 transition-colors", n <= (hover || rating) ? "fill-foreground text-foreground" : "text-muted-foreground/40")} />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="relative">
              <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" className="h-11 w-full rounded-sm border border-input bg-card px-3 text-sm" />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-destructive">*</span>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="h-11 rounded-sm border border-input bg-card px-3 text-sm" />
          </div>
          <div className="relative">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think?" className="min-h-28 w-full rounded-sm border border-input bg-card p-3 text-sm" />
            <span className="pointer-events-none absolute right-3 top-3 text-destructive">*</span>
          </div>

          {/* photo upload */}
          <div className="flex flex-wrap items-center gap-2">
            {photos.map((url) => (
              <span key={url} className="relative h-16 w-16 overflow-hidden rounded-sm border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                  className="absolute right-0.5 top-0.5 rounded-full bg-background/85 p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            {photos.length < 6 && (
              <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-[0.6rem] text-muted-foreground hover:border-foreground">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ImagePlus className="h-4 w-4" />}
                {uploading ? "…" : "Add photo"}
                <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={(e) => uploadPhotos(e.target.files)} />
              </label>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="solid" loading={saving} onClick={submit} className="w-fit">
            Submit review
          </Button>
        </div>
      )}

      {/* filter + sort */}
      {reviews.length > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          {photoCount > 0 && (
            <button
              type="button"
              onClick={() => setOnlyPhotos((v) => !v)}
              aria-pressed={onlyPhotos}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors motion-reduce:transition-none",
                onlyPhotos ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
              )}
            >
              With photos ({photoCount})
            </button>
          )}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Sort
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="cursor-pointer rounded-sm border border-border bg-card px-2 py-1 text-foreground"
            >
              <option value="newest">Newest</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </label>
        </div>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-border">
        {shown.map((r) => (
          <li key={r.id} className="py-5">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            <p className="mt-1 text-sm text-foreground/80">{r.body}</p>
            {r.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.photos.map((url) => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="h-20 w-20 overflow-hidden rounded-sm border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="Customer photo" className="h-full w-full object-cover transition-transform hover:scale-105 motion-reduce:hover:scale-100" />
                  </a>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">— {r.author}</p>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">
            {onlyPhotos ? "No reviews with photos yet." : "No reviews yet — be the first to review this piece."}
          </li>
        )}
      </ul>
    </section>
  );
}
