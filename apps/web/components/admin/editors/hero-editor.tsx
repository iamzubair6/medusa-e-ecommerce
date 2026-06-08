"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@ecom/ui";
import { heroConfigSchema, type HeroConfig } from "@ecom/cms";
import { TextField, TextareaField, SelectField } from "../fields";
import { MediaUploadField } from "../media-upload-field";
import { useSaveSection } from "../use-save-section";

/** Form shape mirrors HeroConfig but keeps optional objects always present for RHF. */
interface HeroForm {
  mode: "video" | "carousel";
  eyebrow: string;
  headline: string;
  subheadline: string;
  theme: "light" | "dark";
  align: "left" | "center" | "right";
  autoplayMs: number;
  videoUrl: string;
  posterUrl: string;
  ctaLabel: string;
  ctaHref: string;
  slides: { url: string; alt: string }[];
}

function toForm(config: HeroConfig): HeroForm {
  return {
    mode: config.mode,
    eyebrow: config.eyebrow ?? "",
    headline: config.headline,
    subheadline: config.subheadline ?? "",
    theme: config.theme,
    align: config.align,
    autoplayMs: config.autoplayMs,
    videoUrl: config.video?.url ?? "",
    posterUrl: config.video?.poster ?? "",
    ctaLabel: config.cta?.label ?? "",
    ctaHref: config.cta?.href ?? "",
    slides: (config.slides ?? []).map((s) => ({ url: s.media.url, alt: s.media.alt ?? "" })),
  };
}

function fromForm(f: HeroForm): unknown {
  const cta = f.ctaLabel.trim() ? { label: f.ctaLabel, href: f.ctaHref || "#" } : undefined;
  return {
    mode: f.mode,
    eyebrow: f.eyebrow || undefined,
    headline: f.headline,
    subheadline: f.subheadline || undefined,
    theme: f.theme,
    align: f.align,
    autoplayMs: Number(f.autoplayMs),
    cta,
    video: f.mode === "video" ? { url: f.videoUrl, poster: f.posterUrl || undefined } : undefined,
    slides:
      f.mode === "carousel"
        ? f.slides.map((s) => ({ media: { url: s.url, alt: s.alt || undefined } }))
        : undefined,
  };
}

export function HeroEditor({ sectionId, config }: { sectionId: string; config: HeroConfig }) {
  const { register, handleSubmit, watch, setValue, control } = useForm<HeroForm>({ defaultValues: toForm(config) });
  const { fields, append, remove } = useFieldArray({ control, name: "slides" });
  const mode = watch("mode");
  const save = useSaveSection(sectionId);
  const [validationError, setValidationError] = useState<string | null>(null);

  const onSubmit = (values: HeroForm) => {
    setValidationError(null);
    const candidate = fromForm(values);
    const parsed = heroConfigSchema.safeParse(candidate);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      setValidationError(first ? `${first.path.join(".")}: ${first.message}` : "Invalid hero config");
      return;
    }
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Mode" {...register("mode")}>
          <option value="carousel">Carousel (image slides)</option>
          <option value="video">Video background</option>
        </SelectField>
        <SelectField label="Theme" {...register("theme")}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </SelectField>
      </div>

      <TextField label="Eyebrow" placeholder="Summer 2026" {...register("eyebrow")} />
      <TextField label="Headline" placeholder="Own the Season" {...register("headline")} />
      <TextareaField label="Subheadline" {...register("subheadline")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="CTA label" placeholder="Shop New In" {...register("ctaLabel")} />
        <TextField label="CTA link" placeholder="/collections/new" {...register("ctaHref")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Text alignment" {...register("align")}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </SelectField>
        {mode === "carousel" && (
          <TextField label="Autoplay (ms)" type="number" {...register("autoplayMs")} />
        )}
      </div>

      {mode === "video" ? (
        <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
          <MediaUploadField label="Video (mp4)" accept="video/*" value={watch("videoUrl")} onChange={(u) => setValue("videoUrl", u, { shouldDirty: true })} />
          <MediaUploadField label="Poster image" value={watch("posterUrl")} onChange={(u) => setValue("posterUrl", u, { shouldDirty: true })} />
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-md border border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Slides
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ url: "", alt: "" })}
            >
              <Plus className="h-4 w-4" /> Add slide
            </Button>
          </div>
          {fields.map((field, i) => (
            <div key={field.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <MediaUploadField label={`Slide ${i + 1} image`} value={watch(`slides.${i}.url`)} onChange={(u) => setValue(`slides.${i}.url`, u, { shouldDirty: true })} />
              <TextField label="Alt text" {...register(`slides.${i}.alt`)} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remove slide" onClick={() => remove(i)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">No slides yet — add at least one.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="gold" loading={save.isPending}>
          Save hero
        </Button>
        {save.isSuccess && <span className="text-sm text-gold">Saved</span>}
        {(validationError || save.isError) && (
          <span className="text-sm text-destructive">
            {validationError ?? (save.error as Error)?.message}
          </span>
        )}
      </div>
    </form>
  );
}
