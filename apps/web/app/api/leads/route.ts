import { NextResponse } from "next/server";
import { z } from "zod";
import { captureGuestLead } from "@ecom/cms";
import { sendTemplateEmail } from "@/lib/email";
import { requestOrigin } from "@/lib/origin";

const leadSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(5).max(30).optional(),
  capturedFields: z.record(z.unknown()).optional(),
  cartId: z.string().optional(),
  source: z.string().max(40).optional(),
});

/** Capture a guest lead (abandoned info / newsletter / popup) for remarketing. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }
  if (!parsed.data.email && !parsed.data.phone) {
    return NextResponse.json({ error: "email or phone required" }, { status: 422 });
  }

  const lead = await captureGuestLead(parsed.data);

  // First-time newsletter/popup signups get the welcome letter (best-effort,
  // never blocks the capture; checkout-step leads go through cart recovery).
  const source = parsed.data.source ?? "";
  if (lead.created && parsed.data.email && source !== "checkout-step") {
    await sendTemplateEmail("newsletter", parsed.data.email, {
      email: parsed.data.email,
      offersUrl: `${requestOrigin(request)}/offers`,
    }).catch(() => false);
  }
  return NextResponse.json({ id: lead.id }, { status: 201 });
}
