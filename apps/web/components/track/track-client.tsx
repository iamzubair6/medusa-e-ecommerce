"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Check, ClipboardList, Home, Package, Truck, type LucideIcon } from "lucide-react";
import { Badge, Button, Card, cn, Input, Reveal } from "@ecom/ui";
import { formatOrderId, parseOrderId } from "@/lib/order-id";
import type { OrderTracking } from "@/lib/tracking-types";

const schema = z.object({
  orderNumber: z
    .string()
    .min(1, "Enter your order number")
    .refine((v) => parseOrderId(v) !== null, "That doesn't look like an order number"),
  email: z.string().email("Enter a valid email"),
});
type Values = z.infer<typeof schema>;

const STATUS_REACHED: Record<string, { packed: boolean; shipped: boolean; delivered: boolean }> = {
  not_fulfilled: { packed: false, shipped: false, delivered: false },
  fulfilled: { packed: true, shipped: false, delivered: false },
  partially_fulfilled: { packed: true, shipped: false, delivered: false },
  shipped: { packed: true, shipped: true, delivered: false },
  partially_shipped: { packed: true, shipped: true, delivered: false },
  delivered: { packed: true, shipped: true, delivered: true },
  partially_delivered: { packed: true, shipped: true, delivered: true },
};

interface Step {
  label: string;
  icon: LucideIcon;
  done: boolean;
  date?: string;
}

function buildSteps(order: OrderTracking): Step[] {
  const reached =
    STATUS_REACHED[order.fulfillmentStatus] ?? { packed: false, shipped: false, delivered: false };
  const packedAt = order.fulfillments.find((f) => f.packedAt)?.packedAt;
  const shippedAt = order.fulfillments.find((f) => f.shippedAt)?.shippedAt;
  const deliveredAt = order.fulfillments.find((f) => f.deliveredAt)?.deliveredAt;
  const processing = reached.packed || Boolean(packedAt) || order.paymentStatus === "captured";
  const shipped = reached.shipped || Boolean(shippedAt);
  const delivered = reached.delivered || Boolean(deliveredAt);
  return [
    { label: "Ordered", icon: ClipboardList, done: true, date: order.placedAt },
    { label: "Processing", icon: Package, done: processing, date: packedAt },
    { label: "Shipped", icon: Truck, done: shipped, date: shippedAt },
    { label: "Delivered", icon: Home, done: delivered, date: deliveredAt },
  ];
}

function statusHeadline(steps: Step[]): string {
  if (steps[3]?.done) return "Delivered — we hope you love it";
  if (steps[2]?.done) return "Your order is on its way";
  if (steps[1]?.done) return "Your order is being prepared";
  return "Order received";
}

