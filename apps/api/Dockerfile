# ─── Stage 1: Builder ──────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package files for dependency resolution
COPY package.json package-lock.json* ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY prisma/ prisma/

# Install all dependencies (root + workspaces, devDeps needed for build + Prisma)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --cache /root/.npm

# Generate Prisma client
RUN npx prisma generate --config prisma/prisma.config.ts

# Copy API source + seed data
COPY apps/api/ apps/api/
COPY database/ database/

# Build NestJS (TypeScript compilation)
RUN cd apps/api && npm run build

# ─── Post-build: Compile Prisma client for runtime ─────────────────────────
# The Prisma client is TypeScript files that need to be compiled for runtime use

# Create a tsconfig for the Prisma client compilation
RUN cat > prisma/generated/prisma/client/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": false,
    "skipLibCheck": true,
    "declaration": false,
    "outDir": "./compiled",
    "rootDir": "."
  },
  "include": ["./**/*.ts"],
  "exclude": ["node_modules", "compiled"]
}
EOF

# Compile Prisma client TypeScript to JavaScript
RUN cd prisma/generated/prisma/client && npx tsc --project tsconfig.json

# Copy compiled JS files back and apply fixes
RUN cd prisma/generated/prisma/client && \
    cp -r compiled/* . && \
    rm -rf compiled tsconfig.json

# Add package.json to ensure CommonJS mode
RUN echo '{"type":"commonjs"}' > prisma/generated/prisma/client/package.json

# Fix ESM/CJS issues in the compiled JavaScript files:
# 1. Replace import.meta.url with CommonJS equivalent
# 2. Fix globalThis.__dirname setup
# 3. Fix imports that use .ts extensions
RUN find prisma/generated/prisma/client -name "*.js" -exec \
    sed -i 's|import\.meta\.url|"file://" + __filename|g' {} +
RUN find prisma/generated/prisma/client -name "*.js" -exec \
    sed -i "s|globalThis\['__dirname'\] = .*fileURLToPath.*|globalThis['__dirname'] = __dirname;|g" {} +
RUN find prisma/generated/prisma/client -name "*.js" -exec \
    sed -i 's/\.ts"/.js"/g' {} +
RUN find prisma/generated/prisma/client -name "*.js" -exec \
    sed -i "s/\.ts'/.js'/g" {} +

# Remove TypeScript files (keep only compiled JS) AFTER NestJS build
RUN find prisma/generated/prisma/client -name "*.ts" -delete

# Pre-compile seed.ts → seed.js so deploy scripts can use `node` instead of `ts-node`
RUN npx tsc prisma/seed.ts \
    --outDir prisma/ \
    --target ES2020 \
    --module commonjs \
    --moduleResolution node \
    --esModuleInterop \
    --skipLibCheck \
    --resolveJsonModule

# ─── Stage 2: Prune devDependencies ───────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy workspace package files + lockfile
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/apps/api/package.json apps/api/
COPY --from=builder /app/apps/web/package.json apps/web/

# Install production dependencies only
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --cache /root/.npm

# ─── Stage 3: Runner ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy built artifacts
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=deps /app/node_modules ./node_modules
# Prisma generated client must be at ./dist/prisma/ to match compiled import paths
COPY --from=builder /app/prisma ./dist/prisma
# Prisma config + schema + migrations at /app/prisma/ for deploy-time commands:
#   npx prisma migrate deploy --config prisma/prisma.config.ts
#   node prisma/seed.js
COPY --from=builder /app/prisma/prisma.config.ts ./prisma/prisma.config.ts
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/migrations ./prisma/migrations
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js
COPY --from=builder /app/database/seeds ./database/seeds

# Symlink generated client so seed.js imports resolve correctly
RUN ln -s /app/dist/prisma/generated ./prisma/generated

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/apps/api/src/main"]
