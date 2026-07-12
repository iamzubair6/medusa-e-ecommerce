import { NextResponse } from "next/server";
import { setSiteSetting } from "@ecom/cms";
import { smsTemplatesSchema } from "@/lib/sms-templates";

/** Save the SMS templates (admin-gated by middleware). */
export async function POST(request: Request) {
  const parsed = smsTemplatesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid templates" }, { status: 422 });
  }
  // Operator compliance: the brand name must appear in every SMS body.
  for (const [key, text] of Object.entries({ otp: parsed.data.otp, orderConfirmation: parsed.data.orderConfirmation })) {
    if (!text.includes("{company}") && !text.toLowerCase().includes(parsed.data.companyName.toLowerCase())) {
      return NextResponse.json(
        { error: `The "${key}" template must contain {company} (operators require the brand name in every SMS).` },
        { status: 422 },
      );
    }
  }
  await setSiteSetting("smsTemplates", parsed.data);
  return NextResponse.json({ ok: true });
}
