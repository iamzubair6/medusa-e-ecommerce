import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { setSiteSetting } from "@ecom/cms";
import { checkoutConfigSchema } from "@/lib/checkout-config";

/**
 * Save the admin-managed checkout config — payment methods + shipping
 * presentation overrides (admin-gated by middleware). Shipping *amounts* are
 * edited separately against Medusa via /api/admin/shipping-options/[id].
 */
export async function POST(request: Request) {
  const parsed = checkoutConfigSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid checkout config" },
      { status: 422 },
    );
  }
  await setSiteSetting("checkout", parsed.data);
  revalidatePath("/checkout");
  return NextResponse.json({ ok: true });
}
