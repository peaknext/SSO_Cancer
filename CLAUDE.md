# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SSO Cancer Care is a bilingual (Thai/English) web application for managing Thai Social Security Office (SSO) cancer treatment protocols. It is a **Next.js 15 + NestJS 11 monorepo** with **Prisma 7 ORM**, **PostgreSQL**, and **TypeScript**.

The data covers 23 cancer sites with treatment protocols, drug regimens, staging, and SSO drug pricing (~1,700 rows of seed data). Full spec: `docs/SPECIFICATION.md`.

## Commands

### Prisma (always require `--config`)

```bash
npx prisma generate --config prisma/prisma.config.ts
npx prisma migrate dev --config prisma/prisma.config.ts --name <name>
npx prisma db seed --config prisma/prisma.config.ts
npx prisma migrate reset --config prisma/prisma.config.ts
npx prisma studio --config prisma/prisma.config.ts
```

Root `package.json` scripts (`npm run db:generate`, `db:seed`, etc.) wrap these correctly.

### NestJS API (`apps/api/`)

```bash
cd apps/api
npm run start:dev     # Watch mode on port 4000
npm run start:debug   # Debug mode (attach Node inspector)
npm run build         # Compile to dist/
npm run start:prod    # Run compiled
```

API base: `http://localhost:4000/api/v1`
Swagger docs: `http://localhost:4000/api/v1/docs` (disabled in production)

### Next.js Frontend (`apps/web/`)

```bash
cd apps/web
npm run dev           # Dev server on port 3000
npm run build         # Production build (standalone output)
npm run start         # Start production server
npm run lint          # ESLint check
```

### Turborepo

`turbo.json` configures cached tasks. Run `turbo build`, `turbo dev`, `turbo lint` from root.

### Installing dependencies

```bash
npm install                         # All workspaces from root
npm install --workspace=apps/api    # API only
npm install --workspace=apps/web    # Web only
```

### Docker

Three compose files serve different purposes:

```bash
# Development — PostgreSQL only (for local dev with host-run apps)
docker-compose up -d postgres

# Full stack in Docker (uses .env.docker, NOT .env)
docker-compose up -d

# Local Docker testing with alternate ports (web:3500, api:3600, db:5433)
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env.docker up --build

# Production with nginx reverse proxy (ports 80/443, uses .env.production)
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

Production deploy script: `deploy/deploy.sh` — checks `.env.production`, generates self-signed SSL certs, runs migrations via Docker, starts services.

### Environment Variables

Copy `.env.example` to `.env`. Key variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `API_PORT` (4000), `WEB_PORT` (3000).

Additional production env vars (see `.env.production.example`): `MAX_FAILED_LOGIN_ATTEMPTS`, `LOCKOUT_DURATION_SECONDS`, `MAX_CONCURRENT_SESSIONS`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`, `PASSWORD_HISTORY_COUNT`, `LOG_LEVEL`.

### Testing

No test framework (Jest/Vitest) is configured yet.

## Architecture

### Monorepo Structure

```
apps/api/       NestJS 11 REST API (port 4000, prefix /api/v1)
apps/web/       Next.js 15 frontend (port 3000)
prisma/         Schema, config, migrations, generated client
database/seeds/ Numbered SQL files (001–015) executed by prisma/seed.ts
deploy/         Production deploy script + nginx config (SSL, reverse proxy)
docs/           SPECIFICATION.md (full app spec, 113KB)
```

Root `tsconfig.json` scope is limited to `prisma/**/*.ts` only — each workspace has its own tsconfig.

### Prisma 7 Configuration

- **Schema**: `prisma/schema.prisma` — generator `prisma-client` with `output = "./generated/prisma/client"`
- **Config**: `prisma/prisma.config.ts` — datasource URL, seed path, `earlyAccess: true`
- **Driver adapter**: `@prisma/adapter-pg` required. PrismaClient must be constructed with `{ adapter }`
- **PrismaService** at `apps/api/src/prisma/prisma.service.ts` wraps PrismaClient in a `@Global()` NestJS module
- **Barrel export** at `apps/api/src/prisma/index.ts` — services import `Prisma` namespace via `import { Prisma } from '../../prisma'`

### Data Model (25 tables)

**Core medical entities (6):** Drug, DrugTradeName, CancerSite, CancerStage, ProtocolName, Regimen

**Junction tables (4):** ProtocolRegimen, RegimenDrug, ProtocolStage, CancerSiteStage

**Protocol analysis (5):** Icd10CancerSiteMap, PatientImport, PatientVisit, VisitMedication, AiSuggestion

