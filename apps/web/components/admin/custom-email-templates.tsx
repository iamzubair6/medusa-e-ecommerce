"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { RichTextField } from "./rich-text-field";
import { EmailPreview } from "./email-preview";
import { useToast } from "./toast";
import { customEmailTemplateSchema, type CustomEmailTemplate } from "@/lib/email-templates";

const formSchema = customEmailTemplateSchema.omit({ id: true });
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = { name: "", subject: "", heading: "", body: "" };

/**
 * Owner-created email templates: write subject + heading + HTML body once,
 * preview it live in the brand shell, then pick it when emailing customers
 * from /admin/customers. Placeholders: {name} {email}.
 */
export function CustomEmailTemplates({ initial, adminEmail }: { initial: CustomEmailTemplate[]; adminEmail: string }) {
  const router = useRouter();
  const toast = useToast();
  const [templates, setTemplates] = useState(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<CustomEmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState(adminEmail);

  const editing = useMemo(
    () => (editingId && editingId !== "new" ? templates.find((t) => t.id === editingId) : undefined),
    [editingId, templates],
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

  const openEditor = (t?: CustomEmailTemplate) => {
    reset(t ? { name: t.name, subject: t.subject, heading: t.heading, body: t.body } : EMPTY);
    setEditingId(t ? t.id : "new");
  };

  const persist = async (next: CustomEmailTemplate[], done: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save templates");
      setTemplates(next);
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
      const id = `tpl-${Math.random().toString(36).slice(2, 10)}`;
      void persist([...templates, { id, ...v }], `Template "${v.name}" created.`);
    } else if (editing) {
      void persist(
        templates.map((t) => (t.id === editing.id ? { ...t, ...v } : t)),
        `Template "${v.name}" updated.`,
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
        body: JSON.stringify({ to: testTo.trim(), custom: { subject: draft.subject, heading: draft.heading, body: draft.body } }),
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
          <h3 className="font-display text-lg font-bold">Your templates</h3>
          <p className="text-sm text-muted-foreground">
            Reusable designs for announcements & bulk email — send them from <strong>Customers</strong>.
            Placeholders: <code className="rounded bg-muted px-1">{"{name}"}</code>{" "}
            <code className="rounded bg-muted px-1">{"{email}"}</code>
          </p>
        </div>
        {editingId === null && (
          <Button variant="gold" size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4" /> New template
          </Button>
        )}
      </div>

      {templates.length === 0 && editingId === null && (
        <p className="text-sm text-muted-foreground">No custom templates yet — create your first one.</p>
      )}

      {editingId === null &&
        templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.name}</p>
              <p className="truncate text-xs text-muted-foreground">{t.subject}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`Edit template ${t.name}`}
                onClick={() => openEditor(t)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete template ${t.name}`}
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
            <TextField label="Template name (internal)" error={errors.name?.message} {...register("name")} placeholder="Eid announcement" />
            <TextField label="Subject" error={errors.subject?.message} {...register("subject")} placeholder="Something beautiful just arrived" />
          </div>
          <TextField label="Heading (top of the email)" error={errors.heading?.message} {...register("heading")} />
          <RichTextField label="Body (HTML)" value={draft.body} onChange={(v) => setValue("body", v, { shouldDirty: true })} />
          {errors.body?.message && <p className="text-xs text-destructive">{errors.body.message}</p>}

          <EmailPreview subject={draft.subject} heading={draft.heading} body={draft.body} />

          <div className="flex flex-wrap items-end gap-3">
            <Button type="submit" variant="gold" size="sm" loading={saving}>
              {editingId === "new" ? "Create template" : "Save changes"}
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
        title={`Delete template "${confirmingDelete?.name ?? ""}"?`}
        description="It disappears from the send picker immediately. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={() => {
          if (confirmingDelete) {
            void persist(
              templates.filter((t) => t.id !== confirmingDelete.id),
              `Template "${confirmingDelete.name}" deleted.`,
            );
          }
        }}
        onCancel={() => setConfirmingDelete(null)}
      />
    </Card>
  );
}
