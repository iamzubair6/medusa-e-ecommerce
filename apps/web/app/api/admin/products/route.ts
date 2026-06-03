import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createProduct } from "@/lib/medusa-admin";
import { productSchema } from "@/lib/product-schema";

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
