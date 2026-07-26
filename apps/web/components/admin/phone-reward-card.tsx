"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Smartphone } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { EnumCombobox } from "./combobox";
import { useToast } from "./toast";

const schema = z
  .object({
    enabled: z.boolean(),
    kind: z.enum(["percentage", "fixed"]),
    value: z.string().refine((v) => /^\d+$/.test(v) && Number(v) >= 1, "Enter a whole number ≥ 1"),
    message: z.string().max(140),
  })
  .refine((d) => d.kind !== "percentage" || Number(d.value) <= 100, {
    message: "Percentage cannot exceed 100.",
    path: ["value"],
  });
type Values = z.infer<typeof schema>;

export interface PhoneRewardInitial {
  enabled: boolean;
  kind: "percentage" | "fixed";
  value: number;
  message: string;
}

/** Personal one-time discount for verified phone numbers (#132). */
export function PhoneRewardCard({ initial }: { initial: PhoneRewardInitial }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { ...initial, value: String(initial.value) },
  });
  const enabled = watch("enabled");
  const kind = watch("kind");

  const onSubmit = async (v: Values) => {
    try {
      const res = await fetch("/api/admin/phone-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...v, value: Number(v.value) }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Phone reward saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="max-w-3xl p-6">
      <div className="mb-1 flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-lg font-bold">Phone verification reward</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        When a shopper verifies their phone number, they get a <strong>personal one-time code</strong>{" "}
        (PH-XXXXXX) worth the discount below — auto-applied to their cart. Each phone always maps to the
        same code, so it can&rsquo;t be farmed.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <CheckboxField label="Give a discount when a phone is verified" {...register("enabled")} />
        {enabled && (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
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
            <TextField
              label="Message shown with the code"
              error={errors.message?.message}
              {...register("message")}
            />
          </>
        )}
        <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
          Save reward
        </Button>
      </form>
    </Card>
  );
}
