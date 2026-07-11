import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  adminConfigured,
  createProduct,
  listAdminProducts,
  listCategoriesFull,
  listCollectionsFull,
} from "@/lib/medusa-admin";
import { ImportFileError, parseImportFile, type ImportContext } from "@/lib/product-import";
import {
  IMPORT_MAX_FILE_BYTES,
  type ImportCommitResponse,
  type ImportPreviewResponse,
  type ImportPreviewRow,
} from "@/lib/product-import-types";

export const dynamic = "force-dynamic";
// Up to 200 sequential product creations — the platform default timeout would
// kill the function mid-import and invite duplicate re-uploads.
export const maxDuration = 300;

/** Medusa derives handles from titles the same way. */
const titleToHandle = (title: string) =>
  title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * Bulk product import. POST an .xlsx as multipart FormData (field "file").
 * ?mode=preview → validate every row, return per-row results (nothing created).
 * ?mode=commit  → re-parse and create the valid rows sequentially via createProduct.
 * Admin-gated by middleware. Caps: 200 rows, 5MB.
 */
export async function POST(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") ?? "preview";
  if (mode !== "preview" && mode !== "commit") {
    return NextResponse.json({ error: 'mode must be "preview" or "commit".' }, { status: 400 });
  }
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Medusa admin is not configured." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Attach the spreadsheet as FormData field "file".' }, { status: 422 });
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return NextResponse.json({ error: "Only .xlsx files are accepted — use the downloaded template." }, { status: 422 });
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File is larger than 5MB." }, { status: 413 });
  }

  try {
    const [categories, collections] = await Promise.all([listCategoriesFull(), listCollectionsFull()]);
    const ctx: ImportContext = {
      categories: new Map(categories.map((c) => [c.handle.toLowerCase(), { id: c.id, name: c.name }])),
      collections: new Map(collections.map((c) => [c.handle.toLowerCase(), { id: c.id, title: c.title }])),
    };
    const rows = await parseImportFile(await file.arrayBuffer(), ctx);

    if (mode === "preview") {
      const previewRows: ImportPreviewRow[] = rows.map((r) =>
        r.ok
          ? { rowNumber: r.rowNumber, ok: true, product: r.summary }
          : { rowNumber: r.rowNumber, ok: false, title: r.title, errors: r.errors },
      );
      const body: ImportPreviewResponse = {
        total: rows.length,
        valid: previewRows.filter((r) => r.ok).length,
        invalid: previewRows.filter((r) => !r.ok).length,
        rows: previewRows,
      };
      return NextResponse.json(body);
    }

    // commit — create valid rows one at a time so one failure can't sink the batch.
    // Existing handles are skipped: makes re-running a partially-imported file
    // (timeout, double-click) safe instead of duplicating products.
    const existingHandles = new Set<string>();
    for (let offset = 0; ; offset += 200) {
      const page = await listAdminProducts(200, offset);
      page.products.forEach((p) => existingHandles.add(p.handle.toLowerCase()));
      if (offset + 200 >= page.count) break;
    }

    const result: ImportCommitResponse = { created: [], failed: [] };
    for (const row of rows) {
      if (!row.ok) {
        result.failed.push({ rowNumber: row.rowNumber, title: row.title ?? "(untitled)", errors: row.errors });
        continue;
      }
      const handle = titleToHandle(row.product.title);
      if (existingHandles.has(handle)) {
        result.failed.push({
          rowNumber: row.rowNumber,
          title: row.product.title,
          errors: ["Skipped — a product with this title/handle already exists."],
        });
        continue;
      }
      existingHandles.add(handle);
      try {
        const { id } = await createProduct(row.product);
        result.created.push({ rowNumber: row.rowNumber, id, title: row.product.title });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Product creation failed.";
        result.failed.push({ rowNumber: row.rowNumber, title: row.product.title, errors: [message] });
      }
    }
    if (result.created.length > 0) {
      revalidatePath("/");
      revalidatePath("/admin/products");
    }
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ImportFileError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
