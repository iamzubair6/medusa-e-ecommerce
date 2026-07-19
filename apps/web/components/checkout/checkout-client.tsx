"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button, Card, cn } from "@ecom/ui";
import { TextField, SelectField } from "@/components/admin/fields";
import { PromoCode } from "@/components/cart/promo-code";
import { PhoneInput } from "@/components/site/phone-input";
import { useCart } from "@/hooks/use-cart";
import type { CartView, ShippingOptionView } from "@/lib/cart-types";
import type { Persona } from "@/lib/persona";
import type { PaymentMethod } from "@/lib/checkout-config";

// Countries served by the Bangladesh (BDT) region.
const COUNTRIES = [["bd", "Bangladesh"]] as const;

const addressSchema = z.object({
  email: z.string().email("Enter a valid email"),
  first_name: z.string().min(1, "Required"),
  last_name: z.string().optional(),
  address_1: z.string().min(1, "Required"),
  city: z.string().min(1, "Required"),
  postal_code: z.string().optional(),
  country_code: z.string().length(2),
  phone: z.string().min(6, "Required"),
});
type AddressValues = z.infer<typeof addressSchema>;

type Step = "address" | "shipping" | "review";

interface CheckoutPrefill {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export function CheckoutClient({
  prefill,
  persona,
  paymentMethods,
}: {
  prefill: CheckoutPrefill;
  persona: Persona;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { cart } = useCart();
  const [step, setStep] = useState<Step>("address");
  const [options, setOptions] = useState<ShippingOptionView[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [payMethod, setPayMethod] = useState<string>(paymentMethods[0]?.id ?? "");
  const [answers, setAnswers] = useState<Record<string, "yes" | "no">>({});
  const [personaApplied, setPersonaApplied] = useState(false);
  const setCart = (c: CartView | null) => qc.setQueryData(["cart"], c);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country_code: "bd",
      email: prefill.email,
      first_name: prefill.firstName,
      last_name: prefill.lastName,
      phone: prefill.phone,
    },
  });

