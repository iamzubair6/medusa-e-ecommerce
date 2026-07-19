"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { marqueeConfigSchema, type MarqueeConfig } from "@ecom/cms";
import { TextField } from "../fields";
import { useSaveSection } from "../use-save-section";

interface Form {
  items: { value: string }[];
  speedSeconds: number;
}

export function MarqueeEditor({ sectionId, config }: { sectionId: string; config: MarqueeConfig }) {
  const { register, handleSubmit, control } = useForm<Form>({
    defaultValues: { items: config.items.map((value) => ({ value })), speedSeconds: config.speedSeconds },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = marqueeConfigSchema.safeParse({
      items: f.items.map((i) => i.value).filter(Boolean),
      speedSeconds: Number(f.speedSeconds),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {fields.map((field, i) => (
          <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <TextField label={`Message ${i + 1}`} {...register(`items.${i}.value`)} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => append({ value: "" })}>
          <Plus className="h-4 w-4" /> Add message
        </Button>
      </div>
      <TextField label="Scroll speed (seconds)" type="number" className="max-w-48" {...register("speedSeconds")} />
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
