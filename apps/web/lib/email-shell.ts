/**
 * The branded email frame every transactional email is wrapped in — upgraded
 * to the Maison master design (#148): ink logo band with tagline, claret rule,
 * parchment card, brass hairline, footer links. Table-based + inline styles so
 * it renders correctly in Gmail/Outlook/Apple Mail; no external assets.
 * Pure — safe to import from client components (live previews) and the server
 * send path (lib/email.ts re-exports it).
 */
export function emailShell(heading: string, bodyHtml: string): string {
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const footerLinks = site
    ? `<p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#1c1a17;margin:0;">
        <a href="${site}" style="color:#1c1a17;text-decoration:none;">Home</a>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${site}/offers" style="color:#1c1a17;text-decoration:none;">Offers</a>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <a href="${site}/track" style="color:#1c1a17;text-decoration:none;">Track order</a>
      </p>`
    : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background-color:#eae4d6;">
  <tr>
    <td align="center" style="padding:36px 12px;">
      <table role="presentation" width="620" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:620px;max-width:620px;">
        <tr>
          <td align="center" style="background-color:#1c1a17;padding:26px 32px;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:8px;font-weight:bold;text-transform:uppercase;color:#f5f1e8;">Maison</span><br />
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#b8a98c;">Editorial&nbsp;luxury,&nbsp;every&nbsp;day</span>
          </td>
        </tr>
        <tr><td style="height:3px;line-height:3px;font-size:3px;background-color:#7a1f2b;">&nbsp;</td></tr>
        <tr>
          <td style="background-color:#fbf8f1;border:1px solid #d8cfbc;border-top:0;padding:40px 36px;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
            <h1 style="margin:0 0 6px;font-size:26px;line-height:1.25;font-weight:bold;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">${heading}</h1>
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 20px;">
              <tr><td style="width:56px;height:1px;line-height:1px;font-size:1px;background-color:#b08d57;">&nbsp;</td></tr>
            </table>
            ${bodyHtml}
          </td>
        </tr>
        <tr><td style="height:1px;line-height:1px;font-size:1px;background-color:#b08d57;border-left:1px solid #d8cfbc;border-right:1px solid #d8cfbc;">&nbsp;</td></tr>
        <tr>
          <td align="center" style="background-color:#f5f1e8;border:1px solid #d8cfbc;border-top:0;padding:24px 36px 28px;">
            ${footerLinks}
            <p style="font-family:Georgia,'Times New Roman',serif;font-size:12px;color:#8a8272;line-height:19px;margin:${site ? "14px" : "0"} 0 0;">
              Questions? Just reply to this email — a human reads it.<br />
              Maison &middot; Dhaka, Bangladesh
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
