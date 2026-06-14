"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Card } from "@ecom/ui";
import { TextField, TextareaField, CheckboxField } from "./fields";
import { useToast } from "./toast";
import { phoneCaptureSettingsSchema, type PhoneCaptureSettings } from "@/lib/phone-capture-settings";

/**
 * Admin editor for the first-visit phone-capture popup copy (RHF + Zod).
 * Saves the "phoneCapture" SiteSetting via /api/admin/phone-capture.
 */
export function PhoneCaptureEditor({ initial }: { initial: PhoneCaptureSettings }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PhoneCaptureSettings>({
    resolver: zodResolver(phoneCaptureSettingsSchema),
    defaultValues: initial,
  });

  const onSubmit = async (values: PhoneCaptureSettings) => {
    try {
      const res = await fetch("/api/admin/phone-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Phone popup saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-2xl flex-col gap-6">
      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Visibility</h3>
        <CheckboxField label="Show the phone-capture popup to first-time visitors" {...register("enabled")} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Phone step</h3>
        <TextField label="Heading" required error={errors.heading?.message} {...register("heading")} />
        <TextareaField label="Subtext" required error={errors.subtext?.message} {...register("subtext")} />
        <TextField label="Send-code button label" required error={errors.buttonLabel?.message} {...register("buttonLabel")} />
      </Card>

      <Card className="flex flex-col gap-4 p-6">
        <h3 className="font-display text-lg font-bold">Code step</h3>
        <TextField label="Heading" required error={errors.codeHeading?.message} {...register("codeHeading")} />
        <TextareaField
          label="Subtext — use {phone} to insert the entered number"
          required
          error={errors.codeSubtext?.message}
          {...register("codeSubtext")}
        />
        <TextField label="Verify button label" required error={errors.successText?.message} {...register("successText")} />
      </Card>

      <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
        Save phone popup
      </Button>
    </form>
  );
}
