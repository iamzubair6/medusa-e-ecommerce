# Storefront + CMS admin (Next.js). Build context = repo ROOT (needs packages/*).
# bun installs the workspace (workspace:* deps); Node runs the server (so sharp /
# image optimization load reliably).
FROM node:20-bookworm-slim

# install bun (for the workspace install)
RUN apt-get update && apt-get install -y curl unzip ca-certificates \
  && curl -fsSL https://bun.sh/install | bash \
  && ln -s /root/.bun/bin/bun /usr/local/bin/bun \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install deps (cached on lockfile/manifests)
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/cms/package.json packages/cms/package.json
COPY packages/config/package.json packages/config/package.json
RUN bun install --frozen-lockfile

# source + build
COPY . .
RUN bun run --filter @ecom/cms db:generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run --filter web build

WORKDIR /app/apps/web
EXPOSE 3000
# run Next under Node (not bun) for reliable native modules (sharp)
CMD ["node", "/app/node_modules/next/dist/bin/next", "start", "-p", "3000"]
