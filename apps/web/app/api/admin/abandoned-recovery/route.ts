import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { abandonedRecoverySchema } from "@/lib/recovery-incentive";

/** Save the abandoned-cart recovery incentive config (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = abandonedRecoverySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid config" }, { status: 422 });
  }
  await setSiteSetting("abandonedRecovery", parsed.data);
  return NextResponse.json({ ok: true });
}
