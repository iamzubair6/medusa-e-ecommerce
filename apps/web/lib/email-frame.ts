import { z } from "zod";

/**
 * The shared email FRAME's editable content (#150) — what wraps every
 * fragment-based template: tagline under the logo, footer links, address and
 * reply note. Stored in the CMS SiteSetting "emailFrame", edited at
 * /admin/email-templates. Pure module (client-safe) — reading the setting
 * happens server-side (lib/email.ts / the admin page).
 */

export const emailFrameSchema = z.object({
  tagline: z.string().max(60).default("Editorial luxury, every day"),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        href: z.string().min(1).max(300),
      }),
    )
    .max(4)
    .default([
      { label: "Home", href: "/" },
      { label: "Offers", href: "/offers" },
      { label: "Track order", href: "/track" },
    ]),
  address: z.string().max(120).default("Maison · Dhaka, Bangladesh"),
  replyNote: z.string().max(160).default("Questions? Just reply to this email — a human reads it."),
});
export type EmailFrame = z.infer<typeof emailFrameSchema>;

export function parseEmailFrame(raw: unknown): EmailFrame {
  const r = emailFrameSchema.safeParse(raw ?? {});
  return r.success ? r.data : emailFrameSchema.parse({});
}

export const DEFAULT_EMAIL_FRAME: EmailFrame = emailFrameSchema.parse({});
