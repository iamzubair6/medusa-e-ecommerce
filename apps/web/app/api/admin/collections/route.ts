import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createCollection } from "@/lib/medusa-admin";

const schema = z.object({ title: z.string().min(1).max(60) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Title is required" }, { status: 422 });
  try {
    const collection = await createCollection(parsed.data.title);
    revalidatePath("/");
    return NextResponse.json({ collection }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
