# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci --no-audit --no-fund --loglevel=error --no-update-notifier

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Hỗ trợ nhận build args và truyền vào môi trường lúc build (tiền tố DPDNS_CLOUDFLARED_MANAGER_)
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID
ARG DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_BASE64
ARG DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT
ARG DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS
ARG DPDNS_CLOUDFLARED_MANAGER_LOG_LEVEL

ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_API_KEY
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_AUTH_DOMAIN
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_PROJECT_ID
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_DATABASE_URL
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_STORAGE_BUCKET
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_MESSAGING_SENDER_ID
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_APP_ID
ENV DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_BASE64=$DPDNS_CLOUDFLARED_MANAGER_FIREBASE_CONFIG_APP_BASE64
ENV DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT=$DPDNS_CLOUDFLARED_MANAGER_ENCRYPT_SALT
ENV DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS=$DPDNS_CLOUDFLARED_MANAGER_ALLOWED_EMAILS
ENV DPDNS_CLOUDFLARED_MANAGER_LOG_LEVEL=$DPDNS_CLOUDFLARED_MANAGER_LOG_LEVEL

RUN --mount=type=cache,target=/app/.next/cache \
  npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
# hostname must be set to 0.0.0.0 for docker mapping to work
ENV HOSTNAME="0.0.0.0"

# server.js is created by next build from the standalone output
CMD ["node", "server.js"]
