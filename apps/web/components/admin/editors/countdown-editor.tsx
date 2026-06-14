"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@ecom/ui";
import { countdownConfigSchema, type CountdownConfig } from "@ecom/cms";
import { TextField, TextareaField } from "../fields";
import { EnumCombobox } from "../combobox";
import { useSaveSection } from "../use-save-section";

interface Form {
  heading: string;
  subheading: string;
  endsAtLocal: string;
  theme: "light" | "dark" | "claret";
  ctaLabel: string;
  ctaHref: string;
}

/** ISO string -> value for a <input type="datetime-local"> (local time, no tz). */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}

export function CountdownEditor({ sectionId, config }: { sectionId: string; config: CountdownConfig }) {
  const { register, handleSubmit, watch, setValue } = useForm<Form>({
    defaultValues: {
      heading: config.heading,
      subheading: config.subheading ?? "",
      endsAtLocal: isoToLocalInput(config.endsAt),
      theme: config.theme,
      ctaLabel: config.cta?.label ?? "",
      ctaHref: config.cta?.href ?? "",
    },
  });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const endsAtDate = f.endsAtLocal ? new Date(f.endsAtLocal) : new Date(NaN);
    if (Number.isNaN(endsAtDate.getTime())) return setError("Please pick a valid end date & time.");
    const parsed = countdownConfigSchema.safeParse({
      heading: f.heading,
      subheading: f.subheading || undefined,
      endsAt: endsAtDate.toISOString(),
      theme: f.theme,
      cta: f.ctaLabel.trim() ? { label: f.ctaLabel, href: f.ctaHref || "#" } : undefined,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField label="Heading" {...register("heading")} />
      <TextareaField label="Subheading (optional)" {...register("subheading")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Ends at" type="datetime-local" {...register("endsAtLocal")} />
        <EnumCombobox
          label="Theme"
          value={watch("theme")}
          onChange={(v) => setValue("theme", v, { shouldDirty: true, shouldValidate: true })}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "claret", label: "Claret" },
          ]}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="CTA label (optional)" {...register("ctaLabel")} />
        <TextField label="CTA link" {...register("ctaHref")} />
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
