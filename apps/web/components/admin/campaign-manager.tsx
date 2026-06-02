"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Trash2 } from "lucide-react";
import { Badge, Button, Card } from "@ecom/ui";
import { TextField, SelectField } from "./fields";

export interface AdminCampaign {
  id: string;
  name: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "PAUSED";
  startsAt: string;
  endsAt: string | null;
  payload: { promoCode?: string; note?: string };
}

const STATUSES = ["SCHEDULED", "ACTIVE", "PAUSED", "ENDED"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  status: z.enum(STATUSES),
  startsAt: z.string().min(1, "Required"),
  endsAt: z.string().optional(),
  promoCode: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const statusVariant: Record<AdminCampaign["status"], "gold" | "solid" | "muted" | "outline"> = {
  ACTIVE: "gold",
  SCHEDULED: "solid",
  PAUSED: "outline",
  ENDED: "muted",
};

export function CampaignManager({ campaigns }: { campaigns: AdminCampaign[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { status: "SCHEDULED" } });

  const create = useMutation({
    mutationFn: async (v: FormValues) => {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name,
          status: v.status,
          startsAt: new Date(v.startsAt).toISOString(),
          endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
          payload: { promoCode: v.promoCode || undefined, note: v.note || undefined },
        }),
      });
      if (!res.ok) throw new Error("Could not create campaign (check fields)");
      return res.json();
    },
    onSuccess: () => {
      reset({ status: "SCHEDULED", name: "", startsAt: "", endsAt: "", promoCode: "", note: "" });
      router.refresh();
    },
  });

  const setStatus = useMutation({
    mutationFn: async (vars: { id: string; status: AdminCampaign["status"] }) => {
      const res = await fetch(`/api/admin/campaigns/${vars.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: vars.status }),
      });
      if (!res.ok) throw new Error("Update failed");
    },
    onSuccess: () => router.refresh(),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="flex flex-col gap-8">
      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-bold">New campaign run</h2>
        <form
          onSubmit={handleSubmit((v) => {
            setError(null);
            create.mutate(v, { onError: (e) => setError((e as Error).message) });
          })}
          className="flex flex-col gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" error={errors.name?.message} {...register("name")} />
            <SelectField label="Status" {...register("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Starts" type="datetime-local" error={errors.startsAt?.message} {...register("startsAt")} />
            <TextField label="Ends (optional)" type="datetime-local" {...register("endsAt")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Promo code (optional)" {...register("promoCode")} />
            <TextField label="Banner note (optional)" {...register("note")} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" variant="gold" loading={create.isPending} className="w-fit">
              Create campaign
            </Button>
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{c.name}</span>
                <Badge variant={statusVariant[c.status]}>{c.status.toLowerCase()}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(c.startsAt).toLocaleString()}
                {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleString()}` : ""}
                {c.payload.promoCode ? ` · code ${c.payload.promoCode}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {c.status !== "ACTIVE" && (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: c.id, status: "ACTIVE" })}>
                  Activate
                </Button>
              )}
              {c.status === "ACTIVE" && (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: c.id, status: "PAUSED" })}>
                  Pause
                </Button>
              )}
              <button
                type="button"
                aria-label="Delete campaign"
                onClick={() => remove.mutate(c.id)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
      </div>
    </div>
  );
}
