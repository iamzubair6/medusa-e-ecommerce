"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, Send } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { Combobox } from "./combobox";
import { HtmlBodyField } from "./html-body-field";
import { EmailPreview } from "./email-preview";
import { useToast } from "./toast";
import { campaignSendSchema, type CampaignPreset, type CampaignSend } from "@/lib/email-campaigns";
import { DEFAULT_FRAME_REF, NO_FRAME_ID, resolveFrame, type EmailFrames } from "@/lib/email-frames";
import { resolveBodyTemplate, type EmailBodyTemplates } from "@/lib/email-body-templates";

/**
 * Bulk email composer (plan phase 3): pick a body template + frame from the
 * shared libraries, write (or prefill from a preset) the subject + content,
 * preview, test, then send to every customer with a real email. Typed
 * SEND-count confirmation; audience resolved server-side.
 */
export function CustomersEmailComposer({
  presets,
  frames,
  bodyTemplates,
  adminEmail,
}: {
  presets: CampaignPreset[];
  frames: EmailFrames;
  bodyTemplates: EmailBodyTemplates;
  adminEmail: string;
}) {
  const toast = useToast();
  const [presetId, setPresetId] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [testTo, setTestTo] = useState(adminEmail);
  const [testing, setTesting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    watch,
    formState: { errors },
  } = useForm<CampaignSend>({
    resolver: zodResolver(campaignSendSchema),
    defaultValues: { subject: "", content: "", bodyTemplateId: "", frameId: "" },
  });
  const draft = watch();

  const applyPreset = (id: string) => {
    setPresetId(id);
    const preset = presets.find((p) => p.id === id);
    if (preset) {
      reset({ ...getValues(), subject: preset.subject, content: preset.content });
    }
  };

  const audience = useQuery({
    queryKey: ["bulk-email-audience"],
    queryFn: async () => {
      const res = await fetch("/api/admin/customers/email");
      const d = (await res.json()) as { recipients?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not load the audience");
      return d.recipients ?? 0;
    },
    staleTime: 60_000,
  });

  const send = useMutation({
    mutationFn: async (values: CampaignSend) => {
      const res = await fetch("/api/admin/customers/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, expectedRecipients: audience.data ?? 0 }),
      });
      const d = (await res.json().catch(() => ({}))) as { sent?: number; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Send failed");
      return d.sent ?? 0;
    },
    onSuccess: (sent) => {
      toast.success(`Campaign sent to ${sent} inbox${sent === 1 ? "" : "es"}.`);
      setConfirmText("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const sendTest = async () => {
    if (!testTo.trim()) return toast.error("Enter an inbox for the test send.");
    setTesting(true);
    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.trim(), campaign: getValues() }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Test send failed");
      toast.success(`Test sent to ${testTo.trim()}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const defaultFrameName = frames.frames.find((f) => f.id === frames.defaultFrameId)?.name ?? "Default";
  const frameOptions = [
    { value: NO_FRAME_ID, label: "No frame — send unwrapped" },
    ...frames.frames.map((f) => ({
      value: f.id,
      label: f.id === frames.defaultFrameId ? `${f.name} (default)` : f.name,
    })),
  ];
  const bodyOptions = bodyTemplates.templates.map((t) => ({ value: t.id, label: t.name }));

  const count = audience.data ?? 0;
  const confirmed = confirmText.trim() === `SEND ${count}`;

  return (
    <Card className="mb-6 flex flex-col gap-4 p-6">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-display text-lg font-bold">Email campaign</h3>
      </div>

      <form onSubmit={handleSubmit((v) => send.mutate(v))} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Combobox
            label="Start from a preset (optional)"
            value={presetId}
            onChange={applyPreset}
            options={presets.map((p) => ({ value: p.id, label: p.name }))}
            placeholder={presets.length === 0 ? "No presets saved yet" : "Blank campaign"}
            clearable
          />
          <div className="flex flex-col justify-end pb-1 text-sm text-muted-foreground">
            {audience.isPending && "Counting the audience…"}
            {audience.isError && <span className="text-destructive">{(audience.error as Error).message}</span>}
            {audience.isSuccess && (
              <span>
                Audience: <strong className="text-foreground">{count}</strong> customer{count === 1 ? "" : "s"} with an
                email
              </span>
            )}
          </div>
        </div>
        {presets.length === 0 && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Tip: save reusable content as presets in{" "}
            <Link href="/admin/email-templates" className="underline underline-offset-2 hover:text-foreground">
              Email templates
            </Link>
            .
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={control}
            name="bodyTemplateId"
            render={({ field }) => (
              <Combobox
                label="Body template"
                value={field.value}
                onChange={field.onChange}
                options={bodyOptions}
                placeholder="Plain"
                clearable
              />
            )}
          />
          <Controller
            control={control}
            name="frameId"
            render={({ field }) => (
              <Combobox
                label="Frame"
                value={field.value === DEFAULT_FRAME_REF ? "" : field.value}
                onChange={(v) => field.onChange(v)}
                options={frameOptions}
                placeholder={`Default — ${defaultFrameName}`}
                clearable
              />
            )}
          />
        </div>

        <TextField label="Subject" required error={errors.subject?.message} {...register("subject")} placeholder="Something beautiful just arrived" />
        <Controller
          control={control}
          name="content"
          render={({ field }) => <HtmlBodyField label="Content" value={field.value} onChange={field.onChange} />}
        />
        {errors.content?.message && <p className="text-xs text-destructive">{errors.content.message}</p>}

        <EmailPreview
          subject={draft.subject}
          content={draft.content}
          frame={resolveFrame(frames, draft.frameId)}
          bodyTemplateHtml={resolveBodyTemplate(bodyTemplates, draft.bodyTemplateId).html}
        />

        <div className="flex flex-wrap items-end gap-3">
          <TextField label="Test inbox" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="w-56" />
          <Button type="button" variant="outline" size="sm" loading={testing} onClick={sendTest}>
            <Send className="h-4 w-4" /> Send test
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <TextField
            label={`Type SEND ${count} to confirm`}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`SEND ${count}`}
            className="w-64"
          />
          <Button type="submit" variant="gold" loading={send.isPending} disabled={!confirmed || count === 0}>
            Send campaign
          </Button>
          <p className="pb-1 text-xs text-muted-foreground">
            Brevo free tier: 300 emails/day — campaigns above 300 recipients are blocked.
          </p>
        </div>
      </form>
    </Card>
  );
}
