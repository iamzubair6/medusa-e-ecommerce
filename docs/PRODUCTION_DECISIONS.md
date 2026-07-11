# Production Decisions — TODO (decide before production launch)

These are intentionally **deferred**. The features are built with **pluggable / mock
implementations** so the app works end-to-end now; swapping in real providers is a
small, isolated change. Revisit these together when planning the production deploy.

> Owner asked to note these and decide later. For now everything is built "mocked".

---

## 1. Image / Video upload — storage backend  (task #8)
- **Status:** upload UI + endpoint built; currently proxies to **Medusa's file
  service (local disk)**, which is **wiped on Render's free tier** (ephemeral).
- **Decision needed:** persistent object storage. Options:
  - **Cloudflare R2** (S3-compatible, 10 GB free, no egress) — recommended
  - **Cloudinary** (image/video CDN + transforms, ~25 GB free)
  - AWS S3 / Supabase Storage / Bunny
- **Swap cost:** configure Medusa's file module provider (S3 plugin) + env keys. ~1 file + env.

## 2. OTP delivery — SMS gateway  (tasks #13–#15)
- **Status:** full phone-OTP + registration/login flow built; OTP generation +
  verification work; **sending is mocked** (dev mode surfaces the code on screen /
  logs it). Sender is behind a single `sendOtp()` function.
- **Decision needed:** SMS provider. Options:
  - **Bangladesh gateways:** SSL Wireless, bulksmsbd, Mimsms, Alpha SMS
  - **Global:** Twilio, Vonage
- **Swap cost:** implement `sendOtp(phone, code)` against the chosen gateway + env keys. ~1 file + env.

## 3. Production hosting — server + database  (whole stack)
- **Status:** demo runs on **Neon (DB) + Render free (Medusa) + Vercel (web)**.
  Render free sleeps; uploads + SMS need real providers (above).
- **Decision needed (owner will return for a proper plan):**
  - Where to host **Medusa** (always-on): paid Render / Railway / Fly / a VPS (Docker).
  - **Database**: Neon paid tier vs managed Postgres on the host.
  - Region (close to users — Bangladesh ⇒ Singapore/Mumbai region for latency).
  - Redis (if scaling Medusa beyond in-memory), CDN, custom domain, backups.
- See `docs/GO_LIVE_GUIDE.md` for the current free-tier setup and upgrade notes.

---

## Auth model (built now; see tasks #13)
- **Quick capture (first visit):** optional phone popup → 4-digit OTP → passwordless login.
- **Registration:** first name, last name (optional), phone, email, password → phone verified by OTP.
- **Login:** email **or** phone + password.
- Phone auto-fills at checkout. Promo popup shows **after** phone capture/verify.

## Rate limiting — in-memory vs shared store (2026-07-12)

`lib/rate-limit.ts` is per-instance in-memory. Fine on a single Vercel region /
low traffic, but multi-instance serverless weakens every limit (OTP sends, promo
SMS, search) by a factor of the instance count. When traffic grows: move the
counters to a shared store (Upstash Redis free tier works with Vercel) behind
the same `rateLimit()` signature.
