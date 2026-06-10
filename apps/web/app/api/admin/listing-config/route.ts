import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setSiteSetting } from "@ecom/cms";
import { listingConfigSchema } from "@/lib/listing-config";

/** Save the admin-managed per-listing config (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = listingConfigSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing config" }, { status: 422 });
  }
  await setSiteSetting("listingConfig", parsed.data);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
