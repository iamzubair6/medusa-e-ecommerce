"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Check, Package, Truck, Home, ClipboardList } from "lucide-react";
import { Button, Card, cn, Input } from "@ecom/ui";
import type { OrderTracking } from "@/lib/tracking-types";

const schema = z.object({
  orderNumber: z.string().min(1, "Enter your order number"),
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

function steps(order: OrderTracking) {
  const s = STATUS_REACHED[order.fulfillmentStatus] ?? STATUS_REACHED.not_fulfilled!;
  const anyShipped = order.fulfillments.some((f) => f.shippedAt) || s.shipped;
  const anyDelivered = order.fulfillments.some((f) => f.deliveredAt) || s.delivered;
  const anyPacked = order.fulfillments.some((f) => f.packedAt) || s.packed;
  return [
    { label: "Ordered", icon: ClipboardList, done: true },
    { label: "Packed", icon: Package, done: anyPacked },
    { label: "Shipped", icon: Truck, done: anyShipped },
    { label: "Delivered", icon: Home, done: anyDelivered },
  ];
}

export function TrackClient() {
  const [notFound, setNotFound] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const lookup = useMutation({
    mutationFn: async (values: Values) => {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { order?: OrderTracking | null; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Lookup failed");
      return data.order ?? null;
    },
    onSuccess: (order) => setNotFound(order === null),
  });

  const order = lookup.data ?? null;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Track your order</h1>
        <p className="mt-2 text-muted-foreground">Enter your order number and email to see its status.</p>
      </div>

      <Card className="p-6">
        <form
          onSubmit={handleSubmit((v) => {
            setNotFound(false);
            lookup.mutate(v);
          })}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Order number" placeholder="e.g. 1" error={errors.orderNumber?.message} {...register("orderNumber")} />
            <Input label="Email" type="email" error={errors.email?.message} {...register("email")} />
          </div>
          <Button type="submit" variant="gold" loading={lookup.isPending} className="w-fit">
            Track order
          </Button>
          {lookup.isError && <p className="text-sm text-destructive">{(lookup.error as Error).message}</p>}
          {notFound && (
            <p className="text-sm text-destructive">
              We couldn&apos;t find an order with that number and email.
            </p>
          )}
        </form>
      </Card>

      {order && (
        <Card className="flex flex-col gap-6 p-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Order</p>
              <p className="font-display text-xl font-bold">#{order.displayId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Placed</p>
              <p className="text-sm">{new Date(order.placedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Timeline */}
          <ol className="flex items-center justify-between">
            {steps(order).map((step, i, arr) => {
              const Icon = step.icon;
              return (
                <li key={step.label} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    {i > 0 && <div className={cn("h-0.5 flex-1", step.done ? "bg-gold" : "bg-border")} />}
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full",
                        step.done ? "bg-gold text-accent-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {step.done ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    {i < arr.length - 1 && (
                      <div className={cn("h-0.5 flex-1", arr[i + 1]!.done ? "bg-gold" : "bg-border")} />
                    )}
                  </div>
                  <span className="mt-2 text-xs font-medium">{step.label}</span>
                </li>
              );
            })}
          </ol>

          {/* Tracking numbers */}
          {order.fulfillments.some((f) => f.trackingNumbers.length > 0) && (
            <div className="rounded-md bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tracking
              </p>
              <ul className="flex flex-col gap-1 text-sm">
                {order.fulfillments.flatMap((f) =>
                  f.trackingNumbers.map((t) => (
                    <li key={t.number}>
                      {t.url ? (
                        <a href={t.url} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                          {t.number}
                        </a>
                      ) : (
                        <span>{t.number}</span>
                      )}
                    </li>
                  )),
                )}
              </ul>
            </div>
          )}

          {/* Items */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Items</p>
            <ul className="flex flex-col gap-3">
              {order.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded bg-muted">
                    {item.thumbnail && <Image src={item.thumbnail} alt={item.title} fill sizes="48px" className="object-cover" />}
                  </div>
                  <span className="flex-1 text-sm">{item.title}</span>
                  <span className="text-sm text-muted-foreground">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between border-t border-border pt-4 font-semibold">
            <span>Total</span>
            <span>{order.total}</span>
          </div>
        </Card>
      )}
    </div>
  );
}
