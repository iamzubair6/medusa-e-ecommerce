"use client";

import { useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Frame, Plus, Pencil, Trash2, CopyPlus, Star } from "lucide-react";
import { Button, Card, ConfirmDialog } from "@ecom/ui";
import { TextField } from "./fields";
import { useToast } from "./toast";
import { namedEmailFrameSchema, type EmailFrames, type NamedEmailFrame } from "@/lib/email-frames";

const formSchema = namedEmailFrameSchema.omit({ id: true });
type FormValues = z.infer<typeof formSchema>;

const EMPTY: FormValues = {
  name: "",
  tagline: "Editorial luxury, every day",
  links: [
    { label: "Home", href: "/" },
    { label: "Offers", href: "/offers" },
    { label: "Track order", href: "/track" },
  ],
  address: "Maison · Dhaka, Bangladesh",
  replyNote: "Questions? Just reply to this email — a human reads it.",
};

const newId = () => `frame-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Frames LIBRARY (plan phase 1): several named frames — tagline, footer links,
 * address, reply note — with one marked default. Each purpose/campaign picks a
 * frame (or "no frame"); deleting a frame in use makes those purposes fall
 * back to the default automatically.
 */
export function EmailFramesCard({ initial }: { initial: EmailFrames }) {
  const router = useRouter();
  const toast = useToast();
  const [library, setLibrary] = useState(initial);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<NamedEmailFrame | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = useMemo(
    () => (editingId && editingId !== "new" ? library.frames.find((f) => f.id === editingId) : undefined),
    [editingId, library],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: EMPTY });
  const links = useFieldArray({ control, name: "links" });

  const openEditor = (f?: NamedEmailFrame, asCopy = false) => {
    reset(
      f
        ? { name: asCopy ? `${f.name} (copy)` : f.name, tagline: f.tagline, links: f.links, address: f.address, replyNote: f.replyNote }
        : EMPTY,
    );
    setEditingId(f && !asCopy ? f.id : "new");
  };

  const persist = async (next: EmailFrames, done: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-frames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save frames");
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
      void persist({ ...library, frames: [...library.frames, { id, ...v }] }, `Frame "${v.name}" created.`);
    } else if (editing) {
      void persist(
        { ...library, frames: library.frames.map((f) => (f.id === editing.id ? { ...f, ...v } : f)) },
        `Frame "${v.name}" updated.`,
      );
    }
  };

  return (
    <Card className="flex max-w-3xl flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold">
            <Frame className="h-4 w-4 text-muted-foreground" /> Email frames
          </h3>
          <p className="text-sm text-muted-foreground">
            The band, footer links and small print wrapped around fragment emails. Each purpose below
            picks a frame (or none) — full-HTML designs skip the frame.
          </p>
        </div>
        {editingId === null && (
          <Button variant="gold" size="sm" onClick={() => openEditor()}>
            <Plus className="h-4 w-4" /> New frame
          </Button>
        )}
      </div>

      {editingId === null &&
        library.frames.map((f) => {
          const isDefault = f.id === library.defaultFrameId;
          return (
            <div key={f.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  {f.name}
                  {isDefault && (
                    <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Default
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {f.tagline || "No tagline"} · {f.links.length} footer link{f.links.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!isDefault && (
                  <button
                    type="button"
                    aria-label={`Make ${f.name} the default frame`}
                    title="Make default"
                    onClick={() => void persist({ ...library, defaultFrameId: f.id }, `"${f.name}" is now the default frame.`)}
                    className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Duplicate frame ${f.name}`}
                  title="Start a new frame from this one"
                  onClick={() => openEditor(f, true)}
                  className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
                >
                  <CopyPlus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Edit frame ${f.name}`}
                  onClick={() => openEditor(f)}
                  className="cursor-pointer p-2 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {library.frames.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Delete frame ${f.name}`}
                    onClick={() => setConfirmingDelete(f)}
                    className="cursor-pointer p-2 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

      {editingId !== null && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Frame name (internal)" error={errors.name?.message} {...register("name")} placeholder="Transactional (no offers)" />
            <TextField label="Tagline (under the logo)" error={errors.tagline?.message} {...register("tagline")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Address line" error={errors.address?.message} {...register("address")} />
            <TextField label="Reply note" error={errors.replyNote?.message} {...register("replyNote")} />
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Footer links (up to 4 — relative paths become site links)
            </span>
            {links.fields.map((f, i) => (
              <div key={f.id} className="flex items-end gap-2">
                <TextField label={i === 0 ? "Label" : undefined} className="w-40" {...register(`links.${i}.label`)} />
                <TextField label={i === 0 ? "Link" : undefined} className="flex-1" placeholder="/offers" {...register(`links.${i}.href`)} />
                <button
                  type="button"
                  aria-label={`Remove footer link ${i + 1}`}
                  onClick={() => links.remove(i)}
                  className="cursor-pointer p-2.5 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {links.fields.length < 4 && (
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => links.append({ label: "", href: "" })}>
                <Plus className="h-4 w-4" /> Add link
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" variant="gold" size="sm" loading={saving}>
              {editingId === "new" ? "Create frame" : "Save changes"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={confirmingDelete !== null}
        title={`Delete frame "${confirmingDelete?.name ?? ""}"?`}
        description="Purposes using this frame fall back to the default frame. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={() => {
          if (confirmingDelete) {
            const frames = library.frames.filter((f) => f.id !== confirmingDelete.id);
            const defaultFrameId =
              library.defaultFrameId === confirmingDelete.id ? frames[0]?.id ?? "" : library.defaultFrameId;
            void persist({ frames, defaultFrameId }, `Frame "${confirmingDelete.name}" deleted.`);
          }
        }}
        onCancel={() => setConfirmingDelete(null)}
      />
    </Card>
  );
}
