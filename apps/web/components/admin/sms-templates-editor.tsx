"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button, Card } from "@ecom/ui";
import { TextField, TextareaField } from "./fields";
import { useToast } from "./toast";
import {
  SMS_TEMPLATE_META,
  SMS_TEMPLATE_TYPES,
  fillSmsPlaceholders,
  smsTemplatesSchema,
  type SmsTemplates,
} from "@/lib/sms-templates";

const SAMPLE_VARS: Record<string, string> = {
  code: "482913",
  orderId: "MSN-00042",
  total: "Tk 2,350",
  trackUrl: "https://yoursite/track",
};

/** GSM 160/segment vs Unicode (Bengali) 70/segment. */
function segments(text: string): number {
  const unicode = [...text].some((ch) => (ch.codePointAt(0) ?? 0) > 127);
  return text.length === 0 ? 0 : Math.ceil(text.length / (unicode ? 70 : 160));
}

/**
 * Admin editor for SMS copy (RHF + Zod). Live preview substitutes sample
 * values so the admin sees exactly what customers receive, with a per-template
 * segment (cost) counter.
 */
export function SmsTemplatesEditor({ initial }: { initial: SmsTemplates }) {
  const router = useRouter();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SmsTemplates>({ resolver: zodResolver(smsTemplatesSchema), defaultValues: initial });

  const values = watch();

  const onSubmit = async (data: SmsTemplates) => {
    try {
      const res = await fetch("/api/admin/sms-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Could not save");
      toast.success("SMS templates saved.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-4">
      <Card className="flex flex-col gap-3 p-6">
        <h3 className="font-display text-lg font-bold">Company name</h3>
        <p className="text-sm text-muted-foreground">
          Mobile operators require your brand name inside every SMS — templates use it via{" "}
          <code className="rounded bg-muted px-1">{"{company}"}</code>.
        </p>
        <TextField label="Brand / company name" required error={errors.companyName?.message} {...register("companyName")} />
      </Card>

      {SMS_TEMPLATE_TYPES.map((type) => {
        const meta = SMS_TEMPLATE_META[type];
        const preview = fillSmsPlaceholders(values[type] ?? "", { ...SAMPLE_VARS, company: values.companyName ?? "" });
        return (
          <Card key={type} className="flex flex-col gap-3 p-6">
            <h3 className="font-display text-lg font-bold">{meta.label}</h3>
            <TextareaField label="Message" required error={errors[type]?.message} {...register(type)} />
            <p className="text-xs text-muted-foreground">
              Placeholders: {meta.placeholders.map((ph) => (
                <code key={ph} className="mr-1 rounded bg-muted px-1">{ph}</code>
              ))}
              · {segments(preview)} segment{segments(preview) === 1 ? "" : "s"} per SMS
            </p>
            <div className="rounded-sm border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Preview
              </p>
              {preview || <span className="text-muted-foreground">—</span>}
            </div>
          </Card>
        );
      })}

      <Button type="submit" variant="gold" loading={isSubmitting} className="w-fit">
        Save SMS templates
      </Button>
    </form>
  );
}
