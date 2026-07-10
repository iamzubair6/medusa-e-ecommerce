"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField } from "./fields";
import { RichTextField } from "./rich-text-field";
import { useToast } from "./toast";
import {
  EMAIL_TEMPLATE_META,
  EMAIL_TEMPLATE_TYPES,
  emailTemplatesSchema,
  type EmailTemplates,
  type EmailTemplateType,
} from "@/lib/email-templates";

/**
 * Admin editor for transactional email templates (RHF + Zod). Subject, heading
 * and body are editable per template; placeholders like {orderId} are replaced
 * at send time. "Send test" emails the current (unsaved) state so edits can be
 * previewed in a real inbox before saving.
 */
export function EmailTemplatesEditor({ initial, adminEmail }: { initial: EmailTemplates; adminEmail: string }) {
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
    formState: { errors, isSubmitting },
  } = useForm<EmailTemplates>({ resolver: zodResolver(emailTemplatesSchema), defaultValues: initial });

  const onSubmit = async (values: EmailTemplates) => {
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("Email templates saved.");
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
        body: JSON.stringify({ type, to: testTo.trim(), templates: getValues() }),
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
        <p className="text-sm text-muted-foreground">
          Placeholders such as <code className="rounded bg-muted px-1">{"{orderId}"}</code> are filled automatically
          when the email is sent. Test sends use sample values and go to:
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
                  name={`${type}.body`}
                  render={({ field }) => (
                    <RichTextField label="Body content" value={field.value} onChange={field.onChange} />
                  )}
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
        Save all templates
      </Button>
    </form>
  );
}
