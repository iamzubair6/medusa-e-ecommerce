# Image/Video Storage — free options & how to set one up

> **Why we need this:** the admin can upload images/videos from the device, but
> right now files land on the Medusa server's own disk. On Render's free plan
> that disk is wiped on every restart/deploy — files silently disappear. We need
> a permanent home for uploads before rolling out device-upload everywhere
> (task #97), the Shop-the-Look photo upload, and the product importer.

## Recommendation: Cloudflare R2 ✅

Best free deal for a shop: **10 GB storage free forever, and zero bandwidth
(egress) charges** — image-heavy storefronts pay nothing to serve images. It
speaks the S3 protocol, so Medusa's standard S3 file provider works unchanged.

### How to get it (10–15 minutes, free, needs only an email)
1. Create a Cloudflare account at **dash.cloudflare.com** (free plan is fine).
2. In the left sidebar open **R2 Object Storage** → **Create bucket**.
   - Name: `maison-media` (any name works; remember it).
   - Location: **Asia-Pacific (APAC)** — closest to Bangladesh customers.
3. Make the bucket publicly readable (so the storefront can show images):
   - Open the bucket → **Settings** → **Public access** →
     **Allow Access** under *r2.dev subdomain* (fastest), or connect a custom
     domain like `media.yourshop.com` later.
   - Copy the **Public URL** it gives you (looks like `https://pub-xxxx.r2.dev`).
4. Create API credentials:
   - R2 overview page → **Manage R2 API Tokens** → **Create API Token**.
   - Permission: **Object Read & Write**, scoped to your bucket.
   - Copy the **Access Key ID** and **Secret Access Key** (shown once!).
5. Also copy your **Account ID** (shown on the R2 overview page, right side).

### Send me these 5 values (via .env, never in chat/commits)
```
S3_BUCKET       = maison-media
S3_ACCESS_KEY   = <Access Key ID>
S3_SECRET_KEY   = <Secret Access Key>
S3_ENDPOINT     = https://<Account ID>.r2.cloudflarestorage.com
S3_PUBLIC_URL   = https://pub-xxxx.r2.dev        (from step 3)
```
Put them in `apps/medusa/apps/backend/.env` locally and in Render's environment
for live. I'll wire Medusa's S3 file provider and convert every admin image
field to real device upload.

## Alternatives (also free tiers)

| Provider | Free forever? | Storage | Bandwidth | Notes |
|---|---|---|---|---|
| **Cloudflare R2** ✅ | Yes | 10 GB | **Free (unlimited)** | S3-compatible; our pick |
| Cloudinary | Yes | ~25 GB "credits" mixed | counted in credits | Great image resizing/CDN built in, but credits run out fast with video |
| Supabase Storage | Yes | 1 GB | 5 GB/month | Small; fine for testing only |
| AWS S3 | **Only 12 months** | 5 GB | 100 GB/mo (12 mo) | After a year you start paying; egress is billed |
| Backblaze B2 | Yes | 10 GB | 3× storage/day free | S3-compatible; solid backup choice |

## About the "everything free on AWS" setup (the developer's story)

What that developer described is a **serverless AWS stack**: S3 (files) +
CloudFront (CDN) + Lambda (code runs per-request, no server) + Lambda function
URLs (direct HTTPS to the function, skipping API Gateway's cost) + DynamoDB
(25 GB free NoSQL database) + Cognito (login service). It's real and it can run
nearly free at small scale — the always-free pieces are Lambda (1M requests/mo),
DynamoDB (25 GB), CloudFront (1 TB/mo) and Cognito (up to 10k users); S3 is only
free for the first 12 months.

**Why we're not moving to it:** it's a different architecture, not a cheaper
version of ours. Medusa + Next.js need long-running Node servers and PostgreSQL;
rebuilding on Lambda + DynamoDB would mean rewriting the commerce backend, auth,
and CMS from scratch — months of work to save roughly $0, because our current
stack (Vercel + Render + Neon free tiers) is already ~free at this stage. The
one genuinely great idea in that stack for us is **object storage + CDN for
media** — and R2 gives us exactly that with a better free tier than S3.

When the shop grows past free tiers, the first paid upgrade that matters is the
Medusa server (Render paid tier ≈ $7/mo) — everything else scales fine.
