import { NextResponse } from "next/server";
import { z } from "zod";
import { captureGuestLead } from "@ecom/cms";

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
  return NextResponse.json({ id: lead.id }, { status: 201 });
}
