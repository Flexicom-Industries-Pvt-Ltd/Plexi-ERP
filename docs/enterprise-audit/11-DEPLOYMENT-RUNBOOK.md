# Plexi-ERP VPS Production Deployment Runbook

## Target Infrastructure: Hostinger KVM 4 (or Equivalent VPS)
- **Specs**: 4 vCPU, 16 GB RAM, 100 GB NVMe, Ubuntu 24.04 LTS.
- **Stack**: Docker, Docker Compose, Nginx / Coolify, Node.js 20+ runtime.

## 1. Multi-Stage Dockerfile
A production-ready Dockerfile is provided supporting standalone Next.js compilation:
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

## 2. Production Environment Variables Checklist
- `DATABASE_URL`: Production PostgreSQL connection string.
- `AUTH_SECRET`: High-entropy 64-character secret (`openssl rand -base64 48`).
- `CRON_SECRET`: Dedicated secret for scheduled jobs.
- `TIMEWATCH_API_KEY`: Factory biometric iDMS API key.
- `TIMEWATCH_WEBHOOK_SECRET`: Shared secret for inbound punch webhooks.
- `S3_ACCESS_KEY_ID` & `S3_SECRET_ACCESS_KEY`: AWS S3 credentials for evidence files.
- `NEXT_PUBLIC_APP_URL`: Production canonical domain URL.
