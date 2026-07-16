"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@ecom/ui";
import { productRowConfigSchema, type ProductRowConfig } from "@ecom/cms";
import { TextField } from "../fields";
import { EnumCombobox } from "../combobox";
import { useSaveSection } from "../use-save-section";

const DIVISIONS = ["women", "plus", "men", "sport", "kids", "beauty"] as const;
type Division = (typeof DIVISIONS)[number];
const isDivision = (s: string | undefined): s is Division =>
  !!s && (DIVISIONS as readonly string[]).includes(s);

interface Form {
  heading: string;
  subheading: string;
  sourceKind: "newest" | "bestsellers" | "collection" | "ids";
  sourceDivision: "all" | Division;
  collectionHandle: string;
  productIds: string;
  limit: number;
  layout: "carousel" | "grid";
  ctaLabel: string;
  ctaHref: string;
}

export function ProductRowEditor({ sectionId, config }: { sectionId: string; config: ProductRowConfig }) {
  const { register, handleSubmit, watch, setValue } = useForm<Form>({
    defaultValues: {
      heading: config.heading,
      subheading: config.subheading ?? "",
      sourceKind: config.source.kind,
      sourceDivision: isDivision(config.source.division) ? config.source.division : "all",
      collectionHandle: config.source.kind === "collection" ? config.source.handle : "",
      productIds: config.source.kind === "ids" ? config.source.ids.join(", ") : "",
      limit: config.limit,
      layout: config.layout,
      ctaLabel: config.cta?.label ?? "",
      ctaHref: config.cta?.href ?? "",
    },
  });
  const kind = watch("sourceKind");
  const save = useSaveSection(sectionId);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (f: Form) => {
    setError(null);
    const division = f.sourceDivision === "all" ? undefined : f.sourceDivision;
    const source =
      f.sourceKind === "collection"
        ? { kind: "collection" as const, handle: f.collectionHandle, division }
        : f.sourceKind === "ids"
          ? { kind: "ids" as const, ids: f.productIds.split(",").map((s) => s.trim()).filter(Boolean), division }
          : { kind: f.sourceKind, division };
    const parsed = productRowConfigSchema.safeParse({
      heading: f.heading,
      subheading: f.subheading || undefined,
      source,
      limit: Number(f.limit),
      layout: f.layout,
      cta: f.ctaLabel.trim() ? { label: f.ctaLabel, href: f.ctaHref || "#" } : undefined,
    });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Invalid");
    save.mutate(parsed.data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <TextField label="Heading" {...register("heading")} />
      <TextField label="Subheading (optional)" {...register("subheading")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <EnumCombobox
          label="Product source"
          value={watch("sourceKind")}
          onChange={(v) => setValue("sourceKind", v, { shouldDirty: true, shouldValidate: true })}
          options={[
            { value: "newest", label: "Newest" },
            { value: "bestsellers", label: "Best sellers" },
            { value: "collection", label: "Collection" },
            { value: "ids", label: "Specific products" },
          ]}
        />
        <EnumCombobox
          label="Layout"
          value={watch("layout")}
          onChange={(v) => setValue("layout", v, { shouldDirty: true, shouldValidate: true })}
          options={[
            { value: "carousel", label: "Carousel" },
            { value: "grid", label: "Grid" },
          ]}
        />
      </div>
      <EnumCombobox
        label="Division (only show this division's products)"
        value={watch("sourceDivision")}
        onChange={(v) => setValue("sourceDivision", v, { shouldDirty: true, shouldValidate: true })}
        options={[
          { value: "all", label: "All divisions" },
          { value: "women", label: "Women" },
          { value: "plus", label: "Plus+Curve" },
          { value: "men", label: "Men" },
          { value: "sport", label: "Sport" },
          { value: "kids", label: "Kids" },
          { value: "beauty", label: "Beauty" },
        ]}
      />
      {kind === "collection" && (
        <TextField label="Collection ID / handle" {...register("collectionHandle")} />
      )}
      {kind === "ids" && (
        <TextField label="Product IDs (comma-separated)" {...register("productIds")} />
      )}
      <TextField label="Max products" type="number" className="max-w-48" {...register("limit")} />
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
