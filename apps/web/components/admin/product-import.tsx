"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, Card, cn } from "@ecom/ui";
import { useToast } from "./toast";
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  type ImportCommitResponse,
  type ImportPreviewResponse,
} from "@/lib/product-import-types";

async function postImport<T>(file: File, mode: "preview" | "commit"): Promise<T> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`/api/admin/products/import?mode=${mode}`, { method: "POST", body: fd });
  const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !data) {
    throw new Error(data?.error ?? `Import request failed (${res.status}).`);
  }
  return data;
}

export function ProductImport() {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [commitResult, setCommitResult] = useState<ImportCommitResponse | null>(null);

  const preview = useMutation({
    mutationFn: (f: File) => postImport<ImportPreviewResponse>(f, "preview"),
    onError: (error: Error) => toast.error(error.message),
  });

  const commit = useMutation({
    mutationFn: (f: File) => postImport<ImportCommitResponse>(f, "commit"),
    onSuccess: (data) => {
      setCommitResult(data);
      if (data.created.length > 0) {
        toast.success(`Imported ${data.created.length} product${data.created.length === 1 ? "" : "s"}.`);
      }
      if (data.failed.length > 0) {
        toast.error(`${data.failed.length} row${data.failed.length === 1 ? "" : "s"} failed — see details below.`);
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const selectFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      toast.error("Only .xlsx files are accepted — download the template first.");
      return;
    }
    if (f.size > IMPORT_MAX_FILE_BYTES) {
      toast.error("File is larger than 5MB.");
      return;
    }
    setFile(f);
    setCommitResult(null);
    commit.reset();
    preview.mutate(f);
  };

  const clearFile = () => {
    setFile(null);
    setCommitResult(null);
    preview.reset();
    commit.reset();
    if (inputRef.current) inputRef.current.value = "";
  };

  const rows = preview.data?.rows ?? [];
  const validCount = preview.data?.valid ?? 0;

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      {/* Step 1 — template */}
      <Card className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">1 · Download the template</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          One row per product. Dropdowns for division, category, collection, size set and offer type are
          pre-filled from the live catalog; multi-value cells (colors, sizes, image URLs…) are comma-separated.
          The “Instructions” sheet inside explains every column. Limits: {IMPORT_MAX_ROWS} products per file, 5MB.
        </p>
        <Button asChild variant="outline" className="w-fit">
          <a href="/api/admin/products/import/template" download>
            <Download className="h-4 w-4" /> Download Excel template
          </a>
        </Button>
      </Card>

      {/* Step 2 — upload */}
      <Card className="flex flex-col gap-4 p-6">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-display text-lg font-bold">2 · Upload your filled file</h2>
        </div>

        {!file && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped) selectFile(dropped);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-6 py-12 text-center transition-colors",
              dragActive ? "border-foreground bg-muted" : "border-border hover:border-foreground",
            )}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Drop your .xlsx here, or click to browse</span>
            <span className="text-xs text-muted-foreground">Up to {IMPORT_MAX_ROWS} products · 5MB max</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) selectFile(f);
          }}
        />

        {file && (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Remove file"
              onClick={clearFile}
              className="cursor-pointer p-1.5 text-muted-foreground transition-colors hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {preview.isPending && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> Checking every row…
          </div>
        )}
        {preview.isError && (
          <p className="text-sm text-destructive">{preview.error.message}</p>
        )}
        {preview.isSuccess && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No filled rows found — add products under the header row (the grey EXAMPLE rows are skipped).
          </p>
        )}
      </Card>

      {/* Step 3 — preview + import */}
      {preview.isSuccess && rows.length > 0 && !commitResult && (
        <Card className="flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">3 · Review &amp; import</h2>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="gold">{validCount} valid</Badge>
              {preview.data.invalid > 0 && <Badge variant="outline">{preview.data.invalid} with errors</Badge>}
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Details</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={cn(
                      "border-b border-border last:border-b-0",
                      row.ok ? "bg-gold/5" : "bg-destructive/5",
                    )}
                  >
                    <td className="px-3 py-2.5 align-top font-medium text-muted-foreground">{row.rowNumber}</td>
                    <td className="px-3 py-2.5 align-top font-medium">
                      {row.ok ? row.product.title : (row.title ?? "(untitled)")}
                    </td>
                    <td className="px-3 py-2.5 align-top text-muted-foreground">
                      {row.ok ? (
                        <span>
                          {[
                            row.product.division,
                            row.product.categories.join(" · ") || undefined,
                            row.product.colors.join(", "),
                            row.product.sizes.join("/"),
                            `৳${row.product.price.toLocaleString("en-US")}`,
                            `${row.product.images} image${row.product.images === 1 ? "" : "s"}`,
                            row.product.offer,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      ) : (
                        <ul className="flex list-disc flex-col gap-0.5 pl-4 text-destructive">
                          {row.errors.map((e, i) => (
                            <li key={i}>{e}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {row.ok ? (
                        <span className="flex items-center gap-1 text-gold">
                          <CheckCircle2 className="h-4 w-4" /> Valid
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-destructive">
                          <XCircle className="h-4 w-4" /> Fix row
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="gold"
              disabled={validCount === 0}
              loading={commit.isPending}
              onClick={() => file && commit.mutate(file)}
            >
              Import {validCount} valid product{validCount === 1 ? "" : "s"}
            </Button>
            {preview.data.invalid > 0 && (
              <p className="text-xs text-muted-foreground">
                Rows with errors are skipped — fix them in the file and re-upload to include them.
              </p>
            )}
          </div>
          {commit.isError && <p className="text-sm text-destructive">{commit.error.message}</p>}
        </Card>
      )}

      {/* Step 4 — results */}
      {commitResult && (
        <Card className="flex flex-col gap-4 p-6">
          <h2 className="font-display text-lg font-bold">Import complete</h2>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="gold">{commitResult.created.length} created</Badge>
            {commitResult.failed.length > 0 && <Badge variant="outline">{commitResult.failed.length} failed</Badge>}
          </div>
          {commitResult.created.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {commitResult.created.map((c) => (
                <li key={c.id} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" /> Row {c.rowNumber}: {c.title}
                </li>
              ))}
            </ul>
          )}
          {commitResult.failed.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm">
              {commitResult.failed.map((f) => (
                <li key={f.rowNumber} className="flex items-start gap-2 text-destructive">
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Row {f.rowNumber} ({f.title}): {f.errors.join("; ")}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-3">
            <Button asChild variant="gold">
              <a href="/admin/products">View products</a>
            </Button>
            <Button type="button" variant="outline" onClick={clearFile}>
              Import another file
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
