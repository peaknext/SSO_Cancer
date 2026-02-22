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
npm run build         # Compile to dist/
npm run start:prod    # Run compiled
```

API base: `http://localhost:4000/api/v1`
Swagger docs: `http://localhost:4000/api/v1/docs`

### Next.js Frontend (`apps/web/`)

```bash
cd apps/web
npm run dev           # Dev server on port 3000
npm run build         # Production build (standalone output)
npm run start         # Start production server
npm run lint          # ESLint check
```

### Installing dependencies

```bash
npm install                         # All workspaces from root
npm install --workspace=apps/api    # API only
npm install --workspace=apps/web    # Web only
```

### Docker

```bash
docker-compose up -d                # Start PostgreSQL, API, and Web
docker-compose up -d postgres       # Start only PostgreSQL (for local dev)
```

`docker-compose.yml` defines 3 services: PostgreSQL 16 (port 5432), NestJS API (port 4000), Next.js Web (port 3000) — all with health checks. Multi-stage Dockerfiles in `apps/api/Dockerfile` and `apps/web/Dockerfile` (Node 20 Alpine).

### Environment Variables

Copy `.env.example` to `.env`. Key variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `API_PORT` (4000), `WEB_PORT` (3000).

### Testing

No test framework (Jest/Vitest) is configured yet. Neither `apps/api/` nor `apps/web/` have test files or test scripts.

## Architecture

### Monorepo Structure

```
apps/api/       NestJS 11 REST API (port 4000, prefix /api/v1)
apps/web/       Next.js 15 frontend (port 3000)
prisma/         Schema, config, migrations, generated client
database/seeds/ Numbered SQL files (001–016) executed by prisma/seed.ts
docs/           SPECIFICATION.md (full app spec, 113KB)
```

### Prisma 7 Configuration

- **Schema**: `prisma/schema.prisma` — generator `prisma-client` with `output = "./generated/prisma/client"`
- **Config**: `prisma/prisma.config.ts` — datasource URL, seed path, `earlyAccess: true`
- **Driver adapter**: `@prisma/adapter-pg` required. PrismaClient must be constructed with `{ adapter }`
- **PrismaService** at `apps/api/src/prisma/prisma.service.ts` wraps PrismaClient in a `@Global()` NestJS module
- **Barrel export** at `apps/api/src/prisma/index.ts` — services import `Prisma` namespace via `import { Prisma } from '../../prisma'`

### Data Model (20 tables)

**Core medical entities (6):** Drug, DrugTradeName, CancerSite, CancerStage, ProtocolName, Regimen

**Junction tables (4):** ProtocolRegimen, RegimenDrug, ProtocolStage, CancerSiteStage

**Protocol analysis (5):** Icd10CancerSiteMap, PatientImport, PatientVisit, VisitMedication, AiSuggestion

**Auth/system tables (5):** User, Session, PasswordHistory, AuditLog, AppSetting

### NestJS API Architecture

**14 feature modules** in `apps/api/src/modules/`:
- `health` — GET /health
- `auth` — login, refresh, logout, change-password, me (JWT + refresh cookie)
- `users` — full admin CRUD, sessions, password reset (ADMIN+)
- `cancer-sites`, `cancer-stages` — CRUD with search/pagination
- `protocols` — CRUD + link/unlink regimens and stages, deep nested view
- `regimens` — CRUD + add/update/remove drugs with dosing
- `drugs`, `drug-trade-names` — CRUD with category/price filters
- `dashboard` — aggregation stats with 5-min in-memory cache
- `audit-logs` — paginated query + CSV export (ADMIN+)
- `app-settings` — grouped key-value config (SUPER_ADMIN to edit)
- `protocol-analysis` — CSV/Excel import of hospital visit data, drug resolution (3-tier: exact→startsWith→contains), protocol matching with scoring, protocol confirmation (PATCH confirm/DELETE unconfirm per visit)
- `ai` — multi-provider AI suggestion engine (see AI Module below)

**Global guards** (registered via `APP_GUARD` in `app.module.ts`):
1. `JwtAuthGuard` — all endpoints require auth unless `@Public()` decorator
2. `RolesGuard` — checks `@Roles(UserRole.ADMIN, ...)` metadata
3. `ThrottlerGuard` — 60 requests/minute

**Common infrastructure** in `apps/api/src/common/`:
- `decorators/` — `@Public()`, `@Roles(...)`, `@CurrentUser()`
- `dto/` — PaginationQueryDto, PaginatedResponseDto with `createPaginatedResponse()` helper
- `enums/` — UserRole (SUPER_ADMIN, ADMIN, EDITOR, VIEWER), AuditAction
- `filters/` — HttpExceptionFilter with bilingual Thai/English error messages
- `interceptors/` — TransformInterceptor (wraps in `{ success, data }`), TimeoutInterceptor (30s)

### Next.js Frontend Architecture

**Route structure** (`apps/web/src/app/`):
- `(auth)/login/` — Login page with teal gradient split layout
- `(dashboard)/` — Protected routes with sidebar + topbar layout:
  - `/` — Dashboard with stat cards (animated counters) and 4 Recharts charts
  - `/protocols`, `/protocols/[id]`, `/protocols/new`, `/protocols/[id]/edit` — Protocol CRUD with filters, detail with expandable regimen cards
  - `/regimens`, `/regimens/[id]`, `/regimens/new`, `/regimens/[id]/edit` — Regimen CRUD with drug management (inline add/edit/remove)
  - `/drugs`, `/drugs/[id]`, `/drugs/new`, `/drugs/[id]/edit` — Drug CRUD with trade name management
  - `/cancer-sites` — Cancer sites list
  - `/protocol-analysis` — 3-column layout: HN list → VN list → visit detail with drug matching, protocol recommendations, confirmation (click card to confirm), and AI suggestion (violet-themed card with confidence score, reasoning, alternatives)
  - `/protocol-analysis/import` — CSV/Excel upload for hospital visit data
  - `/patients`, `/revenue` — Placeholder (Coming Soon)
  - `/settings/users`, `/settings/users/[id]` — User management (ADMIN+)
  - `/settings/app` — App settings with inline editing (SUPER_ADMIN to edit)
  - `/settings/ai` — AI provider configuration: enable/disable, select provider, API keys, model, temperature (SUPER_ADMIN to edit)
  - `/settings/audit-logs` — Audit log viewer with expandable diff (ADMIN+)
