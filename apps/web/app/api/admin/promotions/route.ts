import { NextResponse } from "next/server";
import { z } from "zod";
import { createPromotion } from "@/lib/medusa-admin";

const schema = z.object({
  code: z
    .string()
    .min(2)
    .max(40)
    .transform((s) => s.trim().toUpperCase()),
  valueType: z.enum(["percentage", "fixed"]),
  value: z.number().int().min(1),
});

/** Create a discount code (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  if (parsed.data.valueType === "percentage" && parsed.data.value > 100) {
    return NextResponse.json({ error: "Percentage cannot exceed 100." }, { status: 422 });
  }
  try {
    const promotion = await createPromotion(parsed.data);
    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
