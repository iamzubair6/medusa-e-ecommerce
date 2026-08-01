"use client";

import { DEFAULT_EMAIL_FRAME, type EmailFrame } from "@/lib/email-frame";
import { fillPlaceholders } from "@/lib/email-templates";
import { renderEmailHtml, SAMPLE_EMAIL_VARS } from "@/lib/email-render";

/**
 * Live rendering through the ONE shared renderer (lib/email-render.ts) —
 * exactly what the customer's inbox shows, with sample placeholder values.
 * Sandboxed iframe. `frame: null` previews the "no frame" (unwrapped) mode.
 */
export function EmailPreview({
  subject,
  heading = "",
  content,
  frame = DEFAULT_EMAIL_FRAME,
  bodyTemplateHtml,
}: {
  subject: string;
  heading?: string;
  content: string;
  frame?: EmailFrame | null;
  bodyTemplateHtml?: string;
}) {
  const html = renderEmailHtml({
    frame,
    bodyTemplateHtml,
    heading: heading || "",
    content: content || "",
    vars: SAMPLE_EMAIL_VARS,
  });
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">
        Inbox subject: <strong className="text-foreground">{fillPlaceholders(subject || "—", SAMPLE_EMAIL_VARS)}</strong>
      </p>
      <iframe
        title="Email preview"
        sandbox=""
        srcDoc={html}
        className="h-[420px] w-full rounded-md border border-border bg-white"
      />
    </div>
  );
}
