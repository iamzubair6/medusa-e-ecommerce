import { NextResponse } from "next/server";
import { z } from "zod";
import { createPromotion } from "@/lib/medusa-admin";

const schema = z
  .object({
    code: z
      .string()
      .min(2)
      .max(40)
      .transform((s) => s.trim().toUpperCase()),
    automatic: z.boolean().optional(),
    method: z.enum(["percentage", "fixed", "free_shipping", "buyget"]),
    value: z.number().int().min(1).optional(),
    appliesTo: z.enum(["order", "category", "collection"]),
    targetId: z.string().min(1).optional(),
    buyQuantity: z.number().int().min(1).max(20).optional(),
    getQuantity: z.number().int().min(1).max(20).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine((d) => (d.startsAt && d.endsAt ? new Date(d.endsAt) > new Date(d.startsAt) : true), {
    message: "End date must be after the start date.",
    path: ["endsAt"],
  })
  .refine((d) => (d.method === "percentage" || d.method === "fixed" ? d.value !== undefined : true), {
    message: "A value is required.",
    path: ["value"],
  })
  .refine((d) => (d.method === "percentage" ? (d.value ?? 0) <= 100 : true), {
    message: "Percentage cannot exceed 100.",
    path: ["value"],
  })
  .refine((d) => (d.appliesTo === "order" ? true : Boolean(d.targetId)), {
    message: "Pick a category or collection.",
    path: ["targetId"],
  })
  .refine((d) => (d.method === "buyget" ? d.appliesTo !== "order" : true), {
    message: "BOGO needs a category or collection.",
    path: ["appliesTo"],
  });

/** Create a discount / BOGO / free-shipping promotion (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: first?.message ?? "Invalid input" }, { status: 422 });
  }
  try {
    const promotion = await createPromotion(parsed.data);
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
