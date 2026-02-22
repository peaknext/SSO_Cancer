# ─── Stage 1: Builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY prisma/ prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci --workspace=@sso-cancer/api

# Generate Prisma client
RUN npx prisma generate --config prisma/prisma.config.ts

# Copy API source
COPY apps/api/ apps/api/

# Build NestJS
RUN cd apps/api && npm run build

# ─── Stage 2: Runner ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/main"]
