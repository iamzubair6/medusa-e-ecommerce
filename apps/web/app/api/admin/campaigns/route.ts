import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { createCampaign, listCampaigns } from "@ecom/cms";

const payloadSchema = z.object({
  promoCode: z.string().max(60).optional(),
  note: z.string().max(300).optional(),
  bannerText: z.string().max(160).optional(),
  bannerHref: z.string().max(200).optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(80),
  status: z.enum(["SCHEDULED", "ACTIVE", "ENDED", "PAUSED"]),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().optional(),
  payload: payloadSchema.optional(),
});

export async function GET() {
  return NextResponse.json({ campaigns: await listCampaigns() });
}

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  try {
    const campaign = await createCampaign({
      name: parsed.data.name,
      status: parsed.data.status,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : null,
      payload: parsed.data.payload,
    });
    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.flatten() }, { status: 422 });
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
