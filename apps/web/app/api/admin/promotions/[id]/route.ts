import { NextResponse } from "next/server";
import { z } from "zod";
import { deletePromotion, updatePromotion } from "@/lib/medusa-admin";

const patchSchema = z
  .object({
    status: z.enum(["active", "inactive"]).optional(),
    code: z
      .string()
      .min(2)
      .max(40)
      .transform((s) => s.trim().toUpperCase())
      .optional(),
    automatic: z.boolean().optional(),
    value: z.number().int().min(1).max(1_000_000).optional(),
    buyQuantity: z.number().int().min(1).max(20).optional(),
    getQuantity: z.number().int().min(1).max(20).optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    usage: z
      .object({
        kind: z.enum(["total", "per_customer"]),
        limit: z.number().int().min(1).max(1_000_000),
      })
      .nullable()
      .optional(),
  })
  .refine((d) => Object.values(d).some((v) => v !== undefined), {
    message: "Nothing to update.",
  })
  .refine((d) => (d.startsAt && d.endsAt ? new Date(d.endsAt) > new Date(d.startsAt) : true), {
    message: "End date must be after the start date.",
    path: ["endsAt"],
  });

/** Edit a promotion (status, code, value, dates, usage cap, automatic) — admin-gated by middleware. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid input" }, { status: 422 });
  }
  try {
    await updatePromotion(id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deletePromotion(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
