import { NextResponse } from "next/server";
import { z } from "zod";
import { getAbandonedCart, markCartReminded } from "@ecom/cms";
import { sendEmail, renderEmail, emailMockMode } from "@/lib/email";
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
  // Plain-text summary — placeholder values are HTML-escaped by the template fill.
  const lines = items
    .slice(0, 8)
    .map((i) => `${Number(i.quantity) || 1}× ${String(i.title ?? "Item")}`)
    .join(" · ");

  let sent = false;
  if (!emailMockMode()) {
    // Admin-editable "abandonedCart" template.
    const { subject, html } = await renderEmail("abandonedCart", {
      items: lines,
      count: String(cart.itemCount),
      total: cart.total ?? "",
      cartUrl: link,
    });
    sent = await sendEmail({ to: cart.email, subject, html });
  }
  await markCartReminded(cart.id);
  return NextResponse.json({ sent });
}
