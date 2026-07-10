import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSiteSetting, setSiteSetting } from "@ecom/cms";
import { parseShopTheLook, shopTheLookSchema } from "@/lib/shop-the-look";

/** Save the Shop-the-Look hotspot tags (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = shopTheLookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid looks" }, { status: 422 });
  }
  const handles = parsed.data.looks.map((l) => l.productHandle);
  if (new Set(handles).size !== handles.length) {
    return NextResponse.json({ error: "Each product can only have one look." }, { status: 422 });
  }

  const previous = parseShopTheLook(await getSiteSetting("shopTheLook").catch(() => null));
  await setSiteSetting("shopTheLook", parsed.data);

  // Refresh every PDP whose look changed (old + new so removed looks disappear too).
  const affected = new Set([...previous.looks, ...parsed.data.looks].map((l) => l.productHandle));
  for (const handle of affected) revalidatePath(`/products/${handle}`);

  return NextResponse.json({ ok: true });
}
