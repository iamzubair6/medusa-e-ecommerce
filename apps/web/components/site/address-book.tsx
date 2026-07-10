"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input } from "@ecom/ui";
import type { Address } from "@/lib/customer-auth";

const addressSchema = z.object({
  firstName: z.string().min(1, "Enter a first name"),
  lastName: z.string().min(1, "Enter a last name"),
  address1: z.string().min(1, "Enter a street address"),
  address2: z.string(),
  city: z.string().min(1, "Enter a city"),
  postalCode: z.string().min(1, "Enter a postal code"),
  phone: z.string(),
});
type AddressValues = z.infer<typeof addressSchema>;

const empty: AddressValues = {
  firstName: "",
  lastName: "",
  address1: "",
  address2: "",
  city: "",
  postalCode: "",
  phone: "",
};

const toValues = (a: Address): AddressValues => ({
  firstName: a.firstName,
  lastName: a.lastName,
  address1: a.address1,
  address2: a.address2 ?? "",
  city: a.city,
  postalCode: a.postalCode,
  phone: a.phone ?? "",
});

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressValues>({ resolver: zodResolver(addressSchema), defaultValues: empty });

  const save = useMutation({
    mutationFn: async (values: AddressValues) => {
      const url = editing === "new" ? "/api/account/addresses" : `/api/account/addresses/${editing}`;
      const res = await fetch(url, {
        method: editing === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          address2: values.address2 || undefined,
          phone: values.phone || undefined,
          countryCode: "bd",
        }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? "Could not save address");
      }
    },
    onSuccess: () => {
      setEditing(null);
      router.refresh();
    },
  });

  const removal = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete that address. Please try again.");
    },
    onSuccess: () => router.refresh(),
  });

  const startNew = () => {
    save.reset();
    reset(empty);
    setEditing("new");
  };
  const startEdit = (a: Address) => {
    save.reset();
    reset(toValues(a));
    setEditing(a.id);
  };
  const remove = (id: string) => {
    if (!confirm("Delete this address?")) return;
    removal.mutate(id);
  };

  return (
    <section aria-labelledby="address-book">
      <div className="flex items-center justify-between gap-4">
        <h2 id="address-book" className="font-display text-lg font-semibold tracking-tight">
          Addresses
        </h2>
        {editing === null && (
          <Button variant="outline" size="sm" onClick={startNew}>
            <Plus className="h-4 w-4" aria-hidden /> Add address
          </Button>
        )}
      </div>
      <div className="rule-brass my-4" aria-hidden />

      {editing !== null && (
        <Card className="mb-6 p-6">
          <h3 className="font-display text-base font-semibold tracking-tight">
            {editing === "new" ? "New address" : "Edit address"}
          </h3>
          <form
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="mt-5 flex flex-col gap-4"
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
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
              label="Address"
              autoComplete="address-line1"
              error={errors.address1?.message}
              {...register("address1")}
            />
            <Input
              label="Apartment, suite"
              placeholder="Optional"
              autoComplete="address-line2"
              error={errors.address2?.message}
              {...register("address2")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="City"
                autoComplete="address-level2"
                error={errors.city?.message}
                {...register("city")}
              />
              <Input
                label="Postal code"
                autoComplete="postal-code"
                error={errors.postalCode?.message}
                {...register("postalCode")}
              />
            </div>
            <Input
              label="Phone"
              type="tel"
              placeholder="Optional"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
            {save.isError && (
              <p role="alert" className="text-sm text-destructive">
                {save.error?.message ?? "Could not save address."}
              </p>
            )}
            <div className="flex gap-2 pt-1">
              <Button type="submit" variant="solid" loading={save.isPending}>
                Save address
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(null);
                  save.reset();
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {removal.isError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {removal.error?.message ?? "Could not delete that address."}
        </p>
      )}

      {addresses.length === 0 && editing === null ? (
        <Card className="flex flex-col items-center gap-4 px-6 py-14 text-center">
          <MapPin className="h-6 w-6 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-display text-lg font-medium">No saved addresses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Save one to speed through checkout next time.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={startNew}>
            <Plus className="h-4 w-4" aria-hidden /> Add address
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {addresses.map((a) => {
            const deleting = removal.isPending && removal.variables === a.id;
            return (
              <Card key={a.id} className="flex flex-col justify-between gap-4 p-5">
                <div className="text-sm">
                  <p className="font-semibold">
                    {a.firstName} {a.lastName}
                  </p>
                  <p className="mt-1.5 text-muted-foreground">
                    {a.address1}
                    {a.address2 ? `, ${a.address2}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {[a.city, a.postalCode, a.countryCode.toUpperCase()].filter(Boolean).join(", ")}
                  </p>
                  {a.phone && <p className="mt-1 text-muted-foreground">{a.phone}</p>}
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border pt-3">
                  <button
                    onClick={() => startEdit(a)}
                    aria-label={`Edit address for ${a.firstName} ${a.lastName}`}
                    className="cursor-pointer p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    onClick={() => remove(a.id)}
                    disabled={deleting}
                    aria-label={`Delete address for ${a.firstName} ${a.lastName}`}
                    className="cursor-pointer p-2 text-muted-foreground transition-colors hover:text-destructive disabled:cursor-default disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
