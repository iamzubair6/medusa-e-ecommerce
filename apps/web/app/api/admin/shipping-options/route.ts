import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createShippingOption } from "@/lib/medusa-admin";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  amount: z.number().int().min(0).max(100000),
  serviceZoneId: z.string().min(1),
});

/** Create a flat-rate shipping option in a service zone. Admin-gated by middleware. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Name, amount and zone are required" }, { status: 422 });
  }
  try {
    const option = await createShippingOption(parsed.data);
    revalidatePath("/");
    return NextResponse.json({ option }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
