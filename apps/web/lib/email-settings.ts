import "server-only";

import { getSiteSetting } from "@ecom/cms";
import { parseEmailFrames, type EmailFrames } from "./email-frames";
import { parseEmailBodyTemplates, type EmailBodyTemplates } from "./email-body-templates";
import { parseEmailPurposes, type EmailPurposes } from "./email-purposes";

/**
 * Server-side reads for the email settings trio, migration-aware: the legacy
 * "emailFrame" / "emailTemplates" settings are consulted only while the new
 * "emailFrames" / "emailPurposes" keys were never saved (see the parse
 * functions in the pure modules). All reads swallow DB errors → code defaults.
 */

export interface EmailConfig {
  frames: EmailFrames;
  bodyTemplates: EmailBodyTemplates;
  purposes: EmailPurposes;
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const [framesRaw, legacyFrameRaw, bodiesRaw, purposesRaw, legacyTemplatesRaw] = await Promise.all([
    getSiteSetting("emailFrames").catch(() => null),
    getSiteSetting("emailFrame").catch(() => null),
    getSiteSetting("emailBodyTemplates").catch(() => null),
    getSiteSetting("emailPurposes").catch(() => null),
    getSiteSetting("emailTemplates").catch(() => null),
  ]);
  return {
    frames: parseEmailFrames(framesRaw, legacyFrameRaw),
    bodyTemplates: parseEmailBodyTemplates(bodiesRaw),
    purposes: parseEmailPurposes(purposesRaw, legacyTemplatesRaw),
  };
}
