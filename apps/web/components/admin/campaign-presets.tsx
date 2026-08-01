"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Send, CopyPlus } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { HtmlBodyField } from "./html-body-field";
import { EmailPreview } from "./email-preview";
import { useToast } from "./toast";
import { campaignPresetSchema, type CampaignPreset } from "@/lib/email-campaigns";
import { resolveFrame, type EmailFrames } from "@/lib/email-frames";

const formSchema = campaignPresetSchema.omit({ id: true });
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = { name: "", subject: "", content: "" };

const newId = () => `tpl-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Saved campaign CONTENT presets (plan phase 3): name + subject + content.
 * They prefill the Customers composer, where the design (body template +
 * frame) is picked at send time. Placeholders: {name} {email}.
 */
export function CampaignPresets({ initial, adminEmail, frames }: { initial: CampaignPreset[]; adminEmail: string; frames: EmailFrames }) {
  const router = useRouter();
  const toast = useToast();
  const [presets, setPresets] = useState(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<CampaignPreset | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState(adminEmail);

  const editing = useMemo(
    () => (editingId && editingId !== "new" ? presets.find((t) => t.id === editingId) : undefined),
    [editingId, presets],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY });
  const draft = watch();

  const openEditor = (t?: CampaignPreset, asCopy = false) => {
    reset(t ? { name: asCopy ? `${t.name} (copy)` : t.name, subject: t.subject, content: t.content } : EMPTY);
    setEditingId(t && !asCopy ? t.id : "new");
  };

  const persist = async (next: CampaignPreset[], done: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save presets");
      setPresets(next);
      toast.success(done);
      setEditingId(null);
      setConfirmingDelete(null);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = (v: FormValues) => {
    if (editingId === "new") {
      void persist([...presets, { id: newId(), ...v }], `Preset "${v.name}" created.`);
    } else if (editing) {
      void persist(
        presets.map((t) => (t.id === editing.id ? { ...t, ...v } : t)),
        `Preset "${v.name}" updated.`,
      );
    }
  };

  const sendTest = async () => {
    if (!testTo.trim()) return toast.error("Enter an inbox for the test send.");
    setTesting(true);
    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo.trim(),
          campaign: { subject: draft.subject, content: draft.content, bodyTemplateId: "", frameId: "" },
        }),
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

  return (
    <Card className="flex max-w-3xl flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Campaign presets</h3>
          <p className="text-sm text-muted-foreground">
            Saved subject + content for announcements & bulk email — they prefill the composer in{" "}
            <strong>Customers</strong>, where you pick the design (body template + frame).
            Placeholders: <code className="rounded bg-muted px-1">{"{name}"}</code>{" "}
            <code className="rounded bg-muted px-1">{"{email}"}</code>
          </p>
        </div>
        {editingId === null && (
          <Button variant="gold" size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4" /> New preset
          </Button>
        )}
      </div>

      {presets.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">No presets yet — create your first one.</p>
      )}

      {editingId === null &&
        presets.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.name}</p>
              <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`Duplicate preset ${t.name}`}
                title="Start a new preset from this one"
                onClick={() => openEditor(t, true)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
              >
                <CopyPlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Edit preset ${t.name}`}
                onClick={() => openEditor(t)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete preset ${t.name}`}
                onClick={() => setConfirmingDelete(t)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

      {editingId !== null && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Preset name (internal)" error={errors.name?.message} {...register("name")} placeholder="Eid announcement" />
            <TextField label="Subject" error={errors.subject?.message} {...register("subject")} placeholder="Something beautiful just arrived" />
          </div>
          <HtmlBodyField label="Content" value={draft.content} onChange={(v) => setValue("content", v, { shouldDirty: true })} />
          {errors.content?.message && <p className="text-xs text-destructive">{errors.content.message}</p>}

          <EmailPreview subject={draft.subject} content={draft.content} frame={resolveFrame(frames, "default")} />

          <div className="flex flex-wrap items-end gap-3">
            <Button type="submit" variant="gold" size="sm" loading={saving}>
              {editingId === "new" ? "Create preset" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <div className="ml-auto flex items-end gap-2">
              <TextField label="Test inbox" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="w-56" />
              <Button type="button" variant="outline" size="sm" loading={testing} onClick={sendTest}>
                <Send className="h-4 w-4" /> Send test
              </Button>
            </div>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`Delete preset "${confirmingDelete?.name ?? ""}"?`}
        description="It disappears from the composer immediately. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={() => {
          if (confirmingDelete) {
            void persist(
              presets.filter((t) => t.id !== confirmingDelete.id),
              `Preset "${confirmingDelete.name}" deleted.`,
            );
          }
        }}
        onCancel={() => setConfirmingDelete(null)}
      />
    </Card>
  );
}
