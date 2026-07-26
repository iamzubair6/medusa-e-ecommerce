import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { setPromoPublic } from "@/lib/public-promos";

const schema = z.object({
  code: z.string().min(2).max(60),
  public: z.boolean(),
});

/** Flag a promo code as publicly visible (offers page) or hide it (#140). */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  await setPromoPublic(parsed.data.code, parsed.data.public);
  revalidateTag("promo-suggestions");
  return NextResponse.json({ ok: true });
}
