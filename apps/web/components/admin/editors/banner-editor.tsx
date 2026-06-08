"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@ecom/ui";
import { bannerConfigSchema, type BannerConfig } from "@ecom/cms";
import { TextField, SelectField } from "../fields";
import { MediaUploadField } from "../media-upload-field";
import { useSaveSection } from "../use-save-section";

interface Form {
  heading: string;
  theme: "light" | "dark" | "gold";
  mediaUrl: string;
  ctaLabel: string;
  ctaHref: string;
}

export function BannerEditor({ sectionId, config }: { sectionId: string; config: BannerConfig }) {
  const { register, handleSubmit, watch, setValue } = useForm<Form>({
    defaultValues: {
      heading: config.heading,
      theme: config.theme,
      mediaUrl: config.media?.url ?? "",
      ctaLabel: config.cta?.label ?? "",
      ctaHref: config.cta?.href ?? "",
    },
  });
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const parsed = bannerConfigSchema.safeParse({
      heading: f.heading,
      theme: f.theme,
      media: f.mediaUrl ? { url: f.mediaUrl } : undefined,
      cta: f.ctaLabel.trim() ? { label: f.ctaLabel, href: f.ctaHref || "#" } : undefined,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField label="Heading" {...register("heading")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Theme" {...register("theme")}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="gold">Gold</option>
        </SelectField>
        <MediaUploadField label="Background image (optional)" accept="image/*,video/*" value={watch("mediaUrl")} onChange={(u) => setValue("mediaUrl", u, { shouldDirty: true })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="CTA label" {...register("ctaLabel")} />
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
