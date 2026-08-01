import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePosAdmin } from "@/lib/pos-auth";
import { posRefund } from "@/lib/pos";

const schema = z.object({
  orderId: z.string().min(1),
  lines: z
    .array(
      z.object({
        productId: z.string().nullable(),
        title: z.string().min(1).max(200),
        color: z.string().max(80),
        size: z.string().max(40),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
});

/** Record a counter refund + restock the returned lines. ADMIN unlocks returns. */
export async function POST(request: Request) {
  const session = await requirePosAdmin();
  if (!session) {
    return NextResponse.json({ error: "Returns need an admin sign-in." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid refund payload." },
      { status: 422 },
    );
  }
  // Quantities are validated and the amount recomputed against the order
  // server-side (lib/pos.ts posRefund) — the client only names the lines.
  const result = await posRefund({ ...parsed.data, by: session.name });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result);
}
