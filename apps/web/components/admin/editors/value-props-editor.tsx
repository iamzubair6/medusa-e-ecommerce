"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { valuePropsConfigSchema, valuePropIcons, type ValuePropsConfig, type ValuePropIcon } from "@ecom/cms";
import { TextField } from "../fields";
import { EnumCombobox } from "../combobox";
import { useSaveSection } from "../use-save-section";

interface Form {
  items: { icon: ValuePropIcon; label: string; sublabel: string }[];
}

const ICON_OPTIONS = valuePropIcons.map((icon) => ({
  value: icon,
  label: icon.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
}));

export function ValuePropsEditor({ sectionId, config }: { sectionId: string; config: ValuePropsConfig }) {
  const { register, handleSubmit, control, watch, setValue } = useForm<Form>({
    defaultValues: {
      items: config.items.map((it) => ({ icon: it.icon, label: it.label, sublabel: it.sublabel ?? "" })),
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = valuePropsConfigSchema.safeParse({
      items: f.items.map((it) => ({ icon: it.icon, label: it.label, sublabel: it.sublabel || undefined })),
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-md border border-border p-4">
        {fields.map((field, i) => (
          <div key={field.id} className="grid gap-3 sm:grid-cols-[12rem_1fr_1fr_auto] sm:items-end">
            <EnumCombobox<ValuePropIcon>
              label="Icon"
              value={watch(`items.${i}.icon`)}
              onChange={(v) => setValue(`items.${i}.icon`, v, { shouldDirty: true, shouldValidate: true })}
              options={ICON_OPTIONS}
            />
            <TextField label="Label" {...register(`items.${i}.label`)} />
            <TextField label="Sublabel (optional)" {...register(`items.${i}.sublabel`)} />
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
          disabled={fields.length >= 6}
          onClick={() => append({ icon: "truck", label: "", sublabel: "" })}
        >
          <Plus className="h-4 w-4" /> Add badge
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
