import { NextResponse } from "next/server";
import { revalidateCommerce } from "@/lib/revalidate-commerce";
import { z } from "zod";
import { createCategory } from "@/lib/medusa-admin";

const schema = z.object({ name: z.string().min(1).max(60) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name is required" }, { status: 422 });
  try {
    const category = await createCategory(parsed.data.name);
    revalidateCommerce();
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
