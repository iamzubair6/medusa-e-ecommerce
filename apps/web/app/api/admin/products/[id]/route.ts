import { NextResponse } from "next/server";
import { revalidateCommerce } from "@/lib/revalidate-commerce";
import { z } from "zod";
import { deleteProduct, setProductStatus, updateProduct } from "@/lib/medusa-admin";
import { productSchema } from "@/lib/product-schema";

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
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
