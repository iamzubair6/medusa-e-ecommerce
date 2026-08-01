import { z } from "zod";
import { hasContentSlot } from "./email-render";

/**
 * Body-template LIBRARY (plan §4, phase 2): reusable design skeletons with a
 * {content} slot, stored in the CMS SiteSetting "emailBodyTemplates". Each
 * purpose (and campaign) picks one and only writes its content.
 *
 * A skeleton is either a fragment (wrapped in the chosen frame) or a full
 * <!DOCTYPE html> document (sent exactly as authored — no frame). Two seeds
 * exist even when the setting was never saved:
 *   - "plain":          html = "{content}" — exact pre-library behaviour.
 *   - "maison-master":  the full Maison master document with the body copy
 *                       replaced by the {content} slot.
 * "plain" is the guaranteed fallback — the parse re-inserts it if missing and
 * the admin UI offers duplicate (not delete) for it. Pure module (client-safe).
 */

export const emailBodyTemplateSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(60),
  /** Fragment or full document; must contain the {content} slot. */
  html: z
    .string()
    .min(1)
    .max(200_000)
    .refine(hasContentSlot, { message: "The template must include the {content} slot" }),
});
export type EmailBodyTemplate = z.infer<typeof emailBodyTemplateSchema>;

export const emailBodyTemplatesSchema = z.object({
  templates: z.array(emailBodyTemplateSchema).min(1).max(30),
});
export type EmailBodyTemplates = z.infer<typeof emailBodyTemplatesSchema>;

export const PLAIN_BODY_TEMPLATE_ID = "plain";

export const PLAIN_BODY_TEMPLATE: EmailBodyTemplate = {
  id: PLAIN_BODY_TEMPLATE_ID,
  name: "Plain",
  html: "{content}",
};

/**
 * The Maison master campaign design (docs/email-templates/maison-master.html)
 * as a body template: preheader, logo band, claret rule, typographic hero,
 * CTA, editorial tiles and footer kept; the body-copy paragraphs replaced by
 * the {content} slot. Full document → always renders unframed.
 */
