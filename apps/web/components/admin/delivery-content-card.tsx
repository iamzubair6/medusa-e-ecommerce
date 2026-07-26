"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, TextareaField } from "./fields";
import { useToast } from "./toast";

const schema = z.object({
  deliveryLine: z.string().max(200),
  shippingReturns: z.string().max(6000),
});
type Values = z.infer<typeof schema>;

/** The customer-facing delivery copy shown on every product page — lives here
 *  next to the shipping rates it describes (moved from Brand & theme, #135). */
export function DeliveryContentCard({ initial }: { initial: Values }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: initial });

  const onSubmit = async (values: Values) => {
    try {
      const res = await fetch("/api/admin/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, deliveryLine: values.deliveryLine.trim() }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Delivery content saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <Card className="mb-6 p-6">
      <div className="mb-1 flex items-center gap-2">
        <PackageOpen className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-display text-lg font-bold">Delivery content (product page)</h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        What shoppers read about delivery on every product page — keep it in sync with the rates below.
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <TextField
          label="Delivery line (shown under the buy box)"
          error={errors.deliveryLine?.message}
          {...register("deliveryLine")}
        />
        <TextareaField
          label="Shipping & Returns (HTML or text — PDP accordion)"
          placeholder="Standard delivery in 3–5 days. Cash on Delivery available. Free returns within 30 days."
          error={errors.shippingReturns?.message}
          {...register("shippingReturns")}
        />
        <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
          Save delivery content
        </Button>
      </form>
    </Card>
  );
}
