import { z } from "zod";
import { customEmailTemplateSchema, isFullHtmlDocument } from "./email-templates";

/**
 * Campaign CONTENT presets (plan §4 + phase 3): saved (name, subject, content)
 * entries that prefill the Customers bulk-email composer — the design comes
 * from the shared body-template + frame libraries picked at send time, so a
 * preset is just the words. Stored in the existing "customEmailTemplates"
 * SiteSetting (same key, new shape).
 *
 * Migration: legacy entries were whole emails {subject, heading, body}. Their
 * body becomes content; a non-empty heading is preserved by prepending the
 * shell's h1 markup (full-document bodies never used the heading, so they map
 * 1:1). Pure module (client-safe).
 */

export const campaignPresetSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(80),
  subject: z.string().min(1).max(150),
  /** Fragment (framed via a body template) or a FULL html document (sent as-is). */
  content: z.string().min(1).max(200_000),
});
export type CampaignPreset = z.infer<typeof campaignPresetSchema>;

export const campaignPresetsSchema = z.array(campaignPresetSchema).max(50);

/** Legacy heading → the same h1 the shell used to render above the body. */
function headingHtml(heading: string): string {
  return `<h1 style="margin:0 0 6px;font-size:26px;line-height:1.25;font-weight:bold;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">${heading}</h1>\n`;
}

/** Per-item lenient parse: new shape wins; legacy entries are converted; junk dropped. */
export function parseCampaignPresets(raw: unknown): CampaignPreset[] {
  if (!Array.isArray(raw)) return [];
  const presets: CampaignPreset[] = [];
  for (const item of raw.slice(0, 50)) {
    const next = campaignPresetSchema.safeParse(item);
    if (next.success) {
      presets.push(next.data);
      continue;
    }
    const legacy = customEmailTemplateSchema.safeParse(item);
    if (legacy.success) {
      const { id, name, subject, heading, body } = legacy.data;
      const content =
        isFullHtmlDocument(body) || !heading.trim() ? body : `${headingHtml(heading)}${body}`;
      presets.push({ id, name, subject, content: content.slice(0, 200_000) });
    }
  }
  return presets;
}

/** What the bulk-send route accepts for one campaign (composer-authored). */
export const campaignSendSchema = z.object({
  subject: z.string().min(1).max(150),
  content: z.string().min(1).max(200_000),
  /** "" → the Plain body template. */
  bodyTemplateId: z.string().max(40),
  /** "" / "default" → default frame; "none" → unwrapped. */
  frameId: z.string().max(40),
});
export type CampaignSend = z.infer<typeof campaignSendSchema>;
