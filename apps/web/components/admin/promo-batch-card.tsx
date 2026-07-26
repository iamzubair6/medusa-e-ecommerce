"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layers } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { EnumCombobox } from "./combobox";
import { useToast } from "./toast";

const schema = z
  .object({
    prefix: z.string().min(2, "2–12 letters/numbers").max(12).regex(/^[A-Za-z0-9]+$/, "Letters/numbers only"),
    count: z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 1000, "1–1000"),
    kind: z.enum(["percentage", "fixed"]),
    value: z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= 1, "Enter a whole number"),
  })
  .refine((d) => d.kind !== "percentage" || Number(d.value) <= 100, {
    message: "Percentage cannot exceed 100.",
    path: ["value"],
  });
type Values = z.infer<typeof schema>;

/** One-time code batches for printed cards (#140): generate N unique codes,
 *  download them as CSV for the print shop. Codes are never shown publicly. */
export function PromoBatchCard() {
  const toast = useToast();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { prefix: "CARD", count: "100", kind: "percentage", value: "10" },
  });
  const kind = watch("kind");

  const onSubmit = async (v: Values) => {
    try {
      const res = await fetch("/api/admin/promotions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: v.prefix.toUpperCase(),
          count: Number(v.count),
          kind: v.kind,
          value: Number(v.value),
        }),
      });
      const d = (await res.json().catch(() => ({}))) as { codes?: string[]; failed?: number; error?: string };
      if (!res.ok || !d.codes) throw new Error(d.error ?? "Batch failed");

      // CSV for the print shop: one code per row with its value.
      const label = v.kind === "percentage" ? `${v.value}% off` : `৳${v.value} off`;
      const csv = `Code,Discount\r\n${d.codes.map((c) => `${c},${label}`).join("\r\n")}\r\n`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `promo-cards-${v.prefix.toUpperCase()}-${d.codes.length}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        `${d.codes.length} one-time codes created${d.failed ? ` (${d.failed} failed — rerun for the shortfall)` : ""} — CSV downloaded.`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="max-w-3xl p-6">
      <div className="mb-1 flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-lg font-bold">Code batch (printed cards)</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Generate up to 1000 unique <strong>one-time</strong> codes (e.g. CARD-8F3K2A) and download the
        CSV for printing. Each code works once and never appears on the public Offers page.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-4">
          <TextField label="Prefix" error={errors.prefix?.message} {...register("prefix")} />
          <TextField label="How many" type="number" error={errors.count?.message} {...register("count")} />
          <Controller
            control={control}
            name="kind"
            render={({ field }) => (
              <EnumCombobox
                label="Type"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: "percentage", label: "Percentage % off" },
                  { value: "fixed", label: "Fixed ৳ off" },
                ]}
              />
            )}
          />
          <TextField
            label={kind === "percentage" ? "Percent (%)" : "Amount (৳)"}
            type="number"
            error={errors.value?.message}
            {...register("value")}
          />
        </div>
        <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
          Generate & download CSV
        </Button>
      </form>
    </Card>
  );
}
