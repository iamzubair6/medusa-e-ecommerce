"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Truck, XCircle } from "lucide-react";
import { Button, cn, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { useToast } from "./toast";
import type { AdminOrderDetail } from "@/lib/admin-types";

/**
 * Order-status manager: a stepper showing where the order is
 * (Ordered → Processing → Shipped → Delivered) with ONE primary action for the
 * next step, plus cancel while that's still allowed (Medusa blocks it once shipped).
 */

const shipFormSchema = z.object({
  trackingNumber: z.string().trim().min(1, "Tracking number is required").max(80),
});
type ShipFormValues = z.infer<typeof shipFormSchema>;

async function post(url: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const d = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(d.error ?? "Action failed");
  }
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : undefined;

interface Step {
  key: string;
  label: string;
  detail?: string;
  done: boolean;
}

function StatusStepper({ steps, canceled }: { steps: Step[]; canceled: boolean }) {
  const currentIdx = steps.findIndex((s) => !s.done);
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const isCurrent = !canceled && i === currentIdx;
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast && (
              <span
                aria-hidden
                className={cn(
                  "absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-px",
                  step.done ? "bg-gold" : "bg-border",
                )}
              />
            )}
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[0.65rem] font-semibold",
                step.done
                  ? "border-gold bg-gold text-background"
                  : isCurrent
                    ? "border-foreground text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <div className="flex flex-col">
              <span
                className={cn(
                  "text-sm",
                  step.done || isCurrent ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 text-[0.65rem] font-semibold uppercase tracking-wide text-gold">
                    Next
                  </span>
                )}
              </span>
              {step.detail && <span className="text-xs text-muted-foreground">{step.detail}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderActions({
  order,
  steadfastEnabled = false,
}: {
  order: AdminOrderDetail;
  /** True when STEADFAST_* env keys exist (checked server-side). */
  steadfastEnabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState<"fulfil" | "deliver" | "cancel" | "steadfast" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const fulfillment = order.fulfillments[0];
  const shipped = order.fulfillments.some((f) => f.shippedAt);
  const delivered = order.fulfillments.some((f) => f.deliveredAt);
  const trackingNumbers = order.fulfillments.flatMap((f) => f.trackingNumbers);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ShipFormValues>({
    resolver: zodResolver(shipFormSchema),
    defaultValues: { trackingNumber: "" },
  });

  const run = async (action: "fulfil" | "deliver" | "cancel", done: string) => {
    setBusy(action);
    try {
      const path = action === "fulfil" ? "fulfill" : action;
      await post(`/api/admin/orders/${order.id}/${path}`);
      toast.success(done);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
      if (action === "cancel") setConfirmingCancel(false);
    }
  };

  const sendToSteadfast = async () => {
    setBusy("steadfast");
    try {
      await post(`/api/admin/orders/${order.id}/steadfast`);
      toast.success("Consignment created — order marked shipped.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onShip = async (values: ShipFormValues) => {
    try {
      await post(`/api/admin/orders/${order.id}/ship`, { trackingNumber: values.trackingNumber });
      toast.success("Order marked shipped.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const steps: Step[] = [
    { key: "ordered", label: "Ordered", detail: fmt(order.createdAt), done: true },
    {
      key: "processing",
      label: "Processing",
      detail: order.fulfilled ? (fmt(fulfillment?.packedAt) ?? "Items fulfilled") : "Fulfil the items to start",
      done: order.fulfilled,
    },
    {
      key: "shipped",
      label: "Shipped",
      detail: shipped
        ? [fmt(fulfillment?.shippedAt), trackingNumbers.length ? `Tracking: ${trackingNumbers.join(", ")}` : null]
            .filter(Boolean)
            .join(" · ")
        : "Add a tracking number when handing over",
      done: shipped,
    },
    {
      key: "delivered",
      label: "Delivered",
      detail: delivered
        ? (fmt(fulfillment?.deliveredAt) ?? "Order complete")
        : order.paymentMethod === "cod"
          ? "Confirms the cash was collected"
          : undefined,
      done: delivered,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <StatusStepper steps={steps} canceled={order.canceled} />

      {order.canceled ? (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
          <XCircle className="h-4 w-4" /> Order canceled
        </p>
      ) : (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          {!order.fulfilled && (
            <Button variant="solid" loading={busy === "fulfil"} onClick={() => run("fulfil", "Order is now processing.")}>
              Start processing
            </Button>
          )}

          {order.fulfilled && !shipped && (
            <div className="flex flex-col gap-3">
              {steadfastEnabled && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Button variant="gold" loading={busy === "steadfast"} onClick={sendToSteadfast}>
                      <Truck className="h-4 w-4" /> Send to Steadfast
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Creates the consignment{order.paymentMethod === "cod" && " (COD = order total)"} and
                      marks the order shipped with its tracking code.
                    </p>
                  </div>
                  <div className="flex items-center gap-3" aria-hidden>
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      or manual / other courier
                    </span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                </>
              )}
              <form onSubmit={handleSubmit(onShip)} className="flex flex-col gap-2">
                <TextField
                  label="Tracking number"
                  required
                  placeholder="TRK123…"
                  error={errors.trackingNumber?.message}
                  {...register("trackingNumber")}
                />
                <Button type="submit" variant={steadfastEnabled ? "solid" : "gold"} loading={isSubmitting}>
                  Mark shipped
                </Button>
              </form>
            </div>
          )}

          {shipped && !delivered && (
            <Button variant="solid" loading={busy === "deliver"} onClick={() => run("deliver", "Order marked delivered.")}>
              Mark delivered{order.paymentMethod === "cod" && " (cash collected)"}
            </Button>
          )}

          {delivered && <p className="text-sm font-medium text-gold">✓ Delivered — order complete</p>}

          {!shipped && (
            <Button
              variant="ghost"
              size="sm"
              loading={busy === "cancel"}
              onClick={() => setConfirmingCancel(true)}
              className="w-fit text-destructive hover:bg-destructive/10"
            >
              Cancel order
            </Button>
          )}

          {order.paymentMethod === "cod" && (
            <p className="text-xs text-muted-foreground">
              COD: no online payment to refund — settle any cash refund directly with the customer.
            </p>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmingCancel}
        title="Cancel this order?"
        description="This cannot be undone."
        confirmLabel="Cancel order"
        cancelLabel="Keep order"
        destructive
        loading={busy === "cancel"}
        onConfirm={() => void run("cancel", "Order canceled.")}
        onCancel={() => setConfirmingCancel(false)}
      />
    </div>
  );
}
