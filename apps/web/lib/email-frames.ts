import { z } from "zod";
import { DEFAULT_EMAIL_FRAME, emailFrameSchema, parseEmailFrame, type EmailFrame } from "./email-frame";

/**
 * Frames LIBRARY (plan §4, phase 1): several named frames + a default marker,
 * stored in the CMS SiteSetting "emailFrames". Each purpose (and campaign)
 * points at one by id — or at "none" to send the body unwrapped.
 *
 * Migration: when "emailFrames" was never saved, the legacy single-frame
 * setting "emailFrame" (or its defaults) becomes the sole "Default" entry, so
 * nothing visibly changes on upgrade day. Pure module (client-safe) — settings
 * are read server-side (lib/email-settings.ts).
 */

/** Reserved id meaning "no frame — send the body unwrapped". Never a library entry. */
export const NO_FRAME_ID = "none";
/** Sentinel purpose value meaning "use whichever frame is marked default". */
export const DEFAULT_FRAME_REF = "default";

export const namedEmailFrameSchema = emailFrameSchema.extend({
  id: z
    .string()
    .min(1)
    .max(40)
    .refine((id) => id !== NO_FRAME_ID && id !== DEFAULT_FRAME_REF, {
      message: `"${NO_FRAME_ID}" and "${DEFAULT_FRAME_REF}" are reserved frame ids`,
    }),
  name: z.string().min(1).max(60),
});
export type NamedEmailFrame = z.infer<typeof namedEmailFrameSchema>;

export const emailFramesSchema = z.object({
  frames: z.array(namedEmailFrameSchema).min(1).max(20),
  defaultFrameId: z.string().min(1).max(40),
});
export type EmailFrames = z.infer<typeof emailFramesSchema>;

/** Id given to the migrated legacy frame ("default" itself is a reserved sentinel). */
export const LEGACY_FRAME_ID = "frame-main";

/** Build the library from the legacy single-frame setting (or pure defaults). */
export function emailFramesFromLegacy(legacyRaw: unknown): EmailFrames {
  const legacy = parseEmailFrame(legacyRaw);
  return {
    frames: [{ id: LEGACY_FRAME_ID, name: "Default", ...legacy }],
    defaultFrameId: LEGACY_FRAME_ID,
  };
}

/**
 * Parse the raw "emailFrames" setting; falls back to the legacy "emailFrame"
 * setting (second arg) when unset/invalid. Repairs a dangling defaultFrameId.
 */
export function parseEmailFrames(raw: unknown, legacyRaw: unknown = null): EmailFrames {
  const r = emailFramesSchema.safeParse(raw);
  const first = r.success ? r.data.frames[0] : undefined;
  if (!r.success || !first) return emailFramesFromLegacy(legacyRaw);
  const frames = r.data.frames;
  const defaultFrameId = frames.some((f) => f.id === r.data.defaultFrameId)
    ? r.data.defaultFrameId
    : first.id;
  return { frames, defaultFrameId };
}

/**
 * Resolve a purpose/campaign frame reference against the library:
 * "none" → null (unwrapped); "" or "default" or a missing id → the default
 * frame; otherwise the matching frame.
 */
export function resolveFrame(library: EmailFrames, frameId: string): EmailFrame | null {
  if (frameId === NO_FRAME_ID) return null;
  const fallback =
    library.frames.find((f) => f.id === library.defaultFrameId) ?? library.frames[0] ?? DEFAULT_EMAIL_FRAME;
  if (!frameId || frameId === DEFAULT_FRAME_REF) return fallback;
  return library.frames.find((f) => f.id === frameId) ?? fallback;
}
