"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { promoSplitConfigSchema, type PromoSplitConfig } from "@ecom/cms";
import { TextField } from "../fields";
import { EnumCombobox } from "../combobox";
import { MediaUploadField } from "../media-upload-field";
import { useSaveSection } from "../use-save-section";

interface CardForm {
  url: string;
  eyebrow: string;
  heading: string;
  subheading: string;
  ctaLabel: string;
  ctaHref: string;
}

interface Form {
  heading: string;
  columns: string;
  cards: CardForm[];
}

export function PromoSplitEditor({ sectionId, config }: { sectionId: string; config: PromoSplitConfig }) {
  const { register, handleSubmit, control, watch, setValue } = useForm<Form>({
    defaultValues: {
      heading: config.heading ?? "",
      columns: String(config.columns),
      cards: config.cards.map((c) => ({
        url: c.media.url,
        eyebrow: c.eyebrow ?? "",
        heading: c.heading,
        subheading: c.subheading ?? "",
        ctaLabel: c.cta?.label ?? "",
        ctaHref: c.cta?.href ?? "",
      })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "cards" });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = promoSplitConfigSchema.safeParse({
      heading: f.heading || undefined,
      columns: Number(f.columns),
      cards: f.cards.map((c) => ({
        media: { url: c.url },
        eyebrow: c.eyebrow || undefined,
        heading: c.heading,
        subheading: c.subheading || undefined,
        cta: c.ctaLabel.trim() ? { label: c.ctaLabel, href: c.ctaHref || "#" } : undefined,
      })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Heading (optional)" {...register("heading")} />
        <EnumCombobox<string>
          label="Columns"
          value={watch("columns")}
          onChange={(v) => setValue("columns", v, { shouldDirty: true, shouldValidate: true })}
          options={[
            { value: "2", label: "2" },
            { value: "3", label: "3" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-4 rounded-md border border-border p-4">
        {fields.map((field, i) => (
          <div key={field.id} className="flex flex-col gap-3 rounded-sm border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Card {i + 1}</span>
              <Button type="button" variant="ghost" size="icon" aria-label="Remove card" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <MediaUploadField label="Image" value={watch(`cards.${i}.url`)} onChange={(u) => setValue(`cards.${i}.url`, u, { shouldDirty: true })} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="Eyebrow (optional)" {...register(`cards.${i}.eyebrow`)} />
              <TextField label="Heading" {...register(`cards.${i}.heading`)} />
            </div>
            <TextField label="Subheading (optional)" {...register(`cards.${i}.subheading`)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField label="CTA label (optional)" {...register(`cards.${i}.ctaLabel`)} />
              <TextField label="CTA link" {...register(`cards.${i}.ctaHref`)} />
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={fields.length >= 3}
          onClick={() => append({ url: "", eyebrow: "", heading: "", subheading: "", ctaLabel: "", ctaHref: "" })}
        >
          <Plus className="h-4 w-4" /> Add card
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="gold" loading={save.isPending}>
          Save
        </Button>
        {save.isSuccess && <span className="text-sm text-gold">Saved</span>}
        {(error || save.isError) && (
          <span className="text-sm text-destructive">{error ?? (save.error as Error)?.message}</span>
        )}
      </div>
    </form>
  );
}
