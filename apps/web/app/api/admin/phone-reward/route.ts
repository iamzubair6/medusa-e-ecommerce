import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { phoneRewardSchema } from "@/lib/phone-reward";

/** Save the phone-verification reward config (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = phoneRewardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid config" }, { status: 422 });
  }
  if (parsed.data.kind === "percentage" && parsed.data.value > 100) {
    return NextResponse.json({ error: "Percentage cannot exceed 100." }, { status: 422 });
  }
  await setSiteSetting("phoneReward", parsed.data);
  return NextResponse.json({ ok: true });
}
