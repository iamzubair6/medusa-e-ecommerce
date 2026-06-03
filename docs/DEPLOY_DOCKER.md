# Deploy on one server with Docker Compose

Run the **entire stack** (Postgres + Medusa + storefront + optional HTTPS) on a
single server with one command. Cost: **$0** on Oracle Cloud "Always Free", or
~€4/mo on Hetzner / any small VPS.

> ⚠️ These Docker files are a tested-pattern starting point but were **not built on
> the author's machine** (no Docker there). Build on your server; if an image fails,
> send the error and it's a quick fix.

---

## 0. Get a server

- **Oracle Cloud Always Free** — an Ampere (ARM) VM, free forever. Or
- **Hetzner** CX22 (~€4/mo), **AWS Lightsail**, **DigitalOcean**, etc.
- OS: Ubuntu 22.04+. Open ports **80, 443** (and **3000, 9000** if testing by IP).

Install Docker:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

---

## 1. Get the code + configure

```bash
git clone https://github.com/iamzubair6/medusa-e-ecommerce.git
cd medusa-e-ecommerce
cp .env.docker.example .env
nano .env     # set passwords/secrets; URLs (see below)
```

**No domain yet (test by IP):**
```
SITE_URL=http://<SERVER_IP>:3000
MEDUSA_BACKEND_URL=http://<SERVER_IP>:9000
STORE_CORS=http://<SERVER_IP>:3000
AUTH_CORS=http://<SERVER_IP>:3000,http://<SERVER_IP>:9000
```
Leave `MEDUSA_PUBLISHABLE_KEY` / `MEDUSA_ADMIN_API_KEY` blank for now.

---

## 2. First boot (db + Medusa)

```bash
docker compose up -d --build db medusa
docker compose logs -f medusa     # wait for "Server is ready"
```

Seed data + create keys/admin (fresh database). Run each:
```bash
# core data: sales channel, publishable key, EU region, demo data, stock, shipping
docker compose exec medusa sh -c "cd /app && npx medusa exec ./src/migration-scripts/initial-data-seed.ts"
# BDT region + rich demo products (colors, sizes, stock, offers)
docker compose exec medusa sh -c "cd /app && npx medusa exec ./src/scripts/seed-rich-catalog.ts"
# sample promo WELCOME10
docker compose exec medusa sh -c "cd /app && npx medusa exec ./src/scripts/seed-promotions.ts"
# storefront admin API key — copy the printed sk_… into .env (MEDUSA_ADMIN_API_KEY)
docker compose exec medusa sh -c "cd /app && npx medusa exec ./src/scripts/create-storefront-api-key.ts"
# Medusa admin login
docker compose exec medusa sh -c "cd /app && npx medusa user -e admin@yourbrand.com -p 'a-strong-password'"
# publishable key — copy the pk_… into .env (MEDUSA_PUBLISHABLE_KEY)
docker compose exec db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT token FROM api_key WHERE type='publishable';"
```

Put the `pk_…` and `sk_…` values into `.env`.

---

## 3. Start the storefront + set up the CMS

```bash
docker compose up -d --build web
# create the CMS schema content (home page, nav, popup)
docker compose exec web sh -c "cd /app && bun run --filter @ecom/cms db:push && bun run --filter @ecom/cms db:seed"
```

Open `http://<SERVER_IP>:3000` (storefront) and `http://<SERVER_IP>:9000/app`
(Medusa admin). In the storefront CMS admin (`/admin`) → **Visual Search → Reindex**.

---

## 4. Add a domain + HTTPS (optional, recommended)

1. Point DNS **A records** at the server:
   `yourdomain.com` → IP, `api.yourdomain.com` → IP.
2. In `.env`:
   ```
   DOMAIN=yourdomain.com
   API_DOMAIN=api.yourdomain.com
   SITE_URL=https://yourdomain.com
   MEDUSA_BACKEND_URL=https://api.yourdomain.com
   STORE_CORS=https://yourdomain.com
   ADMIN_CORS=https://api.yourdomain.com
   AUTH_CORS=https://yourdomain.com,https://api.yourdomain.com
   ```
3. Restart with the TLS proxy (Caddy auto-provisions Let's Encrypt certs):
   ```bash
   docker compose --profile tls up -d --build
   ```
4. (Optional) firewall off the raw `3000`/`9000` ports so traffic only goes via Caddy.

---

## 5. Day-2 operations

```bash
git pull && docker compose up -d --build       # deploy updates
docker compose logs -f web                      # logs
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql   # backup
docker compose down                             # stop (data persists in volumes)
```

---

## Notes & limits

- **Payments**: Cash on Delivery works today. Add Stripe for card payments later.
- **Image search** is local color similarity; CLIP (semantic) needs a model service.
- **One DB, two schemas**: Medusa uses `public`, the CMS uses `cms` (auto-created by
  `docker/init-cms.sql`).
- **Secrets**: generate fresh random values for all `*_SECRET`/passwords; never commit `.env`.
- If the **web** image errors on `sharp`/Prisma at build, or **Medusa** errors on
  `medusa build`/migrate, paste the log — usually a one-line Dockerfile tweak.
