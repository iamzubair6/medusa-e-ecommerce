"use client";

import { useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@ecom/ui";
import { TextField, CheckboxField } from "./fields";
import { DatePicker } from "./date-picker";
import { EnumCombobox } from "./combobox";
import { useToast } from "./toast";
import type { AdminPromotionRow } from "@/lib/medusa-admin";

const toLocalDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const makeSchema = (promo: AdminPromotionRow) =>
  z
    .object({
      code: z.string().trim().min(2, "Code is too short").max(40, "Code is too long"),
      automatic: z.boolean(),
      value: z.string(),
      buyQuantity: z.string(),
      getQuantity: z.string(),
      startsAt: z.string(),
      endsAt: z.string(),
      limitType: z.enum(["none", "total", "per_customer"]),
      limitCount: z.string(),
    })
    .superRefine((d, ctx) => {
      if (promo.valueType) {
        const n = Number(d.value);
        if (!d.value || !Number.isInteger(n) || n < 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Add a value." });
        } else if (promo.valueType === "percentage" && n > 100) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "Percentage cannot exceed 100." });
        }
      }
      if (promo.buyQuantity != null) {
        for (const key of ["buyQuantity", "getQuantity"] as const) {
          const n = Number(d[key]);
          if (!Number.isInteger(n) || n < 1 || n > 20) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: "Between 1 and 20." });
          }
        }
      }
      if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endsAt"], message: "End date must be after the start date." });
      }
      if (d.limitType !== "none") {
        const n = Number(d.limitCount);
        if (!Number.isInteger(n) || n < 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["limitCount"], message: "Set how many uses are allowed." });
        }
      }
    });

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

/** Edit form for one promotion, shown in the expanded /admin/discounts row.
 *  Type and applies-to are immutable in Medusa — delete & recreate to change them. */
export function PromoEditForm({
  promo,
  appliesTo,
  onSaved,
  onCancel,
}: {
  promo: AdminPromotionRow;
  appliesTo: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const toast = useToast();
  const schema = useMemo(() => makeSchema(promo), [promo]);
  const isBogo = promo.buyQuantity != null;

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: promo.code,
      automatic: promo.automatic,
      value: promo.value != null ? String(promo.value) : "",
      buyQuantity: promo.buyQuantity != null ? String(promo.buyQuantity) : "1",
      getQuantity: promo.getQuantity != null ? String(promo.getQuantity) : "1",
      startsAt: toLocalDate(promo.startsAt),
      endsAt: toLocalDate(promo.endsAt),
      limitType: promo.usage?.kind ?? "none",
      limitCount: promo.usage ? String(promo.usage.limit) : "1",
    },
  });
  const automatic = watch("automatic");
  const limitType = watch("limitType");

  const onSubmit = async (v: FormValues) => {
    try {
      const res = await fetch(`/api/admin/promotions/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: v.code.toUpperCase(),
          automatic: v.automatic,
          ...(promo.valueType ? { value: Number(v.value) } : {}),
          ...(isBogo ? { buyQuantity: Number(v.buyQuantity), getQuantity: Number(v.getQuantity) } : {}),
          startsAt: v.startsAt ? new Date(`${v.startsAt}T00:00:00`).toISOString() : null,
          endsAt: v.endsAt ? new Date(`${v.endsAt}T23:59:59`).toISOString() : null,
          usage: v.limitType === "none" ? null : { kind: v.limitType, limit: Number(v.limitCount) },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update promotion");
      toast.success(`${v.code.toUpperCase()} updated.`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">{promo.kind}</span> · applies to {appliesTo} · created{" "}
        {fmtDate(promo.createdAt)}. Type and target can&apos;t be changed — delete &amp; recreate for that.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TextField
          label={automatic ? "Name" : "Code"}
          required
          error={errors.code?.message}
          style={{ textTransform: "uppercase" }}
          {...register("code")}
        />
        {promo.valueType && (
          <TextField
            label={promo.valueType === "percentage" ? "Percent (%)" : "Amount (৳)"}
            required
            type="number"
            error={errors.value?.message}
            {...register("value")}
          />
        )}
        {isBogo && (
          <>
            <TextField label="Buy quantity" type="number" error={errors.buyQuantity?.message} {...register("buyQuantity")} />
            <TextField label="Get free" type="number" error={errors.getQuantity?.message} {...register("getQuantity")} />
          </>
        )}
        <Controller
          control={control}
          name="startsAt"
          render={({ field }) => <DatePicker label="Start date (optional)" value={field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="endsAt"
          render={({ field }) => <DatePicker label="Expiry date (optional)" value={field.value} onChange={field.onChange} />}
        />
        <Controller
          control={control}
          name="limitType"
          render={({ field }) => (
            <EnumCombobox
              label="Usage limit"
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "none", label: "Unlimited" },
                { value: "total", label: "Max total uses" },
                { value: "per_customer", label: "Max uses per customer" },
              ]}
            />
          )}
        />
        {limitType !== "none" && (
          <TextField
            label={limitType === "total" ? "Total uses allowed" : "Uses per customer (1 = one-time)"}
            type="number"
            error={errors.limitCount?.message}
            {...register("limitCount")}
          />
        )}
      </div>

      {promo.usage?.kind === "total" && (
        <p className="-mt-2 text-xs text-muted-foreground">{promo.usage.used ?? 0} of {promo.usage.limit} uses redeemed so far.</p>
      )}

      <CheckboxField label="Apply automatically (no code needed at checkout)" {...register("automatic")} />
      {automatic && (
        <p className="-mt-2 text-xs text-muted-foreground">
          Automatic promos re-apply to <strong>every new cart</strong> while active — set a usage limit if each
          shopper should only benefit once.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button type="submit" variant="gold" size="sm" loading={isSubmitting}>
          Save changes
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
