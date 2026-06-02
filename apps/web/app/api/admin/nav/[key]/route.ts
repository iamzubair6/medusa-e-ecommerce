import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { replaceNavItems } from "@ecom/cms";

const schema = z.object({
  items: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        href: z.string().min(1),
        megaMenu: z.unknown().optional(),
      }),
    )
    .max(12),
});

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  try {
    await replaceNavItems(key, parsed.data.items);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
