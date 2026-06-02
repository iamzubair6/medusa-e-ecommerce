"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, SelectField } from "@/components/admin/fields";
import { PromoCode } from "@/components/cart/promo-code";
import { useCart } from "@/hooks/use-cart";
import type { CartView, ShippingOptionView } from "@/lib/cart-types";

// Region (Europe) countries from the Medusa seed.
const COUNTRIES = [
  ["de", "Germany"],
  ["fr", "France"],
  ["it", "Italy"],
  ["es", "Spain"],
  ["se", "Sweden"],
  ["dk", "Denmark"],
  ["gb", "United Kingdom"],
] as const;

const addressSchema = z.object({
  email: z.string().email("Enter a valid email"),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().min(1, "Required"),
  address_1: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  postal_code: z.string().min(1, "Required"),
  country_code: z.string().length(2),
  phone: z.string().optional(),
});
type AddressValues = z.infer<typeof addressSchema>;

type Step = "address" | "shipping" | "review";

export function CheckoutClient() {
  const router = useRouter();
  const qc = useQueryClient();
  const { cart } = useCart();
  const [step, setStep] = useState<Step>("address");
  const [options, setOptions] = useState<ShippingOptionView[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const setCart = (c: CartView | null) => qc.setQueryData(["cart"], c);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: { country_code: "de" },
  });

  // Step 1 — save contact + address (also captures a guest lead), then load options.
  const saveAddress = useMutation({
    mutationFn: async (values: AddressValues) => {
      const { email, ...address } = values;
      const res = await fetch("/api/checkout/customer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, address }),
      });
      if (!res.ok) throw new Error("Could not save your details");
      const { cart: updated } = (await res.json()) as { cart: CartView };
      const optsRes = await fetch("/api/checkout/shipping");
      const { options: opts } = (await optsRes.json()) as { options: ShippingOptionView[] };
      return { updated, opts };
    },
    onSuccess: ({ updated, opts }) => {
      setCart(updated);
      setOptions(opts);
      setSelectedOption(opts[0]?.id ?? "");
      setStep("shipping");
    },
  });

  // Step 2 — select shipping method.
  const saveShipping = useMutation({
    mutationFn: async (optionId: string) => {
      const res = await fetch("/api/checkout/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId }),
      });
      if (!res.ok) throw new Error("Could not set shipping");
      const { cart: updated } = (await res.json()) as { cart: CartView };
      return updated;
    },
    onSuccess: (updated) => {
      setCart(updated);
      setStep("review");
    },
  });

  // Step 3 — place the order.
  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/checkout/complete", { method: "POST" });
      const data = (await res.json()) as {
        order?: { displayId: number; email: string; total: string };
        error?: string;
      };
      if (!res.ok || !data.order) throw new Error(data.error ?? "Could not place order");
      return data.order;
    },
    onSuccess: (order) => {
      setCart(null);
      const params = new URLSearchParams({
        order: String(order.displayId),
        email: order.email,
        total: order.total,
      });
      router.push(`/checkout/success?${params.toString()}`);
    },
  });

  if (cart && cart.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="mb-4 text-muted-foreground">Your bag is empty.</p>
        <Link href="/products" className="underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Checkout</h1>

        {/* Step 1: contact + address */}
        <Card className="p-6">
          <StepHeader n={1} title="Contact & shipping address" done={step !== "address"} />
          {step === "address" ? (
            <form onSubmit={handleSubmit((v) => saveAddress.mutate(v))} className="mt-4 flex flex-col gap-4">
              <TextField label="Email" type="email" error={errors.email?.message} {...register("email")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="First name" error={errors.first_name?.message} {...register("first_name")} />
                <TextField label="Last name" error={errors.last_name?.message} {...register("last_name")} />
              </div>
              <TextField label="Address" error={errors.address_1?.message} {...register("address_1")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="City" error={errors.city?.message} {...register("city")} />
                <TextField label="Postal code" error={errors.postal_code?.message} {...register("postal_code")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField label="Country" {...register("country_code")}>
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </SelectField>
                <TextField label="Phone (optional)" {...register("phone")} />
              </div>
              <Button type="submit" variant="gold" loading={saveAddress.isPending} className="w-fit">
                Continue to shipping
              </Button>
              {saveAddress.isError && (
                <p className="text-sm text-destructive">{(saveAddress.error as Error).message}</p>
              )}
            </form>
          ) : (
            <button type="button" onClick={() => setStep("address")} className="mt-2 text-sm text-gold hover:underline">
              Edit
            </button>
          )}
        </Card>

        {/* Step 2: shipping method */}
        <Card className={cn("p-6", step === "address" && "opacity-50")}>
          <StepHeader n={2} title="Shipping method" done={step === "review"} />
          {step === "shipping" && (
            <div className="mt-4 flex flex-col gap-3">
              {options.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-md border px-4 py-3",
                    selectedOption === opt.id ? "border-foreground" : "border-border",
                  )}
                >
                  <span className="flex items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedOption === opt.id}
                      onChange={() => setSelectedOption(opt.id)}
                      className="accent-[hsl(var(--accent))]"
                    />
                    {opt.name}
                  </span>
                  <span className="text-sm font-semibold">{opt.amount}</span>
                </label>
              ))}
              <Button
                type="button"
                variant="gold"
                disabled={!selectedOption}
                loading={saveShipping.isPending}
                onClick={() => saveShipping.mutate(selectedOption)}
                className="w-fit"
              >
                Continue to review
              </Button>
              {saveShipping.isError && (
                <p className="text-sm text-destructive">{(saveShipping.error as Error).message}</p>
              )}
            </div>
          )}
        </Card>

        {/* Step 3: review + place order */}
        <Card className={cn("p-6", step !== "review" && "opacity-50")}>
          <StepHeader n={3} title="Review & pay" done={false} />
          {step === "review" && (
            <div className="mt-4 flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Payment uses Medusa&apos;s manual provider (test mode) — no card is charged.
              </p>
              <Button type="button" variant="gold" size="lg" loading={placeOrder.isPending} onClick={() => placeOrder.mutate()} className="w-fit">
                Place order
              </Button>
              {placeOrder.isError && (
                <p className="text-sm text-destructive">{(placeOrder.error as Error).message}</p>
              )}
            </div>
          )}
        </Card>
      </div>

      <OrderSummary cart={cart} />
    </div>
  );
}

function StepHeader({ n, title, done }: { n: number; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
          done ? "bg-accent text-accent-foreground" : "bg-foreground text-background",
        )}
      >
        {done ? "✓" : n}
      </span>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
    </div>
  );
}

function OrderSummary({ cart }: { cart: CartView | null }) {
  if (!cart) return null;
  return (
    <Card className="h-fit p-6">
      <h2 className="mb-4 font-display text-lg font-bold">Order Summary</h2>
      <ul className="mb-4 flex flex-col gap-2 border-b border-border pb-4 text-sm">
        {cart.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span className="text-muted-foreground">
              {i.quantity}× {i.title}
            </span>
            <span>{i.lineTotal}</span>
          </li>
        ))}
      </ul>
      <div className="mb-4">
        <PromoCode />
      </div>
      <div className="flex flex-col gap-1.5 text-sm">
        <Row label="Subtotal" value={cart.subtotal} />
        {cart.hasDiscount && (
          <div className="flex justify-between text-gold">
            <span>Discount</span>
            <span>-{cart.discountTotal}</span>
          </div>
        )}
        <Row label="Shipping" value={cart.hasShipping ? cart.shippingTotal : "—"} />
        <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Total</span>
          <span>{cart.total}</span>
        </div>
      </div>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