**Patient management (3):** Patient, PatientCase, VisitBillingClaim

**SSO formulary (2):** SsoAipnItem (national drug/equipment catalog with billing rates), SsoProtocolDrug (per-protocol approved drug formulary)

**Auth/system tables (5):** User, Session, PasswordHistory, AuditLog, AppSetting

### NestJS API Architecture

**17 feature modules** in `apps/api/src/modules/`:
- `health` — GET /health
- `auth` — login, refresh, logout, change-password, me (JWT + refresh cookie)
- `users` — full admin CRUD, sessions, password reset (ADMIN+)
- `cancer-sites`, `cancer-stages` — CRUD with search/pagination
- `protocols` — CRUD + link/unlink regimens and stages, deep nested view
- `regimens` — CRUD + add/update/remove drugs with dosing
- `drugs`, `drug-trade-names` — CRUD with category/price filters
- `dashboard` — aggregation stats with 5-min in-memory cache (8 cached endpoints, `getRecentActivity` uncached)
- `audit-logs` — paginated query + CSV export (ADMIN+)
- `app-settings` — grouped key-value config (SUPER_ADMIN to edit)
- `protocol-analysis` — CSV/Excel import of hospital visit data, drug resolution (3-tier: exact→startsWith→contains), protocol matching with scoring, protocol confirmation (PATCH confirm/DELETE unconfirm per visit)
- `ai` — multi-provider AI suggestion engine (see AI Module below)
- `cancer-patients` — Patient registration, case management (multi-case per patient), visit-to-case assignment, billing claims per visit (multiple rounds with status tracking)
- `sso-aipn-catalog` — Read-only SSO AIPN drug/equipment catalog with search, stats, code lookup
- `sso-protocol-drugs` — SSO protocol drug formulary: list, stats, per-protocol lookup, compliance checking. `getFormularyDrugNames()` extracts generic names from descriptions for name-based formulary matching

**Global guards** (registered via `APP_GUARD` in `app.module.ts`):
1. `JwtAuthGuard` — all endpoints require auth unless `@Public()` decorator
2. `RolesGuard` — checks `@Roles(UserRole.ADMIN, ...)` metadata
3. `ThrottlerGuard` — 60 requests/minute

**Global interceptors** (registered via `APP_INTERCEPTOR`):
1. `TransformInterceptor` — wraps responses in `{ success, data }`
2. `TimeoutInterceptor` — 30s timeout
3. `AuditLogInterceptor` — auto-logs all POST/PATCH/DELETE mutations to `AuditLog` table (strips sensitive fields: password, apiKey, secret, settingValue). Skips auth endpoints (handled by AuthService directly).

**ValidationPipe** in `main.ts`: `whitelist: true` + `forbidNonWhitelisted: true` (unknown properties throw 400), `transform: true` with `enableImplicitConversion: true` (query param string→number coercion).

**Common infrastructure** in `apps/api/src/common/`:
- `decorators/` — `@Public()`, `@Roles(...)`, `@CurrentUser()`
- `dto/` — PaginationQueryDto, PaginatedResponseDto with `createPaginatedResponse()` helper
- `enums/` — UserRole (SUPER_ADMIN, ADMIN, EDITOR, VIEWER), AuditAction
- `filters/` — HttpExceptionFilter with bilingual Thai/English error messages
- `interceptors/` — see above

**Other**: `ScheduleModule.forRoot()` is imported (cron jobs available but none defined yet).

### Next.js Frontend Architecture

**Route structure** (`apps/web/src/app/`):
- `(auth)/login/` — Login page with teal gradient split layout
- `(dashboard)/` — Protected routes with sidebar + topbar layout:
  - `/` — Dashboard with stat cards (animated counters) and 4 Recharts charts
  - `/protocols`, `/protocols/[id]`, `/protocols/new`, `/protocols/[id]/edit` — Protocol CRUD
  - `/regimens`, `/regimens/[id]`, `/regimens/new`, `/regimens/[id]/edit` — Regimen CRUD with drug management
  - `/drugs`, `/drugs/[id]`, `/drugs/new`, `/drugs/[id]/edit` — Drug CRUD with trade name management
  - `/cancer-sites` — Cancer sites list
  - `/protocol-analysis` — 3-column layout: HN list → VN list → visit detail with drug matching, protocol recommendations, confirmation, and AI suggestion
  - `/protocol-analysis/import` — CSV/Excel upload for hospital visit data
  - `/cancer-patients` — Patient list with search, cancer site filter, pagination
  - `/cancer-patients/new` — Patient registration form
  - `/cancer-patients/[id]` — Patient detail: case management (create/close/edit protocol), visit timeline (expand/collapse with persisted state), billing claims per visit (add/edit rounds with dates)
  - `/revenue` — Placeholder (Coming Soon)
  - `/settings/users`, `/settings/users/[id]` — User management (ADMIN+)
  - `/settings/app` — App settings with inline editing (SUPER_ADMIN to edit)
  - `/settings/ai` — AI provider configuration (SUPER_ADMIN to edit)
  - `/settings/audit-logs` — Audit log viewer with expandable diff (ADMIN+)
