import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setSiteSetting } from "@ecom/cms";
import { navigationSchema } from "@/lib/navigation";

/** Save the admin-managed navigation/IA (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = navigationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid navigation" }, { status: 422 });
  }
  await setSiteSetting("navigation", parsed.data);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
