import { NextResponse } from "next/server";
import { z } from "zod";
import { getAbandonedCart, markCartReminded } from "@ecom/cms";
import { sendEmail, emailShell, emailMockMode, escapeHtml } from "@/lib/email";
import { requestOrigin } from "@/lib/origin";

const bodySchema = z.object({ id: z.string().min(1).max(120) });

/** Send a recovery email for one abandoned cart, then mark it reminded. */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "id required" }, { status: 422 });
  const cart = await getAbandonedCart(parsed.data.id);
  if (!cart) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (cart.recoveredAt) return NextResponse.json({ error: "Already recovered" }, { status: 409 });

  const link = `${requestOrigin(request)}/cart`;
  const items = (Array.isArray(cart.items) ? cart.items : []) as { title?: unknown; quantity?: unknown }[];
  const lines = items
    .slice(0, 8)
    .map((i) => `<li>${Number(i.quantity) || 1}× ${escapeHtml(String(i.title ?? "Item"))}</li>`)
    .join("");

  let sent = false;
  if (!emailMockMode()) {
    sent = await sendEmail({
      to: cart.email,
      subject: "You left something behind 🛍️",
      html: emailShell(
        "Still thinking it over?",
        `<p>Your bag is waiting — ${cart.itemCount} item${cart.itemCount === 1 ? "" : "s"}${cart.total ? `, ${cart.total}` : ""}.</p>
         <ul>${lines}</ul>
         <p><a href="${link}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none">Complete your order</a></p>`,
      ),
    });
  }
  await markCartReminded(cart.id);
  return NextResponse.json({ sent });
}
