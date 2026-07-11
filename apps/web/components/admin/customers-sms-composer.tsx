"use client";

import { useRef } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Send, X } from "lucide-react";
import { Button, Card } from "@ecom/ui";
import { TextField, TextareaField } from "./fields";
import { useToast } from "./toast";

const GSM_SEGMENT = 160;
const UNICODE_SEGMENT = 70; // Bengali (any non-GSM text) packs fewer chars per SMS
const EST_BDT_PER_SEGMENT = 0.35;

const baseSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Write a message first.")
    .max(500, "Message must be 500 characters or fewer."),
  audience: z.enum(["all", "selected"]),
  confirm: z.string(),
});
type ComposerValues = z.infer<typeof baseSchema>;

/** The typed-confirmation phrase changes with the live recipient count, so the
 *  schema is built per validation from a ref the render pass keeps current. */
function buildSchema(expectedConfirm: string | null, selectedCount: number) {
  return baseSchema.superRefine((values, ctx) => {
    if (values.audience === "selected" && selectedCount === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["audience"],
        message: "Tick some rows in the table first.",
      });
    }
    if (expectedConfirm === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm"],
        message: "Recipient count is still loading — wait a moment.",
      });
    } else if (values.confirm.trim() !== expectedConfirm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm"],
        message: `Type "${expectedConfirm}" exactly to confirm.`,
      });
    }
  });
}

function segmentInfo(message: string): { chars: number; segments: number; unicode: boolean } {
  // Any char outside 7-bit ASCII (e.g. Bengali) forces Unicode SMS encoding.
  const unicode = [...message].some((ch) => (ch.codePointAt(0) ?? 0) > 127);
  const perSegment = unicode ? UNICODE_SEGMENT : GSM_SEGMENT;
  return {
    chars: message.length,
    unicode,
    segments: message.length === 0 ? 0 : Math.ceil(message.length / perSegment),
  };
}

interface SendResponse {
  sent?: number;
  failed?: number;
  error?: string;
}

