# Medusa backend. Build context = apps/medusa/apps/backend.
FROM node:20-bookworm-slim
WORKDIR /app

# deps
COPY package.json package-lock.json* ./
RUN npm install

# source + build (produces .medusa/server)
COPY . .
RUN npm run build

# install the built server's production deps
WORKDIR /app/.medusa/server
RUN npm install

EXPOSE 9000
# run migrations then start the server
CMD ["sh", "-c", "npx medusa db:migrate && npm run start"]
