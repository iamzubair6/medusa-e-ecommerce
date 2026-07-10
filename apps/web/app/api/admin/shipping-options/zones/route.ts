import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createShippingZone } from "@/lib/medusa-admin";

const schema = z.object({
  name: z.string().trim().min(1).max(60),
  countries: z.array(z.string().regex(/^[a-z]{2}$/i, "ISO-2 country code")).min(1).max(60),
});

/** Create a delivery service zone (name + countries). Admin-gated by middleware. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Zone name and at least one country are required" }, { status: 422 });
  }
  try {
    await createShippingZone(parsed.data.name, parsed.data.countries);
    revalidatePath("/");
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
