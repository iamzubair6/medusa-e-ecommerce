"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Send, TriangleAlert } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { Combobox } from "./combobox";
import { HtmlBodyField } from "./html-body-field";
import { EmailPreview } from "./email-preview";
import { useToast } from "./toast";
import { EMAIL_TEMPLATE_META, EMAIL_TEMPLATE_TYPES, type EmailTemplateType } from "@/lib/email-templates";
import {
  emailPurposesSchema,
  missingImportantPlaceholders,
  type EmailPurposes,
} from "@/lib/email-purposes";
import { DEFAULT_FRAME_REF, NO_FRAME_ID, resolveFrame, type EmailFrames } from "@/lib/email-frames";
import { resolveBodyTemplate, type EmailBodyTemplates } from "@/lib/email-body-templates";

/**
 * Per-purpose email editor (plan phase 2, RHF + Zod): each of the 8 events
 * picks a frame + body template and holds its subject / heading / content.
 * Live preview renders through the shared renderer; "Send test" emails the
 * current (unsaved) state so edits can be checked in a real inbox first.
 */
export function EmailPurposesEditor({
  initial,
  adminEmail,
  frames,
  bodyTemplates,
}: {
  initial: EmailPurposes;
  adminEmail: string;
  frames: EmailFrames;
  bodyTemplates: EmailBodyTemplates;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<EmailTemplateType | null>(EMAIL_TEMPLATE_TYPES[0]);
  const [testTo, setTestTo] = useState(adminEmail);
  const [testing, setTesting] = useState<EmailTemplateType | null>(null);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmailPurposes>({ resolver: zodResolver(emailPurposesSchema), defaultValues: initial });

  const defaultFrameName = frames.frames.find((f) => f.id === frames.defaultFrameId)?.name ?? "Default";
  const frameOptions = [
    { value: NO_FRAME_ID, label: "No frame — send unwrapped" },
    ...frames.frames.map((f) => ({
      value: f.id,
      label: f.id === frames.defaultFrameId ? `${f.name} (default)` : f.name,
    })),
  ];
  const bodyOptions = bodyTemplates.templates.map((t) => ({ value: t.id, label: t.name }));

  const onSubmit = async (values: EmailPurposes) => {
    try {
      const res = await fetch("/api/admin/email-purposes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Email purposes saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const sendTest = async (type: EmailTemplateType) => {
    if (!testTo.trim()) return toast.error("Enter an inbox for the test send.");
    setTesting(type);
    try {
      const res = await fetch("/api/admin/email-templates/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, to: testTo.trim(), purposes: getValues() }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Test send failed");
      toast.success(`Test "${EMAIL_TEMPLATE_META[type].label}" sent to ${testTo.trim()}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-4">
      <Card className="flex flex-col gap-2 p-5">
        <h3 className="font-display text-lg font-bold">Purposes</h3>
        <p className="text-sm text-muted-foreground">
          Every email the store sends. Placeholders such as{" "}
          <code className="rounded bg-muted px-1">{"{orderId}"}</code> are filled automatically when
          the email goes out. Test sends use sample values and go to:
        </p>
        <input
          type="email"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
          placeholder="you@example.com"
          className="h-10 w-72 rounded-sm border border-input bg-card px-3 text-sm focus-visible:border-foreground focus-visible:outline-none"
        />
      </Card>

      {EMAIL_TEMPLATE_TYPES.map((type) => {
        const meta = EMAIL_TEMPLATE_META[type];
        const isOpen = open === type;
        const values = watch(type);
        const missing = isOpen ? missingImportantPlaceholders(type, values) : [];
        return (
          <Card key={type} className="p-0">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : type)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
            >
              <span className="font-display font-bold">{meta.label}</span>
              {isOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>
            {isOpen && (
              <div className="flex flex-col gap-4 border-t border-border px-5 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={control}
                    name={`${type}.frameId`}
                    render={({ field }) => (
                      <Combobox
                        label="Frame"
                        value={field.value === DEFAULT_FRAME_REF ? "" : field.value}
                        onChange={(v) => field.onChange(v === "" ? DEFAULT_FRAME_REF : v)}
                        options={frameOptions}
                        placeholder={`Default — ${defaultFrameName}`}
                        clearable
                      />
                    )}
                  />
                  <Controller
                    control={control}
                    name={`${type}.bodyTemplateId`}
                    render={({ field }) => (
                      <Combobox
                        label="Body template"
                        value={field.value}
                        onChange={(v) => field.onChange(v === "" ? resolveBodyTemplate(bodyTemplates, "").id : v)}
                        options={bodyOptions}
                        placeholder="Plain"
                        clearable
                      />
                    )}
                  />
                </div>
                <TextField
                  label="Subject"
                  required
                  error={errors[type]?.subject?.message}
                  {...register(`${type}.subject`)}
                />
                <TextField
                  label="Heading (top of the email)"
                  required
                  error={errors[type]?.heading?.message}
                  {...register(`${type}.heading`)}
                />
                <Controller
                  control={control}
                  name={`${type}.content`}
                  render={({ field }) => (
                    <HtmlBodyField label="Content" value={field.value} onChange={field.onChange} />
                  )}
                />
                {errors[type]?.content?.message && (
                  <p className="text-xs text-destructive">{errors[type]?.content?.message}</p>
                )}
                {missing.length > 0 && (
                  <p className="flex items-center gap-1.5 text-xs text-amber-600">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    Missing {missing.map((ph) => (
                      <code key={ph} className="rounded bg-muted px-1">{ph}</code>
                    ))}{" "}
                    — this email usually needs it. You can still save.
                  </p>
                )}
                <EmailPreview
                  subject={values.subject}
                  heading={values.heading}
                  content={values.content}
                  frame={resolveFrame(frames, values.frameId)}
                  bodyTemplateHtml={resolveBodyTemplate(bodyTemplates, values.bodyTemplateId).html}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Placeholders: {meta.placeholders.map((ph) => (
                      <code key={ph} className="mr-1 rounded bg-muted px-1">{ph}</code>
                    ))}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={testing === type}
                    onClick={() => sendTest(type)}
                  >
                    <Send className="mr-1 h-3.5 w-3.5" /> Send test
                  </Button>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
        Save all purposes
      </Button>
    </form>
  );
}
