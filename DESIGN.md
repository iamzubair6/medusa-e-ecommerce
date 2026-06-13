---
name: Maison
description: Editorial-luxury fashion storefront + CMS — bone, claret, and brass with square-set type.
colors:
  ink: "#231e1a"
  ink-soft: "#58514b"
  claret: "#772c31"
  claret-bright: "#c7434b"
  brass: "#a88657"
  brass-soft: "#d1b894"
  bone-bg: "#f5f1eb"
  card: "#fbf9f4"
  muted: "#e8e2d9"
  muted-foreground: "#6a6158"
  border: "#dcd5cb"
  on-dark: "#f8f6f1"
  destructive: "#ad2d29"
typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(2.25rem, 6vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Hanken Grotesk, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  sm: "0px"
  md: "0px"
  lg: "4px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "28px"
components:
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 28px"
    height: "44px"
  button-solid-hover:
    backgroundColor: "{colors.claret}"
    textColor: "{colors.on-dark}"
  button-accent:
    backgroundColor: "{colors.claret}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 28px"
    height: "44px"
  button-outline:
    backgroundColor: "{colors.bone-bg}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 28px"
    height: "44px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "48px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "20px"
  badge-brass:
    backgroundColor: "{colors.brass}"
    textColor: "{colors.brass}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: Maison

## 1. Overview

**Creative North Star: "The Atelier Letterpress"**

Maison is the printed matter of a couture house translated to screen: bone stock,
square-set type, a claret wax seal, a single brass foil hairline. Every surface
should feel pressed rather than rendered — precise, tactile, made by hand. The
warm near-black ink and parchment canvas are owner-approved and non-negotiable;
they carry the warmth so nothing else has to fake it. Restraint is the luxury:
premium reads through space, a confident type hierarchy, and one well-placed
accent, never through more.

The system serves two registers from one identity. The **storefront** (the default,
brand register) is image-forward and motion-rich — Fraunces drama, generous
margins, editorial reveals. The **admin/CMS** inherits the exact same ink, claret,
brass, and Fraunces/Hanken pairing at higher density: calm, legible, unmistakably
the same house behind the curtain. Nothing in the control plane should look like a
different product.

This system explicitly rejects the **generic SaaS dashboard** (blue-gray cards,
system fonts, hero-metric templates), **cheap discount fast-fashion** (cluttered
grids, neon sale badges, loud red everywhere), **cold tech minimalism** (stark
black-and-white brutalism), and **AI-slop templates** (cream-default-as-laziness,
tracked-uppercase eyebrows on every section, identical card grids, gradient text).

**Key Characteristics:**
- Bone/parchment canvas (#f5f1eb), warm near-black ink (#231e1a) — never pure black on white.
- Square corners by doctrine (0px on buttons, inputs, badges); only cards soften to 4px.
- Claret (#772c31) as a rare signature; brass (#a88657) only as a hairline.
- Fraunces serif display + Hanken Grotesk body — contrast pairing, never two sans.
- Fine-grain texture (5% opacity) and brass gradient rules carry depth; the system is flat.
- Fluid `cubic-bezier(0.22, 1, 0.36, 1)` easing; motion is polish, reduced-motion always honored.

## 2. Colors

A warm, low-contrast editorial palette: parchment and ink do the work, claret and
brass appear rarely and mean something when they do. Tokens are HSL channels in
`packages/ui/src/styles/globals.css` (runtime-themeable so the CMS can retint the
store without a rebuild); hex values below are the sRGB equivalents.

### Primary
- **Atelier Ink** (#231e1a / `--ink` `--primary`): The warm near-black. Body text,
  primary buttons, headlines, footer. It is the default "dark" — pure `#000` is
  forbidden because it reads cold against the parchment.

### Secondary
- **Wax-Seal Claret** (#772c31 / `--accent` `--claret`): The signature. Sale
  prices, primary CTA hover, focus rings, key accents. In dark mode it brightens to
  **Lit Claret** (#c7434b) for contrast.

### Tertiary
- **Foil Brass** (#a88657 / `--gold` `--brass`): Hairline rules, brass badges
  (used at 15% tint), fine dividers, decorative detail only. **Never** a fill for
  large areas. Softens to **Brass Soft** (#d1b894) for subtle states.

### Neutral
- **Parchment** (#f5f1eb / `--background`): The body canvas. Warm bone, owner-approved.
- **Pressed Card** (#fbf9f4 / `--card`): One tonal step up from the canvas — the
  surface for cards, inputs, raised panels. Depth is this step, not a shadow.
- **Muted Linen** (#e8e2d9 / `--muted`): Skeletons, inactive chips, quiet fills.
- **Soft Ink** (#58514b / `--ink-soft`) & **Muted Ink** (#6a6158 / `--muted-foreground`):
  Secondary text and labels. Watch contrast — muted ink on parchment is the one
  place AA can slip; use Soft Ink for anything that must hit 4.5:1.
- **Hairline** (#dcd5cb / `--border` `--input`): All borders and dividers.
- **On-Dark** (#f8f6f1): Text/icons on ink or claret fills.
- **Alert** (#ad2d29 / `--destructive`): Errors and destructive actions only — a
  cooler, sharper red kept entirely separate from the warm claret so "danger" never
  reads as "brand."

### Named Rules
**The One Seal Rule.** Claret is a wax seal, not a coat of paint. It appears on
≤10% of any screen — a price, a CTA hover, a focus ring. Its rarity is the point;
the moment two claret elements compete, one is wrong.

**The Hairline-Only Brass Rule.** Brass is foil, never fill. It exists as a 1px
gradient rule (`linear-gradient(90deg, transparent, brass/0.6, transparent)`) or a
15%-tint badge. A solid brass button or panel is prohibited.

## 3. Typography

**Display Font:** Fraunces (with Georgia, 'Times New Roman', serif)
**Body Font:** Hanken Grotesk (with ui-sans-serif, system-ui, sans-serif)

**Character:** A high-contrast pairing — Fraunces is a soft, optical serif with
editorial drama and true italics; Hanken Grotesk is a clean, neutral grotesque that
gets out of the way for reading and UI. The contrast axis (serif display + sans
body) is the whole point; two sans-serifs would kill it. `h1–h3` use Fraunces with
`-0.01em` tracking; a `tightest` token (`-0.04em`) exists for large display set.

### Hierarchy
- **Display** (Fraunces 400, `clamp(2.25rem, 6vw, 5.5rem)`, lh 1.02): Hero and
  section headlines on the storefront. Capped at ~5.5rem — the page designs, it
  doesn't shout. Use `text-wrap: balance`.
- **Headline** (Fraunces 500, `clamp(1.5rem, 3vw, 2.25rem)`, lh 1.1): Section
  titles, PDP product name, page headers.
- **Title** (Fraunces 600, 1.125rem, lh 1.25): Card titles, group headings, admin
  section labels.
- **Body** (Hanken 400, 1rem, lh 1.6): All running text. Cap measure at 65–75ch.
  Use `text-wrap: pretty` on long prose.
- **Label** (Hanken 600, 0.7rem, uppercase, tracking 0.14em): Input labels, button
  text, eyebrows, badges. The one place uppercase + wide tracking is sanctioned.

### Named Rules
**The Contrast-Pairing Rule.** Always Fraunces against Hanken — serif drama over
sans calm. Never pair two sans-serifs, never set body copy in Fraunces, never set a
hero in the grotesque.

**The Earned Uppercase Rule.** Uppercase + 0.14em tracking is reserved for the
`label` role (buttons, input labels, badges). It is a system signal, not decoration
— it must never become a tracked-caps eyebrow stamped above every section.

## 4. Elevation

The system is **flat by doctrine.** Depth is conveyed through tonal layering and
hairlines, not shadows. The Parchment canvas (#f5f1eb) sits one tonal step below
the Pressed Card surface (#fbf9f4); that single step plus a Hairline border (#dcd5cb)
is how a surface reads as "raised." A fine fractal-noise grain (5% opacity, the
`.grain` utility) adds paper tactility, and brass gradient rules (`.rule-brass`)
divide sections. If a card needs a drop shadow to feel separate, the tonal step or
the border is wrong — fix that first.

### Shadow Vocabulary
- **Overlay shadow** (popups, dialogs, the cart drawer only): a soft ambient shadow
  is acceptable for true floating layers that must detach from the page. Everything
  anchored to the page stays flat.

### Named Rules
**The Flat-Page Rule.** Surfaces on the page are flat at rest and flat on hover.
Shadow is permitted only for elements that genuinely float above the document
(modal, popup, drawer, toast). A resting card with a drop shadow looks like a 2014
app — remove it and lean on the bone→card tonal step.

## 5. Components

### Buttons
- **Shape:** Square (`rounded-sm` resolves to 0px). Corners are sharp by doctrine.
- **Solid (default):** Atelier Ink fill, On-Dark text, that warms to Wax-Seal
  Claret on hover (`hover:bg-accent`). Label type (uppercase, 0.14em tracking).
  Sizes: sm 36px, md 44px, lg 52px tall; horizontal padding 16–36px.
- **Accent:** Claret fill, brightens 110% on hover — for the single most important
  action on a surface.
- **Outline:** Hairline border on parchment; inverts to ink fill + bone text on hover.
- **Ghost / Link:** Ghost is a 5% ink wash on hover; Link uses the animated
  underline (`.link-underline`, a 0→100% background-size sweep, 0.4s fluid).
- **Hover / Focus:** All transitions run 300ms `ease-fluid`. Focus-visible shows a
  2px claret ring offset 2px from the background. Loading swaps in a spinning
  current-color ring and sets `aria-busy`.

### Cards / Containers
- **Corner Style:** Soft 4px (`rounded-lg`) — the *only* place corners round. Cards
  are the lone exception to the square doctrine.
- **Background:** Pressed Card (#fbf9f4) on the Parchment canvas.
- **Shadow Strategy:** None. Depth is the tonal step + Hairline border (see Elevation).
- **Border:** 1px Hairline (#dcd5cb).
- **Internal Padding:** 20px (`p-5`). Use cards only when they're the right
  affordance — never nest them.

### Inputs / Fields
- **Style:** 48px tall, square (0px), Hairline border, translucent Pressed Card
  background (`bg-card/60`), 14px horizontal padding.
- **Label:** Label type above the field (uppercase, 0.14em, Muted Ink).
- **Focus:** Border shifts to full ink, a 1px claret ring appears — quiet, no glow.
- **Hover:** Border warms to `foreground/40`.
- **Error:** Border and ring switch to Alert (#ad2d29); message in Alert below,
  wired via `aria-describedby` / `aria-invalid`.
- **Placeholder:** `muted-foreground/50` — verify it still clears 4.5:1; bump toward
  ink if it's close.

### Badges
- **Style:** Square, label type (0.625rem, uppercase, 0.16em tracking), 2px/8px padding.
- **Variants:** Solid (ink), Accent (claret), **Brass** (15% brass tint fill with
  brass text — the signature for "members," "new," editorial tags), Outline, Muted.

### Navigation
- **Style:** CMS-driven nav + mega-menu. Hanken, restrained weight. Links use the
  `.link-underline` sweep on hover (0.4s fluid); active state carries a persistent
  underline. Announcement bar may use a slow `marquee` (30s linear). Mobile collapses
  to a drawer (a true floating layer — shadow allowed there).

### Signature: The Brass Rule & Grain
Two house details that carry the letterpress feel: `.rule-brass` (a 1px horizontal
brass gradient that fades at both ends, for dividing sections) and `.grain` (a 5%
fractal-noise overlay for paper tactility). Reach for these before reaching for a
shadow or a heavier border.

## 6. Do's and Don'ts

### Do:
- **Do** keep claret to ≤10% of any screen — a price, a CTA hover, a focus ring (The One Seal Rule).
- **Do** use Atelier Ink (#231e1a) for "black," never pure `#000` — it reads cold on parchment.
- **Do** pair Fraunces display against Hanken body; contrast is the system (The Contrast-Pairing Rule).
- **Do** convey depth with the bone→card tonal step and a 1px Hairline, not a shadow (The Flat-Page Rule).
- **Do** keep corners square (0px) everywhere except cards (4px).
- **Do** use brass only as a hairline rule or a 15% tint (The Hairline-Only Brass Rule).
- **Do** give every animation a `prefers-reduced-motion` alternative and check body text ≥4.5:1.
- **Do** ease motion with `cubic-bezier(0.22, 1, 0.36, 1)` — fluid ease-out, no bounce.

### Don't:
- **Don't** build the admin like a generic SaaS dashboard — no blue-gray cards, system fonts, or hero-metric templates.
- **Don't** lapse into cheap fast-fashion — no neon sale badges, no loud red everywhere, no cluttered grids, no aggressive interruptive popups.
- **Don't** go cold-minimalist — no stark black-on-white brutalism; the warm canvas and claret keep it human.
- **Don't** ship AI-slop scaffolding — no tracked-uppercase eyebrow above every section, no identical icon-heading-text card grids, no gradient text, no cream-default-as-laziness.
- **Don't** use `border-left`/`border-right` > 1px as a colored accent stripe; use a full Hairline border or a tonal fill.
- **Don't** put a drop shadow on a resting card — if it needs one to separate, the tonal step or border is wrong.
- **Don't** fill large areas with brass or pair two sans-serifs.
- **Don't** let muted-ink body text or `muted-foreground/50` placeholders slip below 4.5:1 on the parchment.
