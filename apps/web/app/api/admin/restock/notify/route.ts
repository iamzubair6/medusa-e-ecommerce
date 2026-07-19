import { NextResponse } from "next/server";
import { z } from "zod";
import { markRestockNotified, pendingRestockForVariant } from "@ecom/cms";
import { sendEmail, emailShell, emailMockMode, escapeHtml } from "@/lib/email";
import { requestOrigin } from "@/lib/origin";

const bodySchema = z.object({ variantId: z.string().min(1).max(120) });

/**
 * Email everyone waiting on a restocked variant, then mark them notified.
 * Admin-gated by middleware. Best-effort email (mock mode just marks notified).
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "variantId required" }, { status: 422 });
  }
  const subs = await pendingRestockForVariant(parsed.data.variantId);
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, marked: 0 });
  }

  const origin = requestOrigin(request);
  const first = subs[0]!;
  const link = `${origin}/products/${first.productHandle}`;
  let sent = 0;
  if (!emailMockMode()) {
    for (const sub of subs) {
      const ttl = escapeHtml(sub.productTitle);
      const sz = escapeHtml(sub.size);
      const ok = await sendEmail({
        to: sub.email,
        subject: `Back in stock: ${sub.productTitle} (${sub.size})`,
        html: emailShell(
          "It's back!",
          `<p><strong>${ttl}</strong> — size ${sz} — is back in stock.</p>
           <p>Popular sizes sell out fast, so grab yours now.</p>
           <p><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Shop now</a></p>`,
        ),
      });
      if (ok) sent += 1;
    }
  }
  await markRestockNotified(subs.map((s) => s.id));
  return NextResponse.json({ sent, marked: subs.length });
}
