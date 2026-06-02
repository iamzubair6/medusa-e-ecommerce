import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { updatePopup } from "@ecom/cms";

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  active: z.boolean().optional(),
  trigger: z.enum(["TIMER", "SCROLL", "EXIT_INTENT", "IMMEDIATE"]).optional(),
  config: z.unknown().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  const { startsAt, endsAt, ...rest } = parsed.data;
  try {
    await updatePopup(id, {
      ...rest,
      startsAt: startsAt === undefined ? undefined : startsAt ? new Date(startsAt) : null,
      endsAt: endsAt === undefined ? undefined : endsAt ? new Date(endsAt) : null,
    });
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