- Error boundaries at root and dashboard level, custom 404

**State management** (Zustand with `persist` middleware):
- `auth-store.ts` — user + isAuthenticated persisted; **accessToken is NOT persisted** (security). On page reload, `onRehydrateStorage` calls `/auth/refresh` to get a new token via httpOnly refresh cookie. Cookie `sso-cancer-auth-flag` set as `SameSite=Strict; Secure` with 7-day max-age.
- `language-store.ts` — locale ('th' | 'en')

**Key patterns:**
- `useApi<T>(path)` / `usePaginatedApi<T>(basePath, params)` hooks in `hooks/use-api.ts`
- `usePersistedState<T>(key, default)` hook in `hooks/use-persisted-state.ts` — localStorage-backed state with SSR-safe hydration
- `useTranslation()` hook in `hooks/use-translation.ts` — fetches `/locales/{locale}.json` at runtime, module-level cache, `t(key)` with dot notation
- `apiClient` singleton in `lib/api-client.ts` — Bearer token injection, auto-refresh on 401, redirect to /login on session expiry. Also has `upload<T>(path, formData)` for multipart uploads.
- `middleware.ts` — Route protection checking `sso-cancer-auth-flag` cookie, redirects to `/login?redirect=pathname`
- Shared components in `components/shared/` — DataTable, SearchInput, StatusBadge, CodeBadge, PriceBadge, EmptyState, LoadingSkeleton
- UI primitives in `components/ui/` — shadcn/ui pattern (Button, Card, Input, Label, Select, Badge, Separator)
- i18n: locale JSON files in `public/locales/th.json` and `en.json`

**Root layout** providers: `ThemeProvider` from `next-themes` (attribute="class", defaultTheme="light", enableSystem), `Toaster` from `sonner` (top-right, richColors).

**`next.config.ts`**: `output: 'standalone'`, `outputFileTracingRoot` set to monorepo root, `eslint.ignoreDuringBuilds: true`. Rewrites `/api/*` to backend using `API_INTERNAL_URL` env var (falls back to `http://localhost:4000`).

### Authentication

- Access token: JWT Bearer header, 15min TTL (configurable via `JWT_ACCESS_TTL`), secret `JWT_SECRET`
- Refresh token: httpOnly cookie `refreshToken`, 7-day TTL (configurable via `JWT_REFRESH_TTL`), secret `JWT_REFRESH_SECRET`
- Lockout: 5 failed attempts → 15min lock (configurable via env)
- Password history: last 5 passwords checked on change (configurable via `PASSWORD_HISTORY_COUNT`)
- Concurrent sessions: max 5 (configurable via `MAX_CONCURRENT_SESSIONS`), oldest deleted when exceeded
- On password change: ALL existing sessions revoked
- Timing-attack prevention: `bcrypt.compare` always runs (dummy hash for non-existent users)
- Default admin: `admin@sso-cancer.local` / `Admin@1234`
- Roles: SUPER_ADMIN > ADMIN > EDITOR > VIEWER

### Service Query Pattern

All list endpoints follow:
```typescript
async findAll(query: QueryDto) {
  const { page, limit, sortBy, sortOrder, search, ...filters } = query;
  const where: Prisma.ModelWhereInput = {};
  // Build WHERE from filters
  const [data, total] = await Promise.all([
    this.prisma.model.findMany({ where, orderBy, skip: (page-1)*limit, take: limit }),
    this.prisma.model.count({ where }),
  ]);
  return { data, total, page, limit };
}
```

Controllers return `createPaginatedResponse(data, total, page, limit)` → `{ success, data, meta: { total, page, limit, totalPages } }`.

### Key Schema Patterns

- All entities: `isActive` soft-delete, `createdAt`/`updatedAt` with `@db.Timestamptz(6)`
- `updatedAt` must have **both** `@default(now())` and `@updatedAt` (former required for raw SQL INSERTs)
- All foreign keys cascade delete (except AuditLog → User uses SetNull)
- Bilingual fields: `nameThai` + `nameEnglish` on CancerSite, CancerStage, ProtocolName
- Unique constraints on all code fields; composite uniques on junction tables

