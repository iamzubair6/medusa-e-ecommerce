import { NextResponse } from "next/server";
import { z } from "zod";
import { loginByIdentifier } from "@/lib/customer-auth";

// Accept either { identifier } (email or phone) or legacy { email }.
const schema = z
  .object({
    identifier: z.string().min(1).optional(),
    email: z.string().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((d) => d.identifier || d.email, { message: "Enter your email or phone", path: ["identifier"] });

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your email/phone and password" }, { status: 422 });
  const identifier = (parsed.data.identifier ?? parsed.data.email)!;
  const result = await loginByIdentifier(identifier, parsed.data.password);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Incorrect credentials" }, { status: 401 });
  return NextResponse.json({ ok: true });
}
