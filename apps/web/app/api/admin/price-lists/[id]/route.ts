import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deletePriceList } from "@/lib/medusa-admin";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deletePriceList(id);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
