import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createReview } from "@ecom/cms";
import { isOwnMediaUrl } from "@/lib/media-hosts";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  productHandle: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  author: z.string().min(1).max(60),
  title: z.string().max(80).optional(),
  body: z.string().min(3).max(2000),
  // Photos must be URLs WE returned from /api/reviews/upload — never arbitrary
  // external images (offensive content / tracking pixels / mixed content).
  photos: z.array(z.string().url().max(600).refine(isOwnMediaUrl, "Unrecognized image host")).max(6).optional(),
});

/** Submit a product review (public, rate-limited). Auto-approved for the showcase. */
export async function POST(request: Request) {
  const limit = rateLimit(`review:${clientKey(request)}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Too many reviews — try again shortly." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid review" }, { status: 422 });
  }
  try {
    await createReview(parsed.data);
    revalidatePath(`/products/${parsed.data.productHandle}`);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
