import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createProduct } from "@/lib/medusa-admin";

export const productSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  offer: z
    .object({
      type: z.enum(["bogo", "discount"]),
      label: z.string().min(1).max(60),
      percent: z.number().int().min(1).max(90).optional(),
    })
    .optional(),
  colors: z
    .array(
      z.object({
        name: z.string().min(1).max(40),
        swatch: z.string().min(1).max(20),
        price: z.number().int().min(1),
        originalPrice: z.number().int().min(1).optional(),
        images: z.array(z.string().url()).min(1).max(12),
        sizes: z
          .array(z.object({ size: z.string().min(1).max(8), stock: z.number().int().min(0).max(9999) }))
          .min(1),
      }),
    )
    .min(1)
    .max(8),
});

/** Create a product from the CMS admin form (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const product = await createProduct(parsed.data);
    revalidatePath("/");
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
