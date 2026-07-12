"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { FlaskConical, Truck } from "lucide-react";
import { Button, Card, cn } from "@ecom/ui";
import { CheckboxField } from "./fields";
import { useToast } from "./toast";
import { courierSettingsSchema, type CourierSettings } from "@/lib/courier-settings";

/**
 * Delivery-partner switcher (RHF + Zod → "courier" SiteSetting): manual
 * handover vs Steadfast, plus the Steadfast test-mode toggle (simulated
 * consignments, no real pickups).
 */
export function CourierSettingsCard({
  initial,
  steadfastKeysPresent,
}: {
  initial: CourierSettings;
  steadfastKeysPresent: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = useForm<CourierSettings>({ resolver: zodResolver(courierSettingsSchema), defaultValues: initial });
  const partner = watch("partner");
  const testMode = watch("testMode");

  const onSubmit = async (values: CourierSettings) => {
    try {
      const res = await fetch("/api/admin/courier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Delivery partner saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="mb-6 p-6">
      <div className="mb-1 flex items-center gap-2">
        <Truck className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Delivery partner</h2>
        {partner === "steadfast" && testMode && (
          <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-700">
            TEST MODE
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Controls the Ship step on every order — manual tracking entry, or one-click handover to the courier.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Controller
          control={control}
          name="partner"
          render={({ field }) => (
            <div className="flex max-w-md rounded-sm border border-border p-1 text-sm">
              {(
                [
                  ["manual", "Manual / any courier"],
                  ["steadfast", "Steadfast (one-click)"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={cn(
                    "flex-1 cursor-pointer rounded-[3px] py-2 font-medium transition-colors",
                    field.value === value
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        />

        {partner === "steadfast" && (
          <>
            {!steadfastKeysPresent && (
              <p className="text-sm text-destructive">
                Steadfast API keys are missing from the environment — the handover button stays hidden until they're set.
              </p>
            )}
            <div className="flex items-start gap-2">
              <FlaskConical className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <CheckboxField label="Test mode — simulate consignments (no real pickups, no cost)" {...register("testMode")} />
                <p className="mt-1 text-xs text-muted-foreground">
                  Turn OFF only when you're ready for real deliveries. Simulated parcels auto-progress to Delivered in ~5 minutes.
                </p>
              </div>
            </div>
          </>
        )}

        <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
          Save delivery partner
        </Button>
      </form>
    </Card>
  );
}
