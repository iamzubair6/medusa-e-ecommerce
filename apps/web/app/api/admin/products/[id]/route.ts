import { NextResponse } from "next/server";
import { revalidateCommerce } from "@/lib/revalidate-commerce";
import { z } from "zod";
import { deleteProductEmbedding } from "@ecom/cms";
import { deleteProduct, setProductStatus, updateProduct } from "@/lib/medusa-admin";
import { productSchema } from "@/lib/product-schema";
import { indexProductById } from "@/lib/visual-search";

const statusSchema = z.object({ status: z.enum(["published", "draft"]) });

/** Full update of a product (variants, prices, images, metadata). */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    await updateProduct(id, parsed.data);
    revalidateCommerce();
    await indexProductById(id); // refresh the visual-search entry (best-effort)
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

/** Toggle publish status (published ↔ draft). */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = statusSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    await setProductStatus(id, parsed.data.status);
    revalidateCommerce();
    // Unpublished products must not appear in "Shop Similar"; republish re-indexes.
    if (parsed.data.status === "draft") await deleteProductEmbedding(id);
    else await indexProductById(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteProduct(id);
    revalidateCommerce();
    await deleteProductEmbedding(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
