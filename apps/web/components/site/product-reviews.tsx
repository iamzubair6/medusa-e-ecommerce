"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button, cn } from "@ecom/ui";

export interface ReviewItem {
  id: string;
  rating: number;
  author: string;
  title: string | null;
  body: string;
  createdAt: string;
}
export interface ReviewSummary {
  count: number;
  average: number;
}

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        body: JSON.stringify({ productHandle: handle, rating, author, title: title || undefined, body }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Could not submit review");
      }
      setOpen(false);
      setRating(0);
      setAuthor("");
      setTitle("");
      setBody("");
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
            <Stars value={summary.average} />
            <span className="text-sm text-muted-foreground">
              {summary.count > 0 ? `${summary.average} · ${summary.count} review${summary.count === 1 ? "" : "s"}` : "No reviews yet"}
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
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your rating</span>
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
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name" className="h-11 rounded-sm border border-input bg-card px-3 text-sm" />
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="h-11 rounded-sm border border-input bg-card px-3 text-sm" />
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What did you think?" className="min-h-28 rounded-sm border border-input bg-card p-3 text-sm" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button variant="solid" loading={saving} onClick={submit} className="w-fit">
            Submit review
          </Button>
        </div>
      )}

      <ul className="mt-6 flex flex-col divide-y divide-border">
        {initialReviews.map((r) => (
          <li key={r.id} className="py-5">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.title && <p className="mt-2 font-medium">{r.title}</p>}
            <p className="mt-1 text-sm text-foreground/80">{r.body}</p>
            <p className="mt-2 text-xs text-muted-foreground">— {r.author}</p>
          </li>
        ))}
        {initialReviews.length === 0 && (
          <li className="py-8 text-center text-sm text-muted-foreground">No reviews yet — be the first to review this piece.</li>
        )}
      </ul>
    </section>
  );
}
