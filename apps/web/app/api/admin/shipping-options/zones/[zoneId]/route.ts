import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { deleteShippingZone, updateShippingZone } from "@/lib/medusa-admin";

const schema = z
  .object({
    name: z.string().trim().min(1).max(60).optional(),
    countries: z.array(z.string().regex(/^[a-z]{2}$/i, "ISO-2 country code")).min(1).max(60).optional(),
  })
  .refine((v) => v.name !== undefined || v.countries !== undefined, "Nothing to update");

/** Rename a zone / replace its country list. Admin-gated by middleware. */
export async function PATCH(request: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid zone update" }, { status: 422 });
  }
  try {
    await updateShippingZone(zoneId, parsed.data);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}

/** Delete a zone (UI only offers this when the zone has no options). */
export async function DELETE(_request: Request, { params }: { params: Promise<{ zoneId: string }> }) {
  const { zoneId } = await params;
  try {
    await deleteShippingZone(zoneId);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