export const MAISON_MASTER_BODY_TEMPLATE: EmailBodyTemplate = {
  id: "maison-master",
  name: "Maison master",
  html: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Maison</title>
  <style type="text/css">
    body, table, td { border-collapse: collapse; }
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
    p { margin: 0; }
    a[x-apple-data-detectors='true'] { color: inherit !important; text-decoration: none !important; }
    @media (max-width: 640px) {
      .m-full { width: 100% !important; min-width: 0 !important; }
      .m-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .m-h1 { font-size: 26px !important; line-height: 32px !important; }
      .m-hide { display: none !important; max-height: 0 !important; overflow: hidden !important; }
      .m-stack { display: block !important; width: 100% !important; }
      .m-stack-pad { padding: 0 0 16px 0 !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#eae4d6;">
  <!-- preheader (hidden preview line shown next to the subject) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Something beautiful is waiting for you at Maison. &nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eae4d6;">
    <tr>
      <td align="center" style="padding:36px 12px;">
        <table role="presentation" width="620" cellpadding="0" cellspacing="0" class="m-full" style="width:620px;max-width:620px;">

          <!-- logo band -->
          <tr>
            <td align="center" style="background-color:#1c1a17;padding:26px 32px;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:8px;font-weight:bold;text-transform:uppercase;color:#f5f1e8;">Maison</span><br />
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#b8a98c;">Editorial&nbsp;luxury,&nbsp;every&nbsp;day</span>
            </td>
          </tr>
          <!-- claret rule -->
          <tr><td style="height:3px;line-height:3px;font-size:3px;background-color:#7a1f2b;">&nbsp;</td></tr>

          <!-- typographic hero -->
          <tr>
            <td align="center" class="m-pad" style="background-color:#fbf8f1;border-left:1px solid #d8cfbc;border-right:1px solid #d8cfbc;padding:52px 48px 8px;">
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#7a1f2b;">The&nbsp;new&nbsp;edit</p>
              <p class="m-h1" style="font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:40px;font-weight:bold;color:#1c1a17;padding-top:12px;">
                A season worth<br />dressing for
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin-top:20px;">
                <tr><td style="width:56px;height:1px;line-height:1px;font-size:1px;background-color:#b08d57;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- your content lands here -->
          <tr>
            <td class="m-pad" style="background-color:#fbf8f1;border-left:1px solid #d8cfbc;border-right:1px solid #d8cfbc;padding:28px 48px 8px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:25px;color:#1c1a17;">
              {content}
            </td>
          </tr>

          <!-- CTA (bulletproof table button) -->
          <tr>
            <td align="center" style="background-color:#fbf8f1;border-left:1px solid #d8cfbc;border-right:1px solid #d8cfbc;padding:30px 48px 10px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="background-color:#7a1f2b;">
                    <a href="https://example.com/products" target="_blank"
                       style="display:inline-block;padding:15px 44px;font-family:Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;text-decoration:none;">
                      Shop the edit
                    </a>
                  </td>
                </tr>
              </table>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8a8272;padding-top:12px;">
                Free delivery over ৳2,000 · Cash on Delivery available
              </p>
            </td>
          </tr>

          <!-- two editorial tiles (text-only, stack on mobile) -->
          <tr>
            <td class="m-pad" style="background-color:#fbf8f1;border-left:1px solid #d8cfbc;border-right:1px solid #d8cfbc;padding:34px 48px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="50%" valign="top" class="m-stack m-stack-pad" style="padding-right:10px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d8cfbc;background-color:#f5f1e8;">
                      <tr>
                        <td style="padding:22px 22px 24px;">
                          <p style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a1f2b;">01 — Women</p>
                          <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:bold;color:#1c1a17;padding-top:8px;">The dress, reconsidered</p>
                          <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;color:#5c564a;padding-top:6px;">Silhouettes that move from noon to night.</p>
                          <p style="padding-top:12px;"><a href="https://example.com/pages/women" style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a1f2b;text-decoration:underline;">Explore</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" valign="top" class="m-stack" style="padding-left:10px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d8cfbc;background-color:#f5f1e8;">
                      <tr>
                        <td style="padding:22px 22px 24px;">
                          <p style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#7a1f2b;">02 — Men</p>
                          <p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;font-weight:bold;color:#1c1a17;padding-top:8px;">Tailoring, off duty</p>
                          <p style="font-family:Georgia,'Times New Roman',serif;font-size:13px;line-height:20px;color:#5c564a;padding-top:6px;">Structure where it counts, ease everywhere else.</p>
                          <p style="padding-top:12px;"><a href="https://example.com/pages/men" style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#7a1f2b;text-decoration:underline;">Explore</a></p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- brass hairline + footer inside the card -->
          <tr><td style="height:1px;line-height:1px;font-size:1px;background-color:#b08d57;border-left:1px solid #d8cfbc;border-right:1px solid #d8cfbc;">&nbsp;</td></tr>
          <tr>
            <td align="center" class="m-pad" style="background-color:#f5f1e8;border:1px solid #d8cfbc;border-top:0;padding:26px 48px 30px;">
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#1c1a17;">
                <a href="https://example.com" style="color:#1c1a17;text-decoration:none;">Home</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://example.com/offers" style="color:#1c1a17;text-decoration:none;">Offers</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="https://example.com/track" style="color:#1c1a17;text-decoration:none;">Track order</a>
              </p>
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8a8272;padding-top:14px;line-height:19px;">
                Questions? Just reply — a human reads every email.<br />
                Maison · Dhaka, Bangladesh
              </p>
            </td>
          </tr>

          <!-- outside-the-card small print -->
          <tr>
            <td align="center" style="padding:18px 24px 0;">
              <p style="font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#8a8272;line-height:18px;">
                You're receiving this because you shopped with or subscribed to Maison ({{email}}).<br />
                Prefer fewer letters? Just reply with "unsubscribe".
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
};

export const DEFAULT_EMAIL_BODY_TEMPLATES: EmailBodyTemplates = {
  templates: [PLAIN_BODY_TEMPLATE, MAISON_MASTER_BODY_TEMPLATE],
};

/**
 * Parse the raw "emailBodyTemplates" setting. Never saved → both seeds.
 * Saved → per-item lenient (invalid entries dropped), with "plain" re-inserted
 * up front if missing so the renderer always has a safe fallback.
 */
export function parseEmailBodyTemplates(raw: unknown): EmailBodyTemplates {
  if (raw == null) return DEFAULT_EMAIL_BODY_TEMPLATES;
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { templates?: unknown }).templates)
      ? ((raw as { templates: unknown[] }).templates)
      : null;
  if (!list) return DEFAULT_EMAIL_BODY_TEMPLATES;
  const templates: EmailBodyTemplate[] = [];
  for (const item of list) {
    const one = emailBodyTemplateSchema.safeParse(item);
    if (one.success && !templates.some((t) => t.id === one.data.id)) templates.push(one.data);
  }
  if (!templates.some((t) => t.id === PLAIN_BODY_TEMPLATE_ID)) templates.unshift(PLAIN_BODY_TEMPLATE);
  return { templates };
}

/** Resolve a purpose/campaign body-template reference; missing id → "plain". */
export function resolveBodyTemplate(library: EmailBodyTemplates, bodyTemplateId: string): EmailBodyTemplate {
  return (
    library.templates.find((t) => t.id === bodyTemplateId) ??
    library.templates.find((t) => t.id === PLAIN_BODY_TEMPLATE_ID) ??
    PLAIN_BODY_TEMPLATE
  );
}
