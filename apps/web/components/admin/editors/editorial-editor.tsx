"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@ecom/ui";
import { editorialConfigSchema, type EditorialConfig } from "@ecom/cms";
import { TextField, TextareaField } from "../fields";
import { EnumCombobox } from "../combobox";
import { MediaUploadField } from "../media-upload-field";
import { useSaveSection } from "../use-save-section";

interface Form {
  mediaUrl: string;
  eyebrow: string;
  heading: string;
  body: string;
  imageSide: "left" | "right";
  ctaLabel: string;
  ctaHref: string;
}

export function EditorialEditor({ sectionId, config }: { sectionId: string; config: EditorialConfig }) {
  const { register, handleSubmit, watch, setValue } = useForm<Form>({
    defaultValues: {
      mediaUrl: config.media.url,
      eyebrow: config.eyebrow ?? "",
      heading: config.heading,
      body: config.body ?? "",
      imageSide: config.imageSide,
      ctaLabel: config.cta?.label ?? "",
      ctaHref: config.cta?.href ?? "",
    },
  });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = editorialConfigSchema.safeParse({
      media: { url: f.mediaUrl },
      eyebrow: f.eyebrow || undefined,
      heading: f.heading,
      body: f.body || undefined,
      imageSide: f.imageSide,
      cta: f.ctaLabel.trim() ? { label: f.ctaLabel, href: f.ctaHref || "#" } : undefined,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MediaUploadField label="Image" value={watch("mediaUrl")} onChange={(u) => setValue("mediaUrl", u, { shouldDirty: true })} />
        <EnumCombobox
          label="Image side"
          value={watch("imageSide")}
          onChange={(v) => setValue("imageSide", v, { shouldDirty: true, shouldValidate: true })}
          options={[
            { value: "left", label: "Left" },
            { value: "right", label: "Right" },
          ]}
        />
      </div>
      <TextField label="Eyebrow (optional)" {...register("eyebrow")} />
      <TextField label="Heading" {...register("heading")} />
      <TextareaField label="Body" {...register("body")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="CTA label (optional)" {...register("ctaLabel")} />
        <TextField label="CTA link" {...register("ctaHref")} />
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
