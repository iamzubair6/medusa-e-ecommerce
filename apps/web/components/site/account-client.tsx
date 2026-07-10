"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { LogOut, ShoppingBag } from "lucide-react";
import { Badge, Button, Card, Input } from "@ecom/ui";
import { formatOrderId } from "@/lib/order-id";
import type { Customer, CustomerOrder } from "@/lib/customer-auth";

const profileSchema = z.object({
  firstName: z.string().min(1, "Enter your first name"),
  lastName: z.string().min(1, "Enter your last name"),
  phone: z.string(),
});
type ProfileValues = z.infer<typeof profileSchema>;

function statusVariant(s: string): "brass" | "muted" | "outline" {
  if (["shipped", "delivered", "fulfilled", "captured"].includes(s)) return "brass";
  if (["not_fulfilled", "awaiting", "not_paid"].includes(s)) return "outline";
  return "muted";
}

function initials(customer: Customer): string {
  const letters =
    customer.firstName.trim().charAt(0) + customer.lastName.trim().charAt(0);
  return (letters || customer.email.charAt(0)).toUpperCase();
}

const orderDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export function AccountClient({ customer, orders }: { customer: Customer; orders: CustomerOrder[] }) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone ?? "",
    },
  });

  const save = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Could not save your details. Please try again.");
    },
    onSuccess: () => router.refresh(),
  });

  const logout = useMutation({
    mutationFn: async () => {
      await fetch("/api/account/logout", { method: "POST" });
    },
    onSuccess: () => {
      router.push("/");
      router.refresh();
    },
  });

  return (
    <div className="flex flex-col gap-10">
      {/* Profile header */}
      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-border pb-8">
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            aria-hidden
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gold/15 font-display text-xl font-medium text-gold sm:h-16 sm:w-16 sm:text-2xl"
          >
            {initials(customer)}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-medium tracking-tight text-balance sm:text-4xl">
              {customer.firstName ? `Hello, ${customer.firstName}` : "Hello"}
            </h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {customer.email} &middot; Maison member
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout.mutate()}
          loading={logout.isPending}
        >
          <LogOut className="h-4 w-4" aria-hidden /> Sign out
        </Button>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start">
        {/* Personal details */}
        <Card className="p-6">
          <h2 className="font-display text-lg font-semibold tracking-tight">Personal details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            How we address you and reach you about orders.
          </p>
          <div className="rule-brass my-5" aria-hidden />
          <form
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                autoComplete="given-name"
                error={errors.firstName?.message}
                {...register("firstName")}
              />
              <Input
                label="Last name"
                autoComplete="family-name"
                error={errors.lastName?.message}
                {...register("lastName")}
              />
            </div>
            <Input
              label="Phone"
              type="tel"
              autoComplete="tel"
              placeholder="Optional"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Email
              </p>
              <p className="mt-1.5 text-sm">{customer.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button type="submit" variant="solid" loading={save.isPending}>
                Save changes
              </Button>
              {save.isSuccess && (
                <p role="status" className="text-xs text-muted-foreground">
                  Profile updated.
                </p>
              )}
              {save.isError && (
                <p role="alert" className="text-xs text-destructive">
                  {save.error?.message ?? "Could not save your details."}
                </p>
              )}
            </div>
          </form>
        </Card>

        {/* Order history */}
        <section aria-labelledby="order-history">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="order-history" className="font-display text-lg font-semibold tracking-tight">
              Order history
            </h2>
            {orders.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {orders.length} {orders.length === 1 ? "order" : "orders"}
              </p>
            )}
          </div>
          <div className="rule-brass my-4" aria-hidden />

          {orders.length === 0 ? (
            <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" aria-hidden />
              <div>
                <p className="font-display text-lg font-medium">Nothing here yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your orders will appear here after your first purchase.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/products">Start shopping</Link>
              </Button>
            </Card>
          ) : (
            <>
              {/* Desktop table */}
              <Card className="hidden overflow-hidden md:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left">
                    <tr className="[&>th]:px-5 [&>th]:py-3 [&>th]:text-[0.7rem] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-[0.14em] [&>th]:text-muted-foreground">
                      <th>Order</th>
                      <th>Placed</th>
                      <th>Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id} className="border-b border-border last:border-0 [&>td]:px-5 [&>td]:py-3.5">
                        <td className="font-semibold">{formatOrderId(o.displayId)}</td>
                        <td className="text-muted-foreground">{orderDate(o.createdAt)}</td>
                        <td className="font-semibold">{o.total}</td>
                        <td>
                          <Badge variant={statusVariant(o.fulfillmentStatus)}>
                            {o.fulfillmentStatus.replace(/_/g, " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Mobile stacked list */}
              <div className="flex flex-col gap-3 md:hidden">
                {orders.map((o) => (
                  <Card key={o.id} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{formatOrderId(o.displayId)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{orderDate(o.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold">{o.total}</span>
                      <Badge variant={statusVariant(o.fulfillmentStatus)}>
                        {o.fulfillmentStatus.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