export function CustomersSmsComposer({
  selectedIds,
  onClose,
}: {
  selectedIds: string[];
  onClose: () => void;
}) {
  const toast = useToast();

  const audienceQuery = useQuery({
    queryKey: ["admin", "customers", "sms-audience"],
    queryFn: async (): Promise<number> => {
      const res = await fetch("/api/admin/customers/sms");
      const data = (await res.json().catch(() => ({}))) as { recipients?: number; error?: string };
      if (!res.ok || typeof data.recipients !== "number") {
        throw new Error(data.error ?? "Could not count recipients.");
      }
      return data.recipients;
    },
  });

  // Refs keep the resolver's schema in sync with the live recipient count.
  const expectedConfirmRef = useRef<string | null>(null);
  const selectedCountRef = useRef(selectedIds.length);
  const resolver: Resolver<ComposerValues> = (values, context, options) =>
    zodResolver(buildSchema(expectedConfirmRef.current, selectedCountRef.current))(
      values,
      context,
      options,
    );

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ComposerValues>({
    resolver,
    defaultValues: {
      message: "",
      audience: selectedIds.length > 0 ? "selected" : "all",
      confirm: "",
    },
  });

  const audience = watch("audience");
  const message = watch("message");
  const seg = segmentInfo(message);
  const recipients =
    audience === "all" ? (audienceQuery.isSuccess ? audienceQuery.data : null) : selectedIds.length;
  const expectedConfirm = recipients === null ? null : `SEND ${recipients}`;
  const estCost = recipients !== null && seg.segments > 0 ? recipients * seg.segments * EST_BDT_PER_SEGMENT : null;
  expectedConfirmRef.current = expectedConfirm;
  selectedCountRef.current = selectedIds.length;

  const smsUnconfigured =
    errors.root?.type === "smsUnconfigured" ? errors.root.message : undefined;

  const onSend = async (values: ComposerValues) => {
    if (recipients === null) return toast.error("Recipient count is still loading — try again.");
    // The server re-resolves the audience and 409s if it no longer matches this count.
    const body =
      values.audience === "all"
        ? { audience: "all", message: values.message, expectedRecipients: recipients }
        : {
            audience: "selected",
            message: values.message,
            customerIds: selectedIds,
            expectedRecipients: recipients,
          };
    let data: SendResponse;
    let ok: boolean;
    try {
      const res = await fetch("/api/admin/customers/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      data = (await res.json().catch(() => ({}))) as SendResponse;
      ok = res.ok;
    } catch {
      toast.error("Network error — nothing was sent.");
      return;
    }
    if (data.error === "SMS is not configured.") {
      setError("root", {
        type: "smsUnconfigured",
        message:
          "SMS is not configured on this environment — set the MiM SMS credentials (SMS_PROVIDER, MIMSMS_*) to enable promotional sends.",
      });
      return;
    }
    if (!ok) {
      toast.error(data.error ?? "Sending failed.");
      return;
    }
    const sent = data.sent ?? 0;
    const failed = data.failed ?? 0;
    if (sent === 0) {
      toast.error(data.error ? `Failed to send: ${data.error}` : `Sent to 0, failed ${failed}.`);
      return;
    }
    toast.success(`Sent to ${sent}, failed ${failed}.`);
    onClose();
  };

  return (
    <Card className="mb-4 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-medium text-foreground">Send promotional SMS</h2>
          <p className="text-xs text-muted-foreground">
            Phone numbers are resolved server-side — only customer IDs leave this page.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close composer"
          onClick={onClose}
          className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {smsUnconfigured && (
        <div className="mb-4 flex items-start gap-2.5 rounded-sm border border-destructive/40 bg-destructive/5 p-3.5 text-sm text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p>{smsUnconfigured}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSend)} className="flex flex-col gap-4">
        <div>
          <TextareaField
            label="Message"
            required
            placeholder="Eid sale — up to 40% off everything…"
            maxLength={500}
            error={errors.message?.message}
            {...register("message")}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {seg.chars}/500 characters · {seg.segments} segment{seg.segments === 1 ? "" : "s"}
            {seg.chars > 0 &&
              (seg.unicode ? " (Bengali/Unicode: 70 chars/segment)" : " (160 chars/segment)")}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Audience
          </legend>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              value="all"
              className="h-4 w-4 cursor-pointer accent-[hsl(var(--accent))]"
              {...register("audience")}
            />
            All customers with a phone
            {audience === "all" && audienceQuery.isPending && (
              <span className="text-xs text-muted-foreground">counting…</span>
            )}
            {audienceQuery.isSuccess && (
              <span className="text-xs text-muted-foreground">({audienceQuery.data})</span>
            )}
          </label>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="radio"
              value="selected"
              className="h-4 w-4 cursor-pointer accent-[hsl(var(--accent))]"
              {...register("audience")}
            />
            Selected rows <span className="text-xs text-muted-foreground">({selectedIds.length})</span>
          </label>
          {errors.audience?.message && (
            <span className="text-xs text-destructive">{errors.audience.message}</span>
          )}
          {audience === "all" && audienceQuery.isError && (
            <span className="flex items-center gap-2 text-xs text-destructive">
              {audienceQuery.error?.message ?? "Could not count recipients."}
              <button
                type="button"
                onClick={() => void audienceQuery.refetch()}
                className="cursor-pointer underline underline-offset-2"
              >
                Retry
              </button>
            </span>
          )}
        </fieldset>

        <div className="rounded-sm border border-border bg-muted/40 p-3.5 text-sm">
          {recipients === null ? (
            <p className="text-muted-foreground">Counting recipients…</p>
          ) : recipients === 0 ? (
            <p className="text-muted-foreground">
              {audience === "all"
                ? "No customers have a phone number yet."
                : "No rows selected — tick customers in the table below."}
            </p>
          ) : (
            <p>
              <span className="font-medium">{recipients}</span> recipient{recipients === 1 ? "" : "s"} ×{" "}
              {seg.segments || 1} segment{seg.segments === 1 ? "" : "s"} ≈{" "}
              <span className="font-medium">
                ৳{(estCost ?? recipients * EST_BDT_PER_SEGMENT).toFixed(2)}
              </span>{" "}
              <span className="text-xs text-muted-foreground">(~৳0.35/SMS/segment est.)</span>
            </p>
          )}
        </div>

        <TextField
          label={
            expectedConfirm === null
              ? "Type the confirmation to send"
              : `Type "${expectedConfirm}" to confirm`
          }
          required
          placeholder={expectedConfirm ?? "SEND …"}
          autoComplete="off"
          error={errors.confirm?.message}
          {...register("confirm")}
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="accent"
            size="sm"
            loading={isSubmitting}
            disabled={recipients === null || recipients === 0}
          >
            <Send className="h-3.5 w-3.5" /> Send SMS
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