function paymentBadge(status: string): { variant: "brass" | "muted" | "outline"; label: string } {
  const label = status.replace(/_/g, " ");
  if (status === "captured") return { variant: "brass", label: "Paid" };
  if (["refunded", "partially_refunded", "canceled"].includes(status)) return { variant: "muted", label };
  return { variant: "outline", label };
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

export function TrackClient() {
  const [notFound, setNotFound] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const lookup = useMutation({
    mutationFn: async (values: Values) => {
      const orderNumber = parseOrderId(values.orderNumber);
      if (orderNumber === null) throw new Error("That doesn't look like an order number.");
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email: values.email }),
      });
      const data = (await res.json().catch(() => ({}))) as { order?: OrderTracking | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lookup failed. Please try again.");
      return data.order ?? null;
    },
    onSuccess: (found) => setNotFound(found === null),
  });

  const order = lookup.data ?? null;
  const steps = order ? buildSteps(order) : [];
  const currentIndex = steps.findIndex((s) => !s.done);
  const payment = order ? paymentBadge(order.paymentStatus) : null;
  const trackingNumbers = order
    ? order.fulfillments.flatMap((f) => f.trackingNumbers)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10">
      <header className="text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight text-balance sm:text-5xl">
          Track your order
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">
          Enter the order number from your confirmation email and we&apos;ll show you exactly where
          it is.
        </p>
      </header>

      <Card className="p-6 sm:p-8">
        <form
          onSubmit={handleSubmit((v) => {
            setNotFound(false);
            lookup.mutate(v);
          })}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Input
              label="Order number"
              placeholder="MSN-00042"
              autoComplete="off"
              error={errors.orderNumber?.message}
              {...register("orderNumber")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" variant="accent" loading={lookup.isPending} className="min-w-40">
              Track order
            </Button>
            <p className="text-xs text-muted-foreground">
              You&apos;ll find it in your confirmation email, e.g. MSN-00042.
            </p>
          </div>
          {lookup.isError && (
            <p role="alert" className="text-sm text-destructive">
              {lookup.error?.message ?? "Lookup failed. Please try again."}
            </p>
          )}
        </form>
      </Card>

      {notFound && !lookup.isPending && (
        <div
          role="status"
          className="rounded-lg border border-border bg-muted/40 px-6 py-5 text-center text-sm"
        >
          We couldn&apos;t find an order matching those details. Double-check the order number
          (e.g. MSN-00042) and use the email you gave at checkout.
        </div>
      )}

      {order && payment && (
        <Reveal>
          <Card className="flex flex-col gap-7 p-6 sm:p-8">
            {/* Order identity */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Order
                </p>
                <p className="mt-1 font-display text-2xl font-medium tracking-tight sm:text-3xl">
                  {formatOrderId(order.displayId)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Placed {longDate(order.placedAt)}</p>
              </div>
              <Badge variant={payment.variant}>{payment.label}</Badge>
            </div>

            <div className="rule-brass" aria-hidden />

            {/* Status timeline */}
            <div className="flex flex-col gap-7">
              <p className="text-center font-display text-lg italic">{statusHeadline(steps)}</p>
              <ol aria-label="Delivery progress" className="grid grid-cols-4">
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  const current = i === currentIndex;
                  return (
                    <li
                      key={step.label}
                      aria-current={current ? "step" : undefined}
                      className="relative flex flex-col items-center gap-2.5 text-center sm:gap-3"
                    >
                      {i > 0 && (
                        <div
                          aria-hidden
                          className={cn(
                            "absolute right-1/2 top-[18px] h-px w-full sm:top-[22px]",
                            step.done ? "bg-foreground/60" : "bg-border",
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          "relative z-10 flex h-9 w-9 items-center justify-center rounded-full border transition-colors sm:h-11 sm:w-11",
                          step.done
                            ? "border-foreground bg-primary text-primary-foreground"
                            : current
                              ? "border-accent/50 bg-card text-foreground ring-1 ring-accent/40"
                              : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {step.done ? (
                          <Check className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                        ) : (
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={cn(
                            "text-[0.6rem] font-semibold uppercase tracking-[0.1em] sm:text-[0.7rem] sm:tracking-[0.14em]",
                            step.done || current ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {step.label}
                        </span>
                        {step.done && step.date && (
                          <span className="text-[0.65rem] text-muted-foreground sm:text-xs">
                            {shortDate(step.date)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Parcel tracking numbers */}
            {trackingNumbers.length > 0 && (
              <>
                <div className="rule-brass" aria-hidden />
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Parcel tracking
                  </p>
                  <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                    {trackingNumbers.map((t) => (
                      <li key={t.number}>
                        {t.url ? (
                          <a
                            href={t.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                          >
                            {t.number}
                          </a>
                        ) : (
                          <span>{t.number}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <div className="rule-brass" aria-hidden />

            {/* Items */}
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Items
              </p>
              <ul className="mt-4 flex flex-col divide-y divide-border">
                {order.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                    <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {item.thumbnail ? (
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <Package
                          className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground"
                          aria-hidden
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Qty {item.quantity}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Total */}
            <div className="flex items-baseline justify-between border-t border-border pt-5">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total
              </span>
              <span className="font-display text-xl font-medium">{order.total}</span>
            </div>
          </Card>
        </Reveal>
      )}
    </div>
  );
}
