import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createReview } from "@ecom/cms";

const schema = z.object({
  productHandle: z.string().min(1).max(120),
  rating: z.number().int().min(1).max(5),
  author: z.string().min(1).max(60),
  title: z.string().max(80).optional(),
  body: z.string().min(3).max(2000),
});

/** Submit a product review (public). Auto-approved for the showcase. */
export async function POST(request: Request) {
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
