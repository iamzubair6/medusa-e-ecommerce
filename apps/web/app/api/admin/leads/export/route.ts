import { NextResponse } from "next/server";
import { listGuestLeads } from "@ecom/cms";

/** Same CSV escaping as the customers export (quotes + formula-injection guard). */
function csvField(raw: string): string {
  const value = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

const csvRow = (fields: string[]): string => `${fields.map(csvField).join(",")}\r\n`;

/** Download all guest leads (capped at 5k) as CSV. Admin-gated by middleware. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const source = url.searchParams.get("source") || undefined;
  const hasParam = url.searchParams.get("has");
  const has = hasParam === "email" || hasParam === "phone" ? hasParam : undefined;

  let csv = csvRow(["Email", "Phone", "Source", "Cart", "Captured"]);
  for (let skip = 0; skip < 5000; skip += 100) {
    const { items, total } = await listGuestLeads({ skip, take: 100, source, has });
    for (const lead of items) {
      csv += csvRow([
        lead.email ?? "",
        lead.phone ?? "",
        lead.source ?? "",
        lead.cartId ? "yes" : "",
        lead.createdAt.toISOString().slice(0, 10),
      ]);
    }
    if (skip + items.length >= total || items.length === 0) break;
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${today}.csv"`,
    },
  });
}
