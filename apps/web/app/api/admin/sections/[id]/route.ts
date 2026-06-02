import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { updateSection } from "@ecom/cms";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { config?: unknown } | null;
  if (!body || body.config === undefined) {
    return NextResponse.json({ error: "config required" }, { status: 400 });
  }
  try {
    await updateSection(id, body.config);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
