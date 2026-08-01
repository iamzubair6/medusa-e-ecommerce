import type { EmailFrame } from "./email-frame";
import { fillPlaceholders, isFullHtmlDocument } from "./email-templates";
import { emailShell } from "./email-shell";

/**
 * The ONE shared email renderer (plan: docs/EMAIL_TEMPLATES_PLAN.md §2).
 * Pure + client-safe — used by lib/email.ts, the admin test/bulk routes and
 * the client-side <EmailPreview>, so server sends and live previews can never
 * drift apart.
 *
 * Pipeline: body template's {content} slot is filled with the purpose's (or
 * campaign's) content → if the result is a full <!DOCTYPE html> document OR
 * the frame is "none" (null), placeholders are filled and it ships as-is;
 * otherwise it's wrapped in the branded shell with the chosen frame.
 */

/** The body-template slot where purpose/campaign content lands. */
export const CONTENT_SLOT = "{content}";

/** Does a body template contain the {content} (or {{content}}) slot? */
export function hasContentSlot(html: string): boolean {
  return /\{\{content\}\}|\{content\}/.test(html);
}

/**
 * Literal slot fill — NOT placeholder substitution: the content is trusted
 * admin-authored HTML and must land unescaped. Runs before fillPlaceholders
 * so `{content}` is never treated as a placeholder token.
 */
export function fillContentSlot(templateHtml: string, content: string): string {
  return templateHtml.replace(/\{\{content\}\}|\{content\}/g, () => content);
}

export interface RenderEmailHtmlArgs {
  /** Resolved frame, or null for "no frame" (send the body unwrapped). */
  frame: EmailFrame | null;
  /** Body-template skeleton with a {content} slot. Defaults to the slot alone ("Plain"). */
  bodyTemplateHtml?: string;
  /** Heading shown at the top of the framed shell. Empty = no heading block. */
  heading: string;
  /** Admin-authored content HTML for this purpose/campaign. */
  content: string;
  /** Placeholder values — always HTML-escaped by fillPlaceholders. */
  vars: Record<string, string>;
}

/** Render the final email HTML. See module doc for the pipeline. */
export function renderEmailHtml({ frame, bodyTemplateHtml, heading, content, vars }: RenderEmailHtmlArgs): string {
  const body = fillContentSlot(bodyTemplateHtml ?? CONTENT_SLOT, content);
  if (isFullHtmlDocument(body) || frame === null) return fillPlaceholders(body, vars);
  return emailShell(fillPlaceholders(heading, vars), fillPlaceholders(body, vars), frame);
}

/**
 * Demo values so every placeholder renders in live previews and test sends —
 * one shared set (client preview + server test route use the same values).
 */
export const SAMPLE_EMAIL_VARS: Record<string, string> = {
  name: "Ayesha",
  email: "customer@example.com",
  code: "482913",
  orderId: "MSN-00042",
  total: "৳2,350",
  trackUrl: "https://example.com/track",
  trackingNumber: "BD123456789",
  product: "Ribbed Knit Tank",
  size: "M",
  url: "https://example.com/products/ribbed-knit-tank",
  items: "1× Satin Slip Dress · 2× Ribbed Knit Tank",
  count: "3",
  cartUrl: "https://example.com/cart",
  incentive: "Complete your order today — free delivery on us.",
  offersUrl: "https://example.com/offers",
};
