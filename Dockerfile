# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY apps/telegram-bot/package.json ./apps/telegram-bot/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/templates/package.json ./packages/templates/package.json
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SITE_URL=https://nemesis-agent.xyz
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=720ee22098d1b9ac6fa8918c49f968fa

COPY --from=deps /app ./
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SITE_URL=https://nemesis-agent.xyz
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=720ee22098d1b9ac6fa8918c49f968fa

COPY --from=builder /app ./
EXPOSE 8080
CMD ["npm", "start"]
