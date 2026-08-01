"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Plus, Pencil, Trash2, CopyPlus } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { HtmlBodyField } from "./html-body-field";
import { EmailPreview } from "./email-preview";
import { useToast } from "./toast";
import {
  emailBodyTemplateSchema,
  PLAIN_BODY_TEMPLATE_ID,
  type EmailBodyTemplate,
  type EmailBodyTemplates,
} from "@/lib/email-body-templates";
import { hasContentSlot } from "@/lib/email-render";
import { isFullHtmlDocument } from "@/lib/email-templates";
import { resolveFrame, type EmailFrames } from "@/lib/email-frames";

const formSchema = emailBodyTemplateSchema.omit({ id: true });
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = { name: "", html: "<p>Intro line above your message.</p>\n{content}\n<p>Sign-off below it.</p>" };

const newId = () => `body-${Math.random().toString(36).slice(2, 10)}`;

/** Stand-in purpose content so the preview shows where {content} lands. */
const SAMPLE_CONTENT = `<p style="margin:0 0 14px;font-size:15px;">This is where the purpose's content lands — every paragraph you write replaces the <strong>{content}</strong> slot.</p>
<p style="margin:0;font-size:13px;color:#8a8272;">Pick this design from any purpose's Body template dropdown.</p>`;

/**
 * Body-template LIBRARY (plan phase 2): reusable design skeletons with a
 * {content} slot. Fragments are wrapped in the chosen frame; full <!DOCTYPE>
 * documents ship exactly as authored. "Plain" is the safe fallback — duplicate
 * it to start a new design; it can't be deleted.
 */
export function EmailBodyTemplatesCard({ initial, frames }: { initial: EmailBodyTemplates; frames: EmailFrames }) {
  const router = useRouter();
  const toast = useToast();
  const [library, setLibrary] = useState(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<EmailBodyTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = useMemo(
    () => (editingId && editingId !== "new" ? library.templates.find((t) => t.id === editingId) : undefined),
    [editingId, library],
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

  const openEditor = (t?: EmailBodyTemplate, asCopy = false) => {
    reset(t ? { name: asCopy ? `${t.name} (copy)` : t.name, html: t.html } : EMPTY);
    setEditingId(t && !asCopy ? t.id : "new");
  };

  const persist = async (next: EmailBodyTemplates, done: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-body-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save body templates");
      setLibrary(next);
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
      const id = newId();
      void persist({ templates: [...library.templates, { id, ...v }] }, `Body template "${v.name}" created.`);
    } else if (editing) {
      void persist(
        { templates: library.templates.map((t) => (t.id === editing.id ? { ...t, ...v } : t)) },
        `Body template "${v.name}" updated.`,
      );
    }
  };

  const defaultFrame = resolveFrame(frames, "default");

  return (
    <Card className="flex max-w-3xl flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" /> Body templates
          </h3>
          <p className="text-sm text-muted-foreground">
            Reusable design skeletons — the <code className="rounded bg-muted px-1">{"{content}"}</code> slot marks
            where each purpose&rsquo;s writing lands. Fragments get a frame; full HTML documents ship as-is.
          </p>
        </div>
        {editingId === null && (
          <Button variant="gold" size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4" /> New template
          </Button>
        )}
      </div>

      {editingId === null &&
        library.templates.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-semibold">
                {t.name}
                {t.id === PLAIN_BODY_TEMPLATE_ID && (
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fallback
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {isFullHtmlDocument(t.html) ? "Full document — ships unframed" : "Fragment — wrapped in the purpose's frame"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label={`Duplicate body template ${t.name}`}
                title="Start a new design from this one"
                onClick={() => openEditor(t, true)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
              >
                <CopyPlus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Edit body template ${t.name}`}
                onClick={() => openEditor(t)}
                className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              {t.id !== PLAIN_BODY_TEMPLATE_ID && (
                <button
                  type="button"
                  aria-label={`Delete body template ${t.name}`}
                  onClick={() => setConfirmingDelete(t)}
                  className="cursor-pointer p-2 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ))}

      {editingId !== null && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 border-t border-border pt-4">
          <TextField label="Template name (internal)" error={errors.name?.message} {...register("name")} placeholder="Campaign — hero + tiles" className="sm:w-80" />
          <HtmlBodyField
            label="Design HTML"
            value={draft.html}
            onChange={(v) => setValue("html", v, { shouldDirty: true })}
            sourceOnly
          />
          {errors.html?.message && <p className="text-xs text-destructive">{errors.html.message}</p>}
          {draft.html.length > 0 && !hasContentSlot(draft.html) && (
            <p className="text-xs text-amber-600">
              No <code className="rounded bg-muted px-1">{"{content}"}</code> slot yet — add it where the purpose&rsquo;s
              writing should appear (required to save).
            </p>
          )}

          <EmailPreview
            subject={draft.name || "Body template preview"}
            heading="A sample heading"
            content={SAMPLE_CONTENT}
            frame={defaultFrame}
            bodyTemplateHtml={draft.html}
          />

          <div className="flex items-center gap-3">
            <Button type="submit" variant="gold" size="sm" loading={saving}>
              {editingId === "new" ? "Create template" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`Delete body template "${confirmingDelete?.name ?? ""}"?`}
        description='Purposes using this design fall back to "Plain". This cannot be undone.'
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={() => {
          if (confirmingDelete) {
            void persist(
              { templates: library.templates.filter((t) => t.id !== confirmingDelete.id) },
              `Body template "${confirmingDelete.name}" deleted.`,
            );
          }
        }}
        onCancel={() => setConfirmingDelete(null)}
      />
    </Card>
  );
}
