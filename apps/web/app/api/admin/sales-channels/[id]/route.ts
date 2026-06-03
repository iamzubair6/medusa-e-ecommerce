import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { updateSalesChannel } from "@/lib/medusa-admin";

const schema = z.object({ name: z.string().min(1).max(60).optional(), isDisabled: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  try {
    await updateSalesChannel(id, parsed.data);
    revalidatePath("/admin/settings");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
