/**
 * The branded email frame (logo band, claret rule, parchment card, footer).
 * Pure — safe to import from client components for live previews as well as
 * from the server send path (lib/email.ts re-exports it).
 */
export function emailShell(heading: string, bodyHtml: string): string {
  return `
<div style="background:#eae4d6;padding:36px 16px;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
  <div style="max-width:540px;margin:0 auto;">
    <div style="background:#1c1a17;padding:22px 32px;text-align:center;">
      <span style="font-size:24px;letter-spacing:6px;font-weight:bold;text-transform:uppercase;color:#f5f1e8;">Maison</span>
    </div>
    <div style="height:3px;background:#7a1f2b;"></div>
    <div style="background:#fbf8f1;border:1px solid #d8cfbc;border-top:0;padding:36px 32px;">
      <h1 style="margin:0 0 18px;font-size:26px;line-height:1.25;font-weight:bold;">${heading}</h1>
      ${bodyHtml}
    </div>
    <p style="margin:18px 8px 0;text-align:center;font-size:12px;color:#8a8272;">
      Maison · editorial luxury, every day.<br/>Questions? Just reply to this email — a human reads it.
    </p>
  </div>
</div>`;
}
