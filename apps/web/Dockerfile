# ─── Stage 1: Dependencies ─────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm ci --cache /root/.npm

# ─── Stage 2: Builder ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY apps/web/ apps/web/
COPY package.json ./

ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_API_URL: Used by browser (empty = relative paths /api/v1/...)
ARG NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# API_INTERNAL_URL: Used by server-side rewrites (Docker: http://api:4000)
ARG API_INTERNAL_URL="http://localhost:4000"
ENV API_INTERNAL_URL=${API_INTERNAL_URL}

RUN cd apps/web && npm run build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Set ownership
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
