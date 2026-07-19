"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { trendRailConfigSchema, type TrendRailConfig } from "@ecom/cms";
import { TextField } from "../fields";
import { MediaUploadField } from "../media-upload-field";
import { useSaveSection } from "../use-save-section";

interface Form {
  heading: string;
  cards: { url: string; label: string; href: string }[];
}

export function TrendRailEditor({ sectionId, config }: { sectionId: string; config: TrendRailConfig }) {
  const { register, handleSubmit, control, watch, setValue } = useForm<Form>({
    defaultValues: {
      heading: config.heading ?? "",
      cards: config.cards.map((c) => ({ url: c.media.url, label: c.label, href: c.href })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "cards" });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = trendRailConfigSchema.safeParse({
      heading: f.heading || undefined,
      cards: f.cards.map((c) => ({ media: { url: c.url }, label: c.label, href: c.href })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField label="Heading (optional)" {...register("heading")} />
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        {fields.map((field, i) => (
          <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <MediaUploadField label={`Card ${i + 1} image`} value={watch(`cards.${i}.url`)} onChange={(u) => setValue(`cards.${i}.url`, u, { shouldDirty: true })} />
            <TextField label="Label" {...register(`cards.${i}.label`)} />
            <TextField label="Link" {...register(`cards.${i}.href`)} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={fields.length >= 12}
          onClick={() => append({ url: "", label: "", href: "" })}
        >
          <Plus className="h-4 w-4" /> Add card
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" variant="gold" loading={save.isPending}>
          Save
        </Button>
        {error && (
          <span className="text-sm text-destructive">{error}</span>
        )}
      </div>
    </form>
  );
}