### Naming Conventions

- Prisma models: PascalCase (`DrugTradeName`)
- Prisma fields: camelCase (`cancerSiteId`)
- Database tables: snake_case via `@@map("drug_trade_names")`
- Database columns: snake_case via `@map("drug_id")`
- NestJS modules: kebab-case directories (`cancer-sites/`), PascalCase classes
- Frontend routes: kebab-case (`cancer-sites/`), components PascalCase

### AI Module Architecture

Multi-provider AI suggestion engine in `apps/api/src/modules/ai/`:

**Provider abstraction** (`providers/`):
- `ai-provider.interface.ts` — `AiProvider` interface with `complete()` and `validateApiKey()`
- `gemini.provider.ts` — Google Gemini REST API, uses `responseMimeType: 'application/json'` for structured output
- `claude.provider.ts` — Anthropic Claude API, uses **`tool_use` with forced tool choice** for guaranteed structured JSON output (schema-validated via `recommend_protocol` tool definition). 60s timeout for large RAG contexts. Validates keys with Haiku.
- `openai.provider.ts` — OpenAI API, uses `response_format: { type: 'json_object' }`
- `provider.factory.ts` — Maps provider name → instance, injectable factory

**Prompt builder** (`prompts/protocol-suggestion.prompt.ts`):
- System prompt: oncology clinical decision support, must recommend from DB protocols only, reasoning in Thai
- User prompt: cancer site, ICD-10, stage inference, medications, algorithmic top-5, structured RAG context
- **Privacy by design**: prompt builder never includes HN/VN — only clinical codes and drug generic names

**Service** (`ai.service.ts`):
- `getSuggestion(vn, userId)` — loads visit → runs matching → builds RAG context → calls AI → saves to `AiSuggestion` table. POST always calls AI fresh.
- `getCachedSuggestion(vn)` — returns latest SUCCESS from DB (GET retrieves from cache)
- `getSuggestionHistory(vn)` — all suggestions for a visit (ADMIN+)
- `buildProtocolContext(cancerSiteId)` — structured RAG: queries all protocols with regimens + drugs for the cancer site, serializes as compact text
- Settings loaded from `AppSetting` (group `ai`) with 60s in-memory cache

**Endpoints** (`ai.controller.ts`):
- `POST /ai/suggest/:vn` (EDITOR+) — call AI provider fresh
- `GET /ai/suggestions/:vn` (all auth) — cached suggestion from DB
- `GET /ai/suggestions/:vn/history` (ADMIN+) — full history
- `POST /ai/settings/validate-key` (SUPER_ADMIN) — validate API key

**AI settings** stored in `app_settings` table (group `ai`, 10 keys): `ai_enabled`, `ai_provider`, API keys + models for gemini/claude/openai, `ai_max_tokens`, `ai_temperature`.

### Protocol Matching Scoring

Scoring in `matching.service.ts`:
- Base: 20 per protocol
- Drug match: up to 40 (ratio × 40) + up to 10 drug count bonus
- Stage match: 25 (matched) / 0 (no match) / 10 (no stages defined)
- Modality: radiation signal gives +50 to radiation protocols, −40 to non-radiation
- Preference: +5 for `isPreferred` regimens
- Formulary compliance: up to 20 (ratio of resolved drugs found in SSO protocol formulary × 20). Uses **drug generic name matching** against names extracted from `SsoProtocolDrug.description` — NOT AIPN code comparison (hospital codes and SSO codes are different numbering systems)
- History bonus: +15 if this protocol was previously confirmed for another visit of the same patient
- Returns top 10 sorted by score descending
- NON-PROTOCOL sentinel (score 100) inserted when non-protocol chemotherapy drugs found

### Import Service Column Mappings

CSV/Excel import expects these column headers (Thai or English):
- Required: `hn`/`HN`, `vn`/`VN`, `vsdate`/`visitDate`/`visit_date`/`วันที่`, `วินิจฉัยหลัก` (primaryDiagnosis)
- Optional: `วินิจฉัยรอง` (secondaryDiagnoses), `HPI`/`hpi`, `หมายเหตุจากแพทย์` (doctorNotes), `รายการยาที่ได้รับ` (medicationsRaw)
- File size limit: 10 MB

### Seed System

Seeds in `database/seeds/` as 15 numbered SQL files (001–015). The seeder (`prisma/seed.ts`) has a **hardcoded `seedFiles` array** — new seed files must be added to this array. Strips comments, splits by semicolons (quote-aware), executes via `$executeRawUnsafe`, and skips duplicates via `ON CONFLICT DO NOTHING`. Seed data: 23 cancer sites, 98 drugs, ~380 trade names, 169 protocols, ~63 regimens, 10 AI settings, ~1,200 SSO AIPN items (014), ~1,700 SSO protocol drug formulary entries (015).

