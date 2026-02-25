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
# Prisma generated client must be at ./dist/prisma/ to match compiled import paths
COPY --from=builder /app/prisma ./dist/prisma
# Seed support: create paths matching seed.ts expectations
# seed.ts uses path.join(__dirname, '..', 'database', 'seeds') → needs /app/database/seeds/
# seed.ts imports from './generated/...' → needs /app/prisma/generated/ → symlink to dist
COPY --from=builder /app/prisma/seed.ts ./prisma/seed.ts
COPY --from=builder /app/database/seeds ./database/seeds

# Symlink generated client so seed.ts imports resolve correctly
RUN ln -s /app/dist/prisma/generated ./prisma/generated

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/apps/api/src/main"]
