"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Badge, Button, Card } from "@ecom/ui";
import { popupConfigSchema, type PopupConfig } from "@ecom/cms";
import { TextField, TextareaField, CheckboxField } from "../fields";
import { EnumCombobox } from "../combobox";

export interface AdminPopup {
  id: string;
  name: string;
  active: boolean;
  trigger: "TIMER" | "SCROLL" | "EXIT_INTENT" | "IMMEDIATE";
  config: PopupConfig;
}

interface Form {
  name: string;
  active: boolean;
  trigger: AdminPopup["trigger"];
  heading: string;
  body: string;
  captureEmail: boolean;
  ctaLabel: string;
  ctaHref: string;
  dismissLabel: string;
  delayMs: number;
  scrollPercent: number;
  frequencyDays: number;
}

export function PopupEditor({ popup }: { popup: AdminPopup }) {
  const router = useRouter();
  const { register, handleSubmit, watch, setValue } = useForm<Form>({
    defaultValues: {
      name: popup.name,
      active: popup.active,
      trigger: popup.trigger,
      heading: popup.config.heading,
      body: popup.config.body ?? "",
      captureEmail: popup.config.captureEmail,
      ctaLabel: popup.config.cta?.label ?? "",
      ctaHref: popup.config.cta?.href ?? "",
      dismissLabel: popup.config.dismissLabel,
      delayMs: popup.config.delayMs,
      scrollPercent: popup.config.scrollPercent,
      frequencyDays: popup.config.frequencyDays,
    },
  });
  const trigger = watch("trigger");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const config = popupConfigSchema.safeParse({
        heading: f.heading,
        body: f.body || undefined,
        captureEmail: f.captureEmail,
        cta: f.ctaLabel.trim() ? { label: f.ctaLabel, href: f.ctaHref || "#" } : undefined,
        dismissLabel: f.dismissLabel,
        delayMs: Number(f.delayMs),
        scrollPercent: Number(f.scrollPercent),
        frequencyDays: Number(f.frequencyDays),
      });
      if (!config.success) throw new Error(config.error.issues[0]?.message ?? "Invalid popup config");
      const res = await fetch(`/api/admin/popups/${popup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: f.name, active: f.active, trigger: f.trigger, config: config.data }),
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => router.refresh(),
  });

  const onSubmit = (f: Form) => {
    setError(null);
    save.mutate(f, { onError: (e) => setError((e as Error).message) });
  };

  return (
    <Card className="p-5">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <TextField label="Name" className="flex-1" {...register("name")} />
          <Badge variant={popup.active ? "gold" : "muted"} className="ml-4 mt-5">
            {popup.active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CheckboxField label="Active (show on storefront)" {...register("active")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <EnumCombobox
            label="Trigger"
            value={watch("trigger")}
            onChange={(v) => setValue("trigger", v, { shouldDirty: true, shouldValidate: true })}
            options={[
              { value: "TIMER", label: "After delay" },
              { value: "SCROLL", label: "On scroll" },
              { value: "EXIT_INTENT", label: "Exit intent" },
              { value: "IMMEDIATE", label: "Immediately" },
            ]}
          />
          {trigger === "TIMER" && (
            <TextField label="Delay (ms)" type="number" {...register("delayMs")} />
          )}
          {trigger === "SCROLL" && (
            <TextField label="Scroll trigger (%)" type="number" {...register("scrollPercent")} />
          )}
        </div>
        <TextField label="Heading" {...register("heading")} />
        <TextareaField label="Body" {...register("body")} />
        <CheckboxField label="Capture email (newsletter signup → guest lead)" {...register("captureEmail")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="CTA label" {...register("ctaLabel")} />
          <TextField label="CTA link" {...register("ctaHref")} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Dismiss label" {...register("dismissLabel")} />
          <TextField label="Don't reshow for (days)" type="number" {...register("frequencyDays")} />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="gold" loading={save.isPending}>
            Save popup
          </Button>
          {save.isSuccess && <span className="text-sm text-gold">Saved</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </form>
    </Card>
  );
}
