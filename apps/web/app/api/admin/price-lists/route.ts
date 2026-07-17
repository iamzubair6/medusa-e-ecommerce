import { NextResponse } from "next/server";
import { revalidateCommerce } from "@/lib/revalidate-commerce";
import { z } from "zod";
import { createPriceList } from "@/lib/medusa-admin";

const schema = z
  .object({
    title: z.string().min(2).max(80),
    percentOff: z.number().int().min(1).max(90),
    appliesTo: z.enum(["all", "category", "collection"]),
    targetId: z.string().min(1).optional(),
    startsAt: z.string().datetime().optional(),
    endsAt: z.string().datetime().optional(),
  })
  .refine((d) => (d.appliesTo === "all" ? true : Boolean(d.targetId)), {
    message: "Pick a category or collection.",
    path: ["targetId"],
  });

/** Create a sale price list (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 422 });
  }
  try {
    const priceList = await createPriceList(parsed.data);
    revalidateCommerce();
    return NextResponse.json({ priceList }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