  // Capture the cart + email for recovery once a valid email is entered (best-
  // effort, debounced). Marked recovered server-side when the order completes.
  const emailValue = watch("email");
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailValue ?? "")) return;
    const t = setTimeout(() => {
      fetch("/api/cart/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartId: cart.id,
          email: emailValue,
          itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
          total: cart.total,
          items: cart.items.slice(0, 50).map((i) => ({ title: i.title, quantity: i.quantity, thumbnail: i.thumbnail })),
        }),
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [emailValue, cart]);

  // Persona: when all questions are answered, apply the configured promo (stacks).
  const personaActive = persona.enabled && persona.questions.length > 0 && Boolean(persona.promoCode);
  const allAnswered = personaActive && persona.questions.every((q) => answers[q.id]);
  const applyPersona = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cart/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: persona.promoCode }),
      });
      const d = (await res.json()) as { cart?: CartView; error?: string };
      if (!res.ok || !d.cart) throw new Error(d.error ?? "Could not apply discount");
      return d.cart;
    },
    onSuccess: (c) => {
      setCart(c);
      setPersonaApplied(true);
    },
  });
  useEffect(() => {
    if (allAnswered && !personaApplied && !applyPersona.isPending) applyPersona.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnswered]);

  // Step 1 — save contact + address (also captures a guest lead), then load options.
  const saveAddress = useMutation({
    mutationFn: async (values: AddressValues) => {
      const { email, ...rest } = values;
      // last name / postal are optional in the UI but Medusa expects strings.
      const address = { ...rest, last_name: rest.last_name || "", postal_code: rest.postal_code || "0000" };
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

  // Step 3 — place the order. Gateway methods (sslcommerz) redirect to the
  // hosted payment page instead; the order completes in the validated callback.
  const placeOrder = useMutation({
    mutationFn: async () => {
      if (payMethod === "sslcommerz") {
        const payRes = await fetch("/api/checkout/pay", { method: "POST" });
        const pay = (await payRes.json()) as { url?: string; error?: string };
        if (!payRes.ok || !pay.url) throw new Error(pay.error ?? "Could not start online payment");
        window.location.assign(pay.url);
        // Keep the mutation pending while the browser navigates away.
        return new Promise<never>(() => {});
      }
      const res = await fetch("/api/checkout/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: payMethod }),
      });
      const data = (await res.json()) as {
        order?: { displayId: number; email: string; total: string };
        error?: string;
      };
      if (!res.ok || !data.order) throw new Error(data.error ?? "Could not place order");
      return data.order;
    },
    onSuccess: (order) => {
      setCart(null);
      const chosen = paymentMethods.find((m) => m.id === payMethod);
      const params = new URLSearchParams({
        order: String(order.displayId),
        email: order.email,
        total: order.total,
        method: payMethod,
        payLabel: chosen?.label ?? payMethod,
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
              <TextField label="Email" required type="email" error={errors.email?.message} {...register("email")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="First name" required error={errors.first_name?.message} {...register("first_name")} />
                <TextField label="Last name" {...register("last_name")} />
              </div>
              <TextField label="Address / landmark" required error={errors.address_1?.message} placeholder="House, road, area, landmark" {...register("address_1")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField label="City" required error={errors.city?.message} {...register("city")} />
                <TextField label="Postal code" {...register("postal_code")} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Phone<span className="text-destructive"> *</span>
                  </span>
                  <PhoneInput value={watch("phone") || ""} onChange={(v) => setValue("phone", v, { shouldValidate: true })} />
                  {errors.phone && <span className="text-xs text-destructive">{errors.phone.message}</span>}
                </div>
                <SelectField label="Country (auto-detected)" {...register("country_code")}>
                  {COUNTRIES.map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </SelectField>
              </div>
              {personaActive && (
                <div className="flex flex-col gap-3 rounded-md border border-border p-4">
                  <div>
                    <p className="text-sm font-semibold">
                      {persona.title}{" "}
                      {persona.bracket && <span className="font-normal text-muted-foreground">({persona.bracket})</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">Optional — answer all to unlock {persona.discountHint} extra off.</p>
                  </div>
                  {persona.questions.map((q) => (
                    <div key={q.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm">{q.label}</span>
                      <div className="flex gap-2">
                        {(["yes", "no"] as const).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                            className={cn(
                              "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase transition-colors",
                              answers[q.id] === v ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground",
                            )}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {personaApplied ? (
                    <p className="text-sm font-semibold text-gold">Extra discount applied! 🎉</p>
                  ) : applyPersona.isError ? (
                    <p className="text-sm text-destructive">{(applyPersona.error as Error).message}</p>
                  ) : allAnswered ? (
                    <p className="text-sm text-muted-foreground">Applying your reward…</p>
                  ) : null}
                </div>
              )}
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
              {options.length === 0 && (
                <p className="text-sm text-muted-foreground">No delivery options available for your area.</p>
              )}
              {options.map((opt) => (
                <label
                  key={opt.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-3 rounded-md border px-4 py-3",
                    selectedOption === opt.id ? "border-foreground" : "border-border",
                  )}
                >
                  <span className="flex items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name="shipping"
                      checked={selectedOption === opt.id}
                      onChange={() => setSelectedOption(opt.id)}
                      className="mt-0.5 accent-[hsl(var(--accent))]"
                    />
                    <span>
                      <span className="block">{opt.name}</span>
                      {opt.note && <span className="block text-xs text-muted-foreground">{opt.note}</span>}
                    </span>
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

        {/* Step 3: payment + place order */}
        <Card className={cn("p-6", step !== "review" && "opacity-50")}>
          <StepHeader n={3} title="Payment" done={false} />
          {step === "review" && (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                {paymentMethods.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No payment methods are available right now. Please try again later.
                  </p>
                )}
                {paymentMethods.map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-md border p-4",
                      payMethod === m.id ? "border-foreground" : "border-border",
                    )}
                  >
                    <input
                      type="radio"
                      name="pay"
                      checked={payMethod === m.id}
                      onChange={() => setPayMethod(m.id)}
                      className="mt-0.5 accent-[hsl(var(--accent))]"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{m.label}</span>
                      {m.description && (
                        <span className="block text-xs text-muted-foreground">{m.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
              <Button
                type="button"
                variant="gold"
                size="lg"
                loading={placeOrder.isPending}
                disabled={!payMethod}
                onClick={() => placeOrder.mutate()}
                className="w-fit"
              >
                Place Order
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
