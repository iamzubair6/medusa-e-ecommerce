"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { RichTextField } from "./rich-text-field";
import { useToast } from "./toast";
import { contentPagesSchema, type ContentPages } from "@/lib/content-pages";
import { useState } from "react";

/**
 * Admin editor for footer/company/legal content pages (RHF + Zod, collapsible rows).
 * Saves the "contentPages" SiteSetting via /api/admin/content-pages.
 */
export function ContentPagesEditor({ initial }: { initial: ContentPages }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ index: number; label: string } | null>(null);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContentPages>({
    resolver: zodResolver(contentPagesSchema),
    defaultValues: initial,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "pages" });

  const onSubmit = async (values: ContentPages) => {
    try {
      const res = await fetch("/api/admin/content-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Content pages saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-4">
      {fields.map((field, i) => {
        const slug = watch(`pages.${i}.slug`);
        const title = watch(`pages.${i}.title`);
        const enabled = watch(`pages.${i}.enabled`);
        const isOpen = open === i;
        return (
          <Card key={field.id} className="p-0">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="flex items-center gap-3">
                <span className="font-display font-bold">{title || "Untitled page"}</span>
                <span className="text-xs text-muted-foreground">/{slug}</span>
                {!enabled && (
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    hidden
                  </span>
                )}
              </span>
              {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>

            {isOpen && (
              <div className="flex flex-col gap-4 border-t border-border px-5 py-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <TextField
                    label="Title"
                    required
                    error={errors.pages?.[i]?.title?.message}
                    {...register(`pages.${i}.title`)}
                  />
                  <TextField
                    label="Slug (URL path, e.g. help/shipping)"
                    required
                    error={errors.pages?.[i]?.slug?.message}
                    {...register(`pages.${i}.slug`)}
                  />
                </div>
                <Controller
                  control={control}
                  name={`pages.${i}.body`}
                  render={({ field: body }) => (
                    <RichTextField label="Page content" value={body.value} onChange={body.onChange} />
                  )}
                />
                <div className="flex items-center justify-between">
                  <CheckboxField label="Visible on the storefront" {...register(`pages.${i}.enabled`)} />
                  <div className="flex items-center gap-2">
                    <a
                      href={`/${slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-2"
                    >
                      <ExternalLink className="h-3 w-3" /> View page
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingDelete({ index: i, label: title || slug })}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {errors.pages?.root?.message && <p className="text-sm text-destructive">{errors.pages.root.message}</p>}

      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            append({ slug: "", title: "", body: "", enabled: true });
            setOpen(fields.length);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add page
        </Button>
        <Button type="submit" variant="gold" loading={isSubmitting}>
          Save content pages
        </Button>
      </div>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete the "${pendingDelete?.label ?? ""}" page?`}
        description="Its content is gone once you save."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (!pendingDelete) return;
          remove(pendingDelete.index);
          setOpen(null);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </form>
  );
}