### TypeScript Path Aliases

- **API** (`apps/api/tsconfig.json`): `@/*` → `src/*`
- **Web** (`apps/web/tsconfig.json`): `@/*` → `src/*`

### Code Formatting

- Prettier via `.prettierrc`: 2-space indent, single quotes, trailing commas, **100-char print width**, `arrowParens: "always"`, `endOfLine: "lf"`
- API ESLint: `.eslintrc.js` with TypeScript ESLint plugin
- Web ESLint: `.eslintrc.json` extending Next.js config

### Design System

- Primary: teal `#0F766E` (light) / `#2DD4BF` (dark)
- Accent: orange `#ea580c` (light) / `#fb923c` (dark)
- Background: stone-50 `#FAFAF9` (light) / `#0B1120` (dark)
- Destructive: rose `#e11d48` / `#fb7185`, Warning: amber `#d97706` / `#fbbf24`, Success: emerald `#059669` / `#34d399`
- Fonts: DM Sans (`--font-dm-sans`, headings), Bai Jamjuree (`--font-bai-jamjuree`, body/Thai), JetBrains Mono (`--font-jetbrains-mono`, codes/prices) — loaded via `next/font/google` in `lib/fonts.ts`
- Components: shadcn/ui pattern + Tailwind v4 with CSS custom properties
- CSS tokens defined in `apps/web/src/app/globals.css` via `:root` / `.dark` variables mapped to `@theme`
- Dark mode: `@custom-variant dark (&:is(.dark *))` in Tailwind v4
- CSS animations: `shake` (form error), `progress` (loading bar)

### API Response Envelope (Critical)

The `TransformInterceptor` wraps all API responses in `{ success: true, data: <payload> }`. The frontend `apiClient` (`lib/api-client.ts`) has an `unwrapEnvelope` function that **automatically strips** this wrapper:

- **Non-paginated endpoints** (detail, dashboard, auth): Envelope is stripped. `apiClient.get<T>()` returns `T` directly — do NOT use `{ data: T }` as the type parameter.
- **Paginated endpoints** (list pages): Response is `{ success, data: [...], meta: {...} }`. Because `meta` is present, `unwrapEnvelope` does NOT strip it. Use `usePaginatedApi<{ data: T[], meta: {...} }>()` and access `response.data` / `response.meta`.
- **POST/PATCH/DELETE**: Also stripped. `apiClient.post<T>()` returns `T` directly — use `result.id` not `result.data.id`.

**Pagination max limit**: API validates `limit` ≤ 100 via `@Max(100)` in `PaginationQueryDto`. Exceeding this returns 400 silently.

### Gotchas

- `nest-cli.json` entryFile is `apps/api/src/main` (not `main`) because Prisma import path goes outside `src/`, causing tsc to set rootDir to repo root. Build uses `tsconfig.build.json` (excludes `**/*.spec.ts`).
- `@nestjs/jwt` v11 uses jose's `StringValue` type — cast `expiresIn` with `as JwtSignOptions` to avoid TS errors
- `useSearchParams()` in Next.js must be wrapped in `<Suspense>` to avoid static generation errors
- Next.js `params` in dynamic routes is a `Promise` in v15 — use `const { id } = use(params)`
- Frontend `next.config.ts` rewrites `/api/*` to the backend, but `apiClient` uses `NEXT_PUBLIC_API_URL` directly
- Tailwind v4 uses `@import "tailwindcss"` and `@theme` directive instead of v3's `@tailwind` directives
- Next.js dev server frequently needs `.next` cache cleared after code changes (`rm -rf apps/web/.next`) — stale webpack modules cause `__webpack_modules__[moduleId] is not a function` or `Cannot find module` errors
- When restarting dev servers, always kill old processes first (`npx kill-port 3000 4000`) to avoid port conflicts
- Docker builds for API require a complex Prisma client compilation step (TS→CJS, sed fixes for `import.meta.url`/extensions) — see `apps/api/Dockerfile`
- Docker `docker-compose.yml` uses `.env.docker` (NOT `.env`) — don't confuse them
- Web Dockerfile sets `NEXT_TELEMETRY_DISABLED=1` and `HOSTNAME="0.0.0.0"` (required for standalone in Docker)
- Nginx in production: `client_max_body_size 50M` for file uploads, TLS 1.2/1.3
