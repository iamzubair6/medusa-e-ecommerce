"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { categoryGridConfigSchema, type CategoryGridConfig } from "@ecom/cms";
import { TextField, SelectField } from "../fields";
import { MediaUploadField } from "../media-upload-field";
import { useSaveSection } from "../use-save-section";

interface Form {
  heading: string;
  columns: string;
  tiles: { url: string; label: string; href: string }[];
}

export function CategoryGridEditor({ sectionId, config }: { sectionId: string; config: CategoryGridConfig }) {
  const { register, handleSubmit, control, watch, setValue } = useForm<Form>({
    defaultValues: {
      heading: config.heading ?? "",
      columns: String(config.columns),
      tiles: config.tiles.map((t) => ({ url: t.media.url, label: t.label, href: t.href })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "tiles" });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = categoryGridConfigSchema.safeParse({
      heading: f.heading || undefined,
      columns: Number(f.columns),
      tiles: f.tiles.map((t) => ({ media: { url: t.url }, label: t.label, href: t.href })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Heading (optional)" {...register("heading")} />
        <SelectField label="Columns" {...register("columns")}>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </SelectField>
      </div>
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        {fields.map((field, i) => (
          <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
            <MediaUploadField label={`Tile ${i + 1} image`} value={watch(`tiles.${i}.url`)} onChange={(u) => setValue(`tiles.${i}.url`, u, { shouldDirty: true })} />
            <TextField label="Label" {...register(`tiles.${i}.label`)} />
            <TextField label="Link" {...register(`tiles.${i}.href`)} />
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
          onClick={() => append({ url: "", label: "", href: "" })}
        >
          <Plus className="h-4 w-4" /> Add tile
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