- Error boundaries at root and dashboard level, custom 404

**State management** (Zustand with `persist` middleware):
- `auth-store.ts` — user, accessToken, isAuthenticated. Login sets cookie `sso-cancer-auth-flag` for SSR middleware check
- `language-store.ts` — locale ('th' | 'en')

**Key patterns:**
- `useApi<T>(path)` / `usePaginatedApi<T>(basePath, params)` hooks in `hooks/use-api.ts`
- `usePersistedState<T>(key, default)` hook in `hooks/use-persisted-state.ts` — localStorage-backed state with SSR-safe hydration
- `apiClient` singleton in `lib/api-client.ts` — Bearer token injection, auto-refresh on 401, redirect to /login on session expiry
- `middleware.ts` — Route protection checking `sso-cancer-auth-flag` cookie, redirects to `/login?redirect=pathname`
- Shared components in `components/shared/` — DataTable, SearchInput, StatusBadge, CodeBadge, PriceBadge, EmptyState, LoadingSkeleton
- UI primitives in `components/ui/` — shadcn/ui pattern (Button, Card, Input, Label, Select, Badge, Separator)
- i18n: locale JSON files in `public/locales/th.json` and `en.json`

### Authentication

- Access token: JWT Bearer header, 15min TTL, secret `JWT_SECRET`
- Refresh token: httpOnly cookie `refreshToken`, 7-day TTL, secret `JWT_REFRESH_SECRET`
- Lockout: 5 failed attempts → 15min lock
- Password history: last 5 passwords checked on change
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

### Seed System

Seeds in `database/seeds/` as 16 numbered SQL files (001–016). The seeder (`prisma/seed.ts`) has a **hardcoded `seedFiles` array** — new seed files must be added to this array. Strips comments, splits by semicolons (quote-aware), executes via `$executeRawUnsafe`, and skips duplicates via `ON CONFLICT DO NOTHING`. Seed data: 23 cancer sites, 98 drugs, ~380 trade names (incl. hospital-specific Thai brands), 169 protocols, ~63 regimens, 10 AI settings.

### TypeScript Path Aliases

- **API** (`apps/api/tsconfig.json`): `@/*` → `src/*`
- **Web** (`apps/web/tsconfig.json`): `@/*` → `src/*`

### Code Formatting

- Prettier via `.prettierrc`: 2-space indent, single quotes, trailing commas, 80-char print width
- API ESLint: `.eslintrc.js` with TypeScript ESLint plugin
- Web ESLint: `.eslintrc.json` extending Next.js config

### Design System

- Primary: teal `#0F766E` (light) / `#2DD4BF` (dark)
- Background: stone-50 `#FAFAF9` (light) / `#0B1120` (dark)
- Fonts: DM Sans (headings), Bai Jamjuree (body/Thai), JetBrains Mono (codes/prices)
- Components: shadcn/ui pattern + Tailwind v4 with CSS custom properties
- CSS tokens defined in `apps/web/src/app/globals.css` via `:root` / `.dark` variables mapped to `@theme`

### API Response Envelope (Critical)

The `TransformInterceptor` wraps all API responses in `{ success: true, data: <payload> }`. The frontend `apiClient` (`lib/api-client.ts`) has an `unwrapEnvelope` function that **automatically strips** this wrapper:

- **Non-paginated endpoints** (detail, dashboard, auth): Envelope is stripped. `apiClient.get<T>()` returns `T` directly — do NOT use `{ data: T }` as the type parameter.
- **Paginated endpoints** (list pages): Response is `{ success, data: [...], meta: {...} }`. Because `meta` is present, `unwrapEnvelope` does NOT strip it. Use `usePaginatedApi<{ data: T[], meta: {...} }>()` and access `response.data` / `response.meta`.
- **POST/PATCH/DELETE**: Also stripped. `apiClient.post<T>()` returns `T` directly — use `result.id` not `result.data.id`.

**Pagination max limit**: API validates `limit` ≤ 100 via `@Max(100)` in `PaginationQueryDto`. Exceeding this returns 400 silently.

### Gotchas

- `nest-cli.json` entryFile is `apps/api/src/main` (not `main`) because Prisma import path goes outside `src/`, causing tsc to set rootDir to repo root
- `@nestjs/jwt` v11 uses jose's `StringValue` type — cast `expiresIn` with `as JwtSignOptions` to avoid TS errors
- `useSearchParams()` in Next.js must be wrapped in `<Suspense>` to avoid static generation errors
- Next.js `params` in dynamic routes is a `Promise` in v15 — use `const { id } = use(params)`
- Frontend `next.config.ts` rewrites `/api/*` to the backend, but `apiClient` uses `NEXT_PUBLIC_API_URL` directly
- Tailwind v4 uses `@import "tailwindcss"` and `@theme` directive instead of v3's `@tailwind` directives
- Next.js dev server frequently needs `.next` cache cleared after code changes (`rm -rf apps/web/.next`) — stale webpack modules cause `__webpack_modules__[moduleId] is not a function` or `Cannot find module` errors
- When restarting dev servers, always kill old processes first (`npx kill-port 3000 4000`) to avoid port conflicts
