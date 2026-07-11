import { NextResponse } from "next/server";
import { adminConfigured, iterateCustomerPages } from "@/lib/medusa-admin";

// 10k rows = up to 20 sequential Medusa pages inside the stream — the default
// serverless timeout would truncate the download mid-file.
export const maxDuration = 60;

/**
 * Escape a CSV field: quote when it contains commas/quotes/newlines, double
 * embedded quotes, and prefix a `'` when the value starts with = + - @ so
 * Excel/Sheets never interpret exported data as a formula.
 */
function csvField(raw: string): string {
  const value = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvRow(fields: string[]): string {
  return `${fields.map(csvField).join(",")}\r\n`;
}

/**
 * Stream ALL customers (paginated internally, capped at 10k rows) as a CSV
 * download. Admin-gated by middleware under /api/admin/*.
 */
export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin API is not configured." }, { status: 503 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(csvRow(["Name", "Email", "Phone", "Joined", "Orders"])));
        for await (const page of iterateCustomerPages()) {
          const chunk = page
            .map((c) =>
              csvRow([
                c.name,
                c.email,
                c.phone ?? "",
                c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : "",
                String(c.orders),
              ]),
            )
            .join("");
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=customers-${date}.csv`,
      "Cache-Control": "no-store",
    },
  });
}
