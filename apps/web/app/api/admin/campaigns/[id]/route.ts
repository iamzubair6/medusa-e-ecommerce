import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z, ZodError } from "zod";
import { deleteCampaign, updateCampaign } from "@ecom/cms";

const payloadSchema = z.object({
  promoCode: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
  bannerText: z.string().max(160).optional(),
  bannerHref: z.string().max(200).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  status: z.enum(["SCHEDULED", "ACTIVE", "ENDED", "PAUSED"]).optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  payload: payloadSchema.optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const { startsAt, endsAt, ...rest } = parsed.data;
  try {
    const campaign = await updateCampaign(id, {
      ...rest,
      startsAt: startsAt ? new Date(startsAt) : undefined,
      endsAt: endsAt === undefined ? undefined : endsAt ? new Date(endsAt) : null,
    });
    revalidatePath("/", "layout"); // banner takeover shows/updates immediately
    return NextResponse.json({ campaign });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.flatten() }, { status: 422 });
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteCampaign(id);
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
