import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { reorderSections } from "@ecom/cms";

const schema = z.object({ orderedIds: z.array(z.string().min(1)).min(1) });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "orderedIds required" }, { status: 422 });
  }
  await reorderSections(parsed.data.orderedIds);
  revalidatePath("/");
  return NextResponse.json({ ok: true });
}
