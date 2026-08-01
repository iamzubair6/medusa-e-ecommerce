import { NextResponse } from "next/server";
import { z } from "zod";
import { getPosSession } from "@/lib/pos-auth";
import { posCheckout } from "@/lib/pos";

const lineSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  title: z.string().min(1).max(200),
  color: z.string().min(1).max(80),
  size: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(99),
});

const schema = z.object({
  lines: z.array(lineSchema).min(1).max(50),
  payment: z.object({
    method: z.enum(["cash", "bkash", "nagad"]),
    txnId: z.string().max(64).optional(),
  }),
  promoCodes: z.array(z.string().min(1).max(64)).max(3).optional(),
  manualDiscountPct: z.number().int().min(1).max(90).optional(),
  customer: z
    .object({
      customerId: z.string().max(64).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(24).optional(),
    })
    .optional(),
  force: z.boolean().optional(),
});

/** Complete a counter sale. POS-gated by middleware; manual discount is ADMIN-only. */
export async function POST(request: Request) {
  const session = await getPosSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid sale payload." },
      { status: 422 },
    );
  }
  if (parsed.data.manualDiscountPct && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Manual discounts need an admin." }, { status: 403 });
  }
  // bKash/Nagad settle against a wallet transaction — require its id.
  if (parsed.data.payment.method !== "cash" && !parsed.data.payment.txnId?.trim()) {
    return NextResponse.json({ error: "Enter the wallet TXN id." }, { status: 422 });
  }

  const result = await posCheckout({
    ...parsed.data,
    cashier: { email: session.email, name: session.name },
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error, warnings: result.warnings }, { status: result.status });
  }
  return NextResponse.json(result);
}
