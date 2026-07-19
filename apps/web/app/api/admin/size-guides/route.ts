import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setSiteSetting } from "@ecom/cms";
import { sizeGuidesSettingSchema } from "@/lib/size-guides";

/** Save the structured size guides (admin → /admin/size-guides). */
export async function POST(request: Request) {
  const parsed = sizeGuidesSettingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid size guides" },
      { status: 422 },
    );
  }
  await setSiteSetting("sizeGuides", parsed.data);
  revalidatePath("/products/[handle]", "page");
  return NextResponse.json({ ok: true });
}
