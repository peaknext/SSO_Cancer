# ─── Stage 1: Builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package files for dependency resolution
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY prisma/ prisma/

# Install all dependencies (root + workspaces, devDeps needed for build + Prisma)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate --config prisma/prisma.config.ts

# Copy API source
COPY apps/api/ apps/api/

# Build NestJS
RUN cd apps/api && npm run build

# Fix Prisma client ESM/CJS conflict: tsc compiles Prisma's import.meta.url
# to invalid CJS. Replace the import.meta.url line with CJS __dirname.
RUN find apps/api/dist/prisma -name "*.js" -exec \
    sed -i "s|globalThis\['__dirname'\] = .*import\.meta\.url.*|globalThis['__dirname'] = __dirname;|g" {} +

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

CMD ["node", "dist/apps/api/src/main"]
