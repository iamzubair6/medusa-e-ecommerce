"use client";

import { emailShell } from "@/lib/email-shell";
import { DEFAULT_EMAIL_FRAME, type EmailFrame } from "@/lib/email-frame";
import { fillPlaceholders, isFullHtmlDocument } from "@/lib/email-templates";

/** Demo values so every placeholder renders in the live preview. */
const SAMPLE_VARS: Record<string, string> = {
  name: "Ayesha",
  email: "customer@example.com",
  code: "482913",
  orderId: "MSN-00042",
  total: "৳2,350",
  trackUrl: "#",
  trackingNumber: "BD123456789",
  product: "Ribbed Knit Tank",
  size: "M",
  url: "#",
  items: "1× Satin Slip Dress · 2× Ribbed Knit Tank",
  count: "3",
  cartUrl: "#",
};

/** Live rendering of a template inside the brand shell — exactly what the
 *  customer's inbox shows, with sample placeholder values. Sandboxed iframe. */
export function EmailPreview({ subject, heading, body, frame = DEFAULT_EMAIL_FRAME }: { subject: string; heading: string; body: string; frame?: EmailFrame }) {
  // Full HTML documents render exactly as authored — no brand shell (#142).
  const html = isFullHtmlDocument(body)
    ? fillPlaceholders(body, SAMPLE_VARS)
    : emailShell(fillPlaceholders(heading || " ", SAMPLE_VARS), fillPlaceholders(body || "", SAMPLE_VARS), frame);
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground">
        Inbox subject: <strong className="text-foreground">{fillPlaceholders(subject || "—", SAMPLE_VARS)}</strong>
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
