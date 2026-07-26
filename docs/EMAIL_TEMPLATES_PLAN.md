# Dynamic email templates — design note & build plan

**Status: planned (owner spec, 2026-07-27). Phases below; nothing built yet.**
Owner's ask, in their words: the system sends email for N purposes; the admin
should create various body templates, then for e.g. "Order shipped" pick the
body template from a dropdown and just write the content (rules maintained,
live preview as usual). Per-purpose frame control too — e.g. order-shipped's
footer WITHOUT the Offers link while others keep it. Full freedom, zero code.

---

## 1. The three building blocks

Today the system already has pieces of this; the plan separates them cleanly:

| Concept | What it is | Today | Target |
|---|---|---|---|
| **Purpose** | An event the system sends for: OTP, order confirmation, order shipped, order delivered, welcome, back-in-stock, abandoned cart, newsletter (+ future ones) | fixed list, each with its own subject/heading/body | same fixed list, but each purpose just **points at** a frame + body template and holds its content |
| **Frame** | The wrapper: logo band, tagline, footer links, address, reply note | ONE global frame (emailFrame setting) | a **frames library** — several named frames + "no frame"; each purpose picks one |
| **Body template** | The design skeleton with a `{content}` slot (like the owner's reference template's `{{email_content}}`) | custom templates exist but are whole emails, not reusable skeletons | a **body-template library**; each purpose picks one and only writes content |

## 2. How rendering works (target pipeline)

```
purpose config ──▶ subject, content (admin-written text/HTML)
                          │
                          ▼
        body template's {content} slot filled
                          │
                          ▼
        wrapped in the purpose's chosen frame     (skipped if the body
                          │                        template is a full
                          ▼                        <!DOCTYPE html> doc,
        placeholders filled ({orderId}, {name}…)   or frame = "none")
                          │
                          ▼
                        send
```

- Placeholders stay per-purpose (order shipped exposes `{orderId}
  {trackingNumber} {trackUrl} {name}`, etc.). The editor keeps showing the
  purpose's allowed placeholders, and **warns** when the content is missing an
  important one (e.g. shipped without `{trackUrl}`) — warning, not a block.
- Live preview + "send test" work at every level exactly as now: pick a
  different body template in the dropdown → preview repaints instantly.

## 3. The owner's example, concretely

*"In order shipped I don't want the Offers link in the footer, but others keep it."*

1. Frames library: duplicate the Default frame → name it "Transactional
   (no offers)" → delete the Offers link from its footer → save.
2. Purposes → Order shipped → **Frame dropdown**: pick "Transactional
   (no offers)". Done — no code, everything else untouched.

*"New look for order shipped"*: Body templates → duplicate any design → adjust
the HTML (Visual or HTML-source, `{content}` marks where the purpose's text
lands) → Purposes → Order shipped → Body dropdown → pick it. Preview → test →
save.

## 4. Storage (all CMS SiteSettings — no migrations)

- `emailFrames`: `[{id, name, tagline, links[], address, replyNote}]` +
  `defaultFrameId`. (Today's single `emailFrame` becomes the "Default" entry.)
- `emailBodyTemplates`: `[{id, name, html}]` where `html` contains `{content}`
  (fragment or full document). Seed with two: **"Plain"** (just `{content}` —
  exact current behaviour) and **"Maison master"** (adapted from
  docs/email-templates/maison-master.html with a `{content}` slot).
- `emailPurposes`: `{ [purpose]: {frameId: string|"none", bodyTemplateId,
  subject, heading, content} }`. (Migrates from today's `emailTemplates` —
  existing subject/heading/body map to Plain body + Default frame, so nothing
  visibly changes on upgrade day.)
- Campaign/bulk emails ("Your templates" + the Customers composer) reuse the
  SAME libraries: a campaign = body template + frame + one-off content.

## 5. Admin UI (/admin/email-templates, reorganized top to bottom)

1. **Frames** — list + CRUD + duplicate + "default" marker (the current Email
   frame card generalized to N entries).
2. **Body templates** — list + CRUD + duplicate; editor = Visual/HTML-source
   with the `{content}` chip documented; preview renders with sample content.
3. **Purposes** — the 8 events as accordions (like today): frame dropdown
   (clearable → default) · body dropdown · subject · content editor ·
   placeholder chips + missing-placeholder warning · live preview · send test.
4. Everything keeps the existing toasts/confirm-dialog/test-send patterns.

## 6. Build phases

- **Phase 1 — frames library + per-purpose frame** (small): `emailFrames` +
  purpose→frame mapping; solves the footer example immediately. Migration:
  current `emailFrame` → Default.
- **Phase 2 — body-template library + per-purpose body + content editor**
  (medium): the `{content}` slot pipeline, purpose configs, preview/test
  everywhere, migration of `emailTemplates` (Plain) and reseed of the Maison
  master as a body template.
- **Phase 3 — unify campaigns** (small): Customers composer picks body
  template + frame + writes content; "Your templates" becomes saved campaign
  content presets.

## 7. Rules that stay fixed in code (deliberately)

- The purpose LIST and when each fires (checkout, OTP, etc.) — that's product
  logic, not content.
- Which placeholders each purpose provides (values come from real orders).
- Escaping: placeholder VALUES are always HTML-escaped (injection safety).
- Sending infra (Brevo), rate limits, the 300/day bulk cap.
