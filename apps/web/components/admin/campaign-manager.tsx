"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Trash2, Pencil } from "lucide-react";
import { Badge, Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { EnumCombobox } from "./combobox";
import { useToast } from "./toast";

export interface AdminCampaign {
  id: string;
  name: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "PAUSED";
  startsAt: string;
  endsAt: string | null;
  payload: { promoCode?: string; note?: string; bannerText?: string; bannerHref?: string };
}

const STATUSES = ["SCHEDULED", "ACTIVE", "PAUSED", "ENDED"] as const;

const formSchema = z.object({
  name: z.string().min(1, "Required"),
  status: z.enum(STATUSES),
  startsAt: z.string().min(1, "Required"),
  endsAt: z.string().optional(),
  promoCode: z.string().optional(),
  bannerText: z.string().max(160, "Keep the banner under 160 characters").optional(),
  bannerHref: z.string().optional(),
  note: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const statusVariant: Record<AdminCampaign["status"], "gold" | "solid" | "muted" | "outline"> = {
  ACTIVE: "gold",
  SCHEDULED: "solid",
  PAUSED: "outline",
  ENDED: "muted",
};

/** Why a campaign is/isn't on the storefront right now (mirrors getActiveCampaign). */
function liveState(c: AdminCampaign): { live: boolean; reason: string } {
  const now = Date.now();
  if (c.status !== "ACTIVE") return { live: false, reason: `not live — status is ${c.status.toLowerCase()}` };
  if (new Date(c.startsAt).getTime() > now) return { live: false, reason: "not live yet — starts in the future" };
  if (c.endsAt && new Date(c.endsAt).getTime() < now) return { live: false, reason: "not live — end date passed" };
  return { live: true, reason: "LIVE — on the storefront announcement bar now" };
}

/** ISO → value for <input type="datetime-local"> in the local timezone. */
const toLocalInput = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const toBody = (v: FormValues) => ({
  name: v.name,
  status: v.status,
  startsAt: new Date(v.startsAt).toISOString(),
  endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
  payload: {
    promoCode: v.promoCode?.trim().toUpperCase() || undefined,
    bannerText: v.bannerText?.trim() || undefined,
    bannerHref: v.bannerHref?.trim() || undefined,
    note: v.note?.trim() || undefined,
  },
});

function CampaignForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: FormValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (v: FormValues) => void;
  onCancel?: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: initial });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Name" error={errors.name?.message} {...register("name")} />
        <EnumCombobox
          label="Status"
          value={watch("status")}
          onChange={(v) => setValue("status", v, { shouldDirty: true, shouldValidate: true })}
          options={STATUSES.map((s) => ({ value: s, label: s.toLowerCase() }))}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Starts" type="datetime-local" error={errors.startsAt?.message} {...register("startsAt")} />
        <TextField label="Ends (optional)" type="datetime-local" {...register("endsAt")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Storefront banner text (empty = the campaign name is shown)"
          placeholder="MID-SEASON SALE — UP TO 40% OFF"
          error={errors.bannerText?.message}
          {...register("bannerText")}
        />
        <TextField label="Banner link (optional)" placeholder="/products?sort=sale" {...register("bannerHref")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Promo code (optional)" placeholder="SALE40" {...register("promoCode")} />
        <TextField label="Internal note (optional)" {...register("note")} />
      </div>
      <p className="text-xs text-muted-foreground">
        While the campaign is <strong>active</strong> and inside its dates, the banner text takes over the
        storefront announcement bar (with &ldquo;use code …&rdquo; appended when a promo code is set), and the code
        is suggested in the cart. Create the code itself in <strong>Discounts</strong>.
      </p>
      <div className="flex items-center gap-2">
        <Button type="submit" variant="gold" loading={pending} className="w-fit">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export function CampaignManager({ campaigns }: { campaigns: AdminCampaign[] }) {
  const router = useRouter();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<AdminCampaign | null>(null);
  const [createKey, setCreateKey] = useState(0); // remounts the create form to clear it after success

  const create = useMutation({
    mutationFn: async (v: FormValues) => {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBody(v)),
      });
      if (!res.ok) throw new Error("Could not create campaign (check fields)");
      return res.json();
    },
    onSuccess: (_d, v) => {
      toast.success(`Campaign "${v.name}" created.`);
      setCreateKey((k) => k + 1);
      router.refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const update = useMutation({
    mutationFn: async (vars: { id: string; values: FormValues }) => {
      const res = await fetch(`/api/admin/campaigns/${vars.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toBody(vars.values)),
      });
      if (!res.ok) throw new Error("Could not update campaign");
    },
    onSuccess: (_d, vars) => {
      toast.success(`Campaign "${vars.values.name}" updated.`);
      setEditingId(null);
      router.refresh();
    },
    onError: (e) => toast.error((e as Error).message),
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
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "ACTIVE" ? "Campaign activated." : "Campaign paused.");
      router.refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast.success("Campaign deleted.");
      setConfirmingDelete(null);
      router.refresh();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="flex flex-col gap-8">
      <Card className="p-6">
        <h2 className="mb-4 font-display text-lg font-bold">New campaign run</h2>
        <CampaignForm
          key={createKey}
          initial={{ name: "", status: "SCHEDULED", startsAt: "", endsAt: "", promoCode: "", bannerText: "", bannerHref: "", note: "" }}
          submitLabel="Create campaign"
          pending={create.isPending}
          onSubmit={(v) => create.mutate(v)}
        />
      </Card>

      <div className="flex flex-col gap-3">
        {campaigns.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.name}</span>
                  <Badge variant={statusVariant[c.status]}>{c.status.toLowerCase()}</Badge>
                  {liveState(c).live && (
                    <span className="flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-wide text-gold">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold motion-reduce:animate-none" /> live
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(c.startsAt).toLocaleString()}
                  {c.endsAt ? ` → ${new Date(c.endsAt).toLocaleString()}` : ""}
                  {c.payload.promoCode ? ` · code ${c.payload.promoCode}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {liveState(c).live
                    ? `Announcement bar shows: “${c.payload.bannerText?.trim() || c.name}${c.payload.promoCode ? ` — use code ${c.payload.promoCode}` : ""}”`
                    : liveState(c).reason}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {c.status !== "ACTIVE" && (
                  <Button size="sm" variant="outline" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: c.id, status: "ACTIVE" })}>
                    Activate
                  </Button>
                )}
                {c.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" loading={setStatus.isPending} onClick={() => setStatus.mutate({ id: c.id, status: "PAUSED" })}>
                    Pause
                  </Button>
                )}
                <button
                  type="button"
                  aria-label={`Edit campaign ${c.name}`}
                  onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                  className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete campaign ${c.name}`}
                  onClick={() => setConfirmingDelete(c)}
                  className="cursor-pointer p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {editingId === c.id && (
              <div className="mt-4 border-t border-border pt-4">
                <CampaignForm
                  initial={{
                    name: c.name,
                    status: c.status,
                    startsAt: toLocalInput(c.startsAt),
                    endsAt: toLocalInput(c.endsAt),
                    promoCode: c.payload.promoCode ?? "",
                    bannerText: c.payload.bannerText ?? "",
                    bannerHref: c.payload.bannerHref ?? "",
                    note: c.payload.note ?? "",
                  }}
                  submitLabel="Save changes"
                  pending={update.isPending}
                  onSubmit={(values) => update.mutate({ id: c.id, values })}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            )}
          </Card>
        ))}
        {campaigns.length === 0 && <p className="text-sm text-muted-foreground">No campaigns yet.</p>}
      </div>

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`Delete campaign "${confirmingDelete?.name ?? ""}"?`}
        description="Its banner and promo surfacing stop immediately. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => {
          if (confirmingDelete) remove.mutate(confirmingDelete.id);
        }}
        onCancel={() => setConfirmingDelete(null)}
      />
    </div>
  );
}
