import { NextResponse } from "next/server";
import { adminConfigured, listCategoriesFull, listCollectionsFull } from "@/lib/medusa-admin";
import { buildTemplateWorkbook } from "@/lib/product-import";

export const dynamic = "force-dynamic";

/**
 * Download the bulk product import template (.xlsx). Category and collection
 * dropdowns are populated from the live catalog at generation time.
 * Admin-gated by middleware.
 */
export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin is not configured." }, { status: 503 });
  }
  try {
    const [categories, collections] = await Promise.all([listCategoriesFull(), listCollectionsFull()]);
    const workbook = buildTemplateWorkbook({
      categories: categories.map((c) => ({ handle: c.handle, name: c.name })),
      collections: collections.map((c) => ({ handle: c.handle, title: c.title })),
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="product-import-template.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate the template.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
