import { NextResponse } from "next/server";
import { z } from "zod";
import { posSearchProducts } from "@/lib/pos";

const schema = z.object({
  q: z.string().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

/** Counter search (title or SKU — a barcode scanner types the SKU). POS-gated by middleware. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = schema.safeParse({
    q: url.searchParams.get("q") ?? "",
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Type at least 1 character." }, { status: 422 });
  }
  try {
    const products = await posSearchProducts(parsed.data.q, parsed.data.limit);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Search failed — try again." }, { status: 502 });
  }
}
