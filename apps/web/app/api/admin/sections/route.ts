import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSection } from "@ecom/cms";

const schema = z.object({
  pageLayoutId: z.string().min(1),
  type: z.enum(["HERO", "PRODUCT_ROW", "CATEGORY_GRID", "EDITORIAL", "BANNER", "MARQUEE"]),
});

/** Create a section (with a valid starter config) on a page. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "pageLayoutId + valid type required" }, { status: 422 });
  const section = await createSection(parsed.data.pageLayoutId, parsed.data.type);
  revalidatePath("/");
  return NextResponse.json({ section });
}
