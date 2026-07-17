import { NextResponse } from "next/server";
import { revalidateCommerce } from "@/lib/revalidate-commerce";
import { createProduct } from "@/lib/medusa-admin";
import { productSchema } from "@/lib/product-schema";
import { indexProductById } from "@/lib/visual-search";

/** Create a product from the CMS admin form (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    const product = await createProduct(parsed.data);
    revalidateCommerce();
    await indexProductById(product.id); // best-effort visual-search entry
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
