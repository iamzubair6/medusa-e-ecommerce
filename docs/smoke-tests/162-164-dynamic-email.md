# Tests #162–#164 — Dynamic email: frames library, body templates, per-purpose configs, unified campaigns

> Everything lives in /admin/email-templates (top to bottom: Frames → Body
> templates → Purposes → Campaign presets) and the Customers composer.
> Real sends need Brevo configured; previews and saves work without it.

## 0. Nothing changed by itself (migration)
- [ ] BEFORE editing anything: send a test of 2–3 purposes (e.g. Order
      confirmation, OTP) → they look exactly like before this update (your old
      frame text + old wording survived the upgrade).

## 1. Frames library (#162)
- [ ] The old single "Email frame" card is now a **Frames** list with one
      "Default" entry carrying your saved tagline/footer links/address.
- [ ] Duplicate Default → rename "Transactional (no offers)" → delete its
      Offers footer link → save.
- [ ] Purposes → **Order shipped** → Frame dropdown → pick "Transactional
      (no offers)" → live preview loses the Offers link INSTANTLY; other
      purposes still show it. Send a test to confirm. (This is the exact
      owner scenario from the plan.)
- [ ] Frame "None" on any purpose → preview shows the bare body, no shell.
- [ ] Deleting a frame that a purpose uses falls that purpose back to the
      default frame (confirm dialog explains this).

## 2. Body templates ({content} slot) (#163)
- [ ] **Body templates** lists "Plain" and "Maison master". Plain can be
      duplicated but not deleted (it's the safety fallback).
- [ ] Open Maison master → the HTML contains `{content}` where the letter text
      goes; the preview renders the full design with sample content.
- [ ] Duplicate Maison master → change something visible (e.g. hero line) →
      save → assign it to **Order shipped** via the Body dropdown → preview
      repaints with the new design; a test send matches the preview.
- [ ] A body template with the `{content}` slot removed shows the
      missing-slot hint and refuses to save.

## 3. Per-purpose editor (#163)
- [ ] Each of the 8 purposes shows: Frame + Body dropdowns, subject, heading,
      content editor, its placeholder chips, live preview, Send test.
- [ ] Delete `{trackUrl}` from Order shipped's content → an amber WARNING
      appears (missing important placeholder) but saving still works.
- [ ] Placeholders typed as `{orderId}` or `{{orderId}}` both fill in the
      preview/test; values are escaped (type `<b>x</b>` into a subject test —
      it must not render bold in the received email body).

## 4. Trigger a real flow end-to-end
- [ ] Place a COD test order → the confirmation email arrives wearing the
      purpose's chosen frame + body template with real order values.
- [ ] Admin → ship the order with a tracking number → the "no Offers" shipped
      mail arrives (owner scenario verified end-to-end).

## 5. Unified campaigns (#164)
- [ ] Customers → composer now has: preset dropdown, Body template + Frame
      dropdowns, subject, content, live preview, Send test.
- [ ] Your old saved "Your templates" (incl. Maison master announcement) appear
      as **presets**; picking one prefills subject + content unchanged.
- [ ] Save a new preset from the composer → it appears in the presets list on
      /admin/email-templates.
- [ ] Bulk send still requires typing `SEND <count>`, still capped at 300
      recipients, and test-sends only to you until confirmed.
