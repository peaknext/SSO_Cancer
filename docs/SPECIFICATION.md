# SSO Cancer Care — Web Application Specification

## ระบบจัดการโปรโตคอลการรักษาโรคมะเร็ง สำนักงานประกันสังคม

**Version:** 1.0.0
**Date:** 2026-02-22
**Status:** Draft Specification
**Classification:** Internal — Medical System

---

## Table of Contents

1. [Project Overview and Goals](#1-project-overview-and-goals)
2. [System Architecture](#2-system-architecture)
3. [User Roles and Permissions](#3-user-roles-and-permissions)
4. [Authentication and Authorization](#4-authentication-and-authorization)
5. [Database Schema Extensions](#5-database-schema-extensions)
6. [API Design](#6-api-design)
7. [Frontend Pages and Components](#7-frontend-pages-and-components)
8. [Feature Modules in Detail](#8-feature-modules-in-detail)
9. [UI/UX Design System](#9-uiux-design-system)
10. [Security](#10-security)
11. [Docker and Deployment](#11-docker-and-deployment)
12. [Error Handling and Logging](#12-error-handling-and-logging)
13. [Performance](#13-performance)
14. [Internationalization](#14-internationalization)
15. [Testing Strategy](#15-testing-strategy)
16. [Accessibility](#16-accessibility)
17. [Future Roadmap](#17-future-roadmap)
18. [Appendix A: Existing Data Summary](#appendix-a-existing-data-summary)
19. [Appendix B: Glossary](#appendix-b-glossary)

---

## 1. Project Overview and Goals

### 1.1 Purpose

SSO Cancer Care is a web application for managing Thai Social Security Office (SSO / สำนักงานประกันสังคม) cancer treatment protocols. It serves as a centralized reference system for oncologists, pharmacists, hospital administrators, and SSO officers to browse, manage, and audit the official treatment protocols covering 23 cancer anatomical sites, approximately 120 protocols, 45 chemotherapy regimens, 66 generic drugs, and 307 SSO-coded drug trade name formulations.

### 1.2 Core Objectives

1. **Protocol Reference System**: Provide an authoritative, auditable, bilingual (Thai primary / English secondary) repository of SSO-approved cancer treatment protocols, including the full hierarchy: Cancer Site → Protocols → Regimens → Drugs (with dosing, route, and schedule).
2. **Drug Price Management**: Maintain the SSO unit pricing catalog for all 307 drug formulations (drugCode, tradeName, dosageForm, strength, unit, unitPrice in THB) with audit trail for price changes.
3. **User Management**: Admin-controlled user accounts with role-based access (no self-registration) suitable for a hospital/government context.
4. **Audit Compliance**: Full audit logging of every data mutation for regulatory and compliance purposes.
5. **Future-Ready**: Architecture designed to accommodate patient data import and revenue collection modules in subsequent phases.

### 1.3 Existing Database

The PostgreSQL database (managed by Prisma 7 ORM with `@prisma/adapter-pg`) already contains 10 tables with seeded reference data:

| Table | Rows | Description |
|---|---|---|
| `cancer_sites` | 23 | Anatomical cancer locations (codes 01-21, 88, 99) |
| `cancer_stages` | 28 | Disease stages in 6 groups (solid_tumor, tnm, lung, prostate, hematologic, general) |
| `drugs` | 66 | Generic drug names with category (chemotherapy, hormonal, targeted_therapy, immunotherapy, supportive) |
| `drug_trade_names` | 307 | SSO drug codes, trade names, dosage forms, strength, unit pricing in THB |
| `protocol_names` | ~120 | Treatment protocols linked to cancer sites, with type and intent |
| `regimens` | 45 | Chemotherapy regimen codes (AC, FOLFOX, R-CHOP, etc.) with cycle info |
| `protocol_regimens` | ~70 | Protocol-to-regimen mappings with line-of-therapy and preferred flag |
| `regimen_drugs` | ~80 | Regimen-to-drug mappings with dose, route, day schedule |
| `protocol_stages` | ~100 | Protocol-to-stage applicability |
| `cancer_site_stages` | ~150 | Cancer-site-to-stage valid combinations |

All existing tables use: `id` (autoincrement PK), `isActive` (soft-delete Boolean), `createdAt`/`updatedAt` (timestamptz). Bilingual fields (`nameThai` + `nameEnglish`) exist on CancerSite, CancerStage, and ProtocolName. Database table and column names use snake_case via Prisma `@@map` and `@map`.

### 1.4 Constraints and Assumptions

- The application operates within a hospital intranet or secured VPN environment
- Users are medical professionals and administrators (not patients)
- Thai language is the primary interface language; English is secondary
- Data accuracy and auditability are paramount due to the medical context
- The existing 10-table schema is immutable; new tables are additive only
- PostgreSQL is hosted externally (not containerized); the application connects via `DATABASE_URL`

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Docker Host                           │
│                                                              │
│  ┌────────────────────┐     ┌────────────────────────────┐   │
│  │  Frontend Container│     │   Backend Container        │   │
│  │  (Next.js 15)      │────>│   (NestJS 11)              │   │
│  │  Port 3000         │     │   Port 4000                │   │
│  │                    │     │                            │   │
│  │  - App Router      │     │   - REST API               │   │
│  │  - RSC             │     │   - JWT Auth               │   │
│  │  - Turbopack       │     │   - Prisma 7 ORM           │   │
│  │  - shadcn/ui       │     │   - Audit Logger           │   │
│  │  - Tailwind v4     │     │   - Rate Limiting          │   │
│  └────────────────────┘     └──────────┬─────────────────┘   │
│                                        │                     │
└────────────────────────────────────────┼─────────────────────┘
                                         │
                              ┌──────────▼─────────────┐
                              │  External PostgreSQL   │
                              │  (SSO Infrastructure)  │
                              └────────────────────────┘
```

### 2.2 Monorepo Structure

```
sso-cancer-care/
├── apps/
│   ├── web/                          # Next.js 15 frontend
│   │   ├── src/
│   │   │   ├── app/                  # App Router pages
│   │   │   │   ├── (auth)/           # Auth-related routes (login)
│   │   │   │   │   └── login/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── (dashboard)/      # Authenticated layout group
│   │   │   │   │   ├── layout.tsx    # Sidebar + topbar layout
│   │   │   │   │   ├── page.tsx      # Dashboard home
│   │   │   │   │   ├── protocols/
│   │   │   │   │   │   ├── page.tsx           # Protocol listing
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   ├── page.tsx       # Protocol detail
│   │   │   │   │   │   │   └── edit/
│   │   │   │   │   │   │       └── page.tsx   # Edit protocol
│   │   │   │   │   │   └── new/
│   │   │   │   │   │       └── page.tsx       # Create protocol
│   │   │   │   │   ├── drugs/
│   │   │   │   │   │   ├── page.tsx           # Drug listing
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   ├── page.tsx       # Drug detail
│   │   │   │   │   │   │   └── edit/
│   │   │   │   │   │   │       └── page.tsx   # Edit drug
│   │   │   │   │   │   └── new/
│   │   │   │   │   │       └── page.tsx       # Create drug
│   │   │   │   │   ├── patients/
│   │   │   │   │   │   └── page.tsx           # Placeholder
│   │   │   │   │   ├── revenue/
│   │   │   │   │   │   └── page.tsx           # Placeholder
│   │   │   │   │   └── settings/
│   │   │   │   │       ├── page.tsx           # Settings overview
│   │   │   │   │       ├── users/
│   │   │   │   │       │   ├── page.tsx       # User management
│   │   │   │   │       │   └── [id]/
│   │   │   │   │       │       └── page.tsx   # User detail
│   │   │   │   │       ├── app/
│   │   │   │   │       │   └── page.tsx       # App settings
│   │   │   │   │       └── audit-logs/
│   │   │   │   │           └── page.tsx       # Audit log viewer
│   │   │   │   └── layout.tsx        # Root layout (theme provider)
│   │   │   ├── components/
│   │   │   │   ├── ui/               # shadcn/ui components
│   │   │   │   ├── layout/           # Shell, Sidebar, Topbar
│   │   │   │   ├── protocols/        # Protocol-specific components
│   │   │   │   ├── drugs/            # Drug-specific components
│   │   │   │   ├── dashboard/        # Dashboard widgets
│   │   │   │   ├── settings/         # Settings components
│   │   │   │   └── shared/           # Reusable (DataTable, SearchBar, etc.)
│   │   │   ├── hooks/                # Custom React hooks
│   │   │   ├── lib/                  # Utilities, API client, constants
│   │   │   ├── stores/               # Zustand state stores
│   │   │   ├── types/                # TypeScript interfaces
│   │   │   └── styles/               # Global CSS, Tailwind config
│   │   ├── public/
│   │   │   └── locales/              # i18n translation files (th.json, en.json)
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── Dockerfile
│   │
│   └── api/                          # NestJS 11 backend
│       ├── src/
│       │   ├── main.ts               # Bootstrap, CORS, Helmet, Swagger
│       │   ├── app.module.ts         # Root module
│       │   ├── common/               # Shared decorators, guards, pipes, filters
│       │   │   ├── decorators/
│       │   │   │   ├── roles.decorator.ts
│       │   │   │   ├── current-user.decorator.ts
│       │   │   │   └── api-paginated.decorator.ts
│       │   │   ├── guards/
│       │   │   │   ├── jwt-auth.guard.ts
│       │   │   │   ├── roles.guard.ts
│       │   │   │   └── throttle.guard.ts
│       │   │   ├── interceptors/
│       │   │   │   ├── audit-log.interceptor.ts
│       │   │   │   ├── transform.interceptor.ts
│       │   │   │   └── timeout.interceptor.ts
│       │   │   ├── filters/
│       │   │   │   └── http-exception.filter.ts
│       │   │   ├── pipes/
│       │   │   │   └── validation.pipe.ts
│       │   │   └── dto/
│       │   │       └── pagination.dto.ts
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.module.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   ├── auth.service.ts
│       │   │   │   ├── strategies/
│       │   │   │   │   ├── jwt.strategy.ts
│       │   │   │   │   └── jwt-refresh.strategy.ts
│       │   │   │   └── dto/
│       │   │   │       ├── login.dto.ts
│       │   │   │       └── refresh-token.dto.ts
│       │   │   ├── users/
│       │   │   │   ├── users.module.ts
│       │   │   │   ├── users.controller.ts
│       │   │   │   ├── users.service.ts
│       │   │   │   └── dto/
│       │   │   ├── cancer-sites/
│       │   │   │   ├── cancer-sites.module.ts
│       │   │   │   ├── cancer-sites.controller.ts
│       │   │   │   ├── cancer-sites.service.ts
│       │   │   │   └── dto/
│       │   │   ├── cancer-stages/
│       │   │   │   ├── cancer-stages.module.ts
│       │   │   │   ├── cancer-stages.controller.ts
│       │   │   │   └── cancer-stages.service.ts
│       │   │   ├── protocols/
│       │   │   │   ├── protocols.module.ts
│       │   │   │   ├── protocols.controller.ts
│       │   │   │   ├── protocols.service.ts
│       │   │   │   └── dto/
│       │   │   ├── regimens/
│       │   │   │   ├── regimens.module.ts
│       │   │   │   ├── regimens.controller.ts
│       │   │   │   ├── regimens.service.ts
│       │   │   │   └── dto/
│       │   │   ├── drugs/
│       │   │   │   ├── drugs.module.ts
│       │   │   │   ├── drugs.controller.ts
│       │   │   │   ├── drugs.service.ts
│       │   │   │   └── dto/
│       │   │   ├── drug-trade-names/
│       │   │   │   ├── drug-trade-names.module.ts
│       │   │   │   ├── drug-trade-names.controller.ts
│       │   │   │   ├── drug-trade-names.service.ts
│       │   │   │   └── dto/
│       │   │   ├── audit-logs/
│       │   │   │   ├── audit-logs.module.ts
│       │   │   │   ├── audit-logs.controller.ts
│       │   │   │   └── audit-logs.service.ts
│       │   │   ├── dashboard/
│       │   │   │   ├── dashboard.module.ts
│       │   │   │   ├── dashboard.controller.ts
│       │   │   │   └── dashboard.service.ts
│       │   │   └── app-settings/
│       │   │       ├── app-settings.module.ts
│       │   │       ├── app-settings.controller.ts
│       │   │       └── app-settings.service.ts
│       │   └── prisma/
│       │       ├── prisma.module.ts
│       │       └── prisma.service.ts
│       ├── test/
│       ├── tsconfig.json
│       ├── nest-cli.json
│       └── Dockerfile
│
├── prisma/                           # Existing Prisma schema + migrations
│   ├── schema.prisma                 # Extended with new models (User, Session, etc.)
│   ├── prisma.config.ts
│   ├── seed.ts
│   └── generated/
├── database/
│   └── seeds/                        # Existing SQL seed files (001-010) + new (011-012)
├── docker-compose.yml
├── docker-compose.dev.yml
├── .env.example
├── package.json                      # Workspace root
└── docs/
    └── SPECIFICATION.md              # This document
```

### 2.3 Communication Pattern

- **Frontend-to-Backend**: REST API calls over HTTP/HTTPS. The Next.js frontend makes API calls to the NestJS backend using a centralized API client (fetch-based wrapper with interceptors for JWT token injection and refresh logic).
- **Server-Side Rendering**: Next.js RSC (React Server Components) can call the NestJS API from the server side during page render. The main benefit is reduced client-side JavaScript and faster initial page loads.
- **API Base URL**: Configurable via environment variable `NEXT_PUBLIC_API_URL` (defaults to `http://api:4000` in Docker, `http://localhost:4000` in development).

### 2.4 Prisma 7 Integration in NestJS

The NestJS backend uses the existing Prisma 7 schema. The `PrismaService` in NestJS wraps `PrismaClient` with the required `@prisma/adapter-pg` driver adapter:

```typescript
// Conceptual PrismaService structure
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }
  async onModuleInit() {
    await this.$connect();
  }
}
```

The Prisma schema is extended (not modified) to add new tables for users, audit_logs, sessions, and app_settings.

---

## 3. User Roles and Permissions

### 3.1 Role Definitions

| Role | Thai Label | Description | Typical User |
|---|---|---|---|
| `SUPER_ADMIN` | ผู้ดูแลระบบสูงสุด | Full system access. Can manage all users, modify app settings, access audit logs, and perform all data operations. | IT Administrator |
| `ADMIN` | ผู้ดูแลระบบ | Can manage users (except SUPER_ADMIN), manage all clinical data (protocols, drugs, regimens), and view audit logs. | Department Head, Senior Pharmacist |
| `EDITOR` | ผู้แก้ไขข้อมูล | Can create and edit clinical data (protocols, drugs, regimens, stages) but cannot manage users or app settings. | Pharmacist, Oncology Coordinator |
| `VIEWER` | ผู้ดูข้อมูล | Read-only access to all clinical data. Cannot create, edit, or delete anything. | Oncologist, Nurse, SSO Officer |

### 3.2 Permission Matrix

| Resource / Action | SUPER_ADMIN | ADMIN | EDITOR | VIEWER |
|---|---|---|---|---|
| **Dashboard** | | | | |
| View dashboard stats | Yes | Yes | Yes | Yes |
| **Protocols** | | | | |
| Browse / search protocols | Yes | Yes | Yes | Yes |
| View protocol detail | Yes | Yes | Yes | Yes |
| Create protocol | Yes | Yes | Yes | No |
| Edit protocol | Yes | Yes | Yes | No |
| Soft-delete protocol | Yes | Yes | No | No |
| **Drugs** | | | | |
| Browse / search drugs | Yes | Yes | Yes | Yes |
| View drug detail + trade names | Yes | Yes | Yes | Yes |
| Create drug | Yes | Yes | Yes | No |
| Edit drug | Yes | Yes | Yes | No |
| Edit drug trade name pricing | Yes | Yes | Yes | No |
| Soft-delete drug | Yes | Yes | No | No |
| **Regimens** | | | | |
| Browse regimens | Yes | Yes | Yes | Yes |
| Create / edit regimen | Yes | Yes | Yes | No |
| **Cancer Sites / Stages** | | | | |
| Browse | Yes | Yes | Yes | Yes |
| Create / edit | Yes | Yes | Yes | No |
| **Users** | | | | |
| View user list | Yes | Yes | No | No |
| Create user account | Yes | Yes | No | No |
| Edit user (change role) | Yes | Yes* | No | No |
| Deactivate user | Yes | Yes* | No | No |
| Reset user password | Yes | Yes* | No | No |
| **Audit Logs** | | | | |
| View audit logs | Yes | Yes | No | No |
| Export audit logs | Yes | No | No | No |
| **App Settings** | | | | |
| View settings | Yes | Yes | No | No |
| Modify settings | Yes | No | No | No |

*\* ADMIN cannot modify or deactivate SUPER_ADMIN users.*

### 3.3 Account Management Rules

- **No self-registration**: All accounts are created by ADMIN or SUPER_ADMIN users.
- **Initial setup**: The first SUPER_ADMIN account is created via a seed script or CLI command.
- **Hierarchy protection**: SUPER_ADMIN accounts cannot be deactivated by ADMIN users (only by another SUPER_ADMIN).
- **Password changes**: Self-service changes require the current password. Admin-initiated resets generate a temporary password.
- **Soft deactivation**: Deactivated accounts (`isActive = false`) cannot log in but their data persists for audit trail purposes.

---

## 4. Authentication and Authorization

### 4.1 Authentication Flow (JWT)

```
┌─────────┐    POST /auth/login        ┌─────────────┐
│ Browser  │──── { email, password } ──>│  NestJS API  │
│          │                            │              │
│          │<── { accessToken,          │  Validates   │
│          │     refreshToken,          │  bcrypt hash │
│          │     user }                 │              │
└─────────┘                            └─────────────┘
     │
     │  Store accessToken in memory (React state / Zustand)
     │  Store refreshToken in httpOnly secure cookie
     │
     │  Subsequent API calls:
     │  Authorization: Bearer <accessToken>
     │
     │  On 401 (expired access token):
     │  POST /auth/refresh  { cookie: refreshToken }
     │  → New { accessToken, refreshToken }
```

### 4.2 Token Configuration

| Token | Lifetime | Storage | Purpose |
|---|---|---|---|
| Access Token | 15 minutes | In-memory (Zustand store) | API authentication |
| Refresh Token | 7 days | httpOnly secure cookie (`SameSite=Strict`) | Renew access token |

### 4.3 JWT Payload Structure

```typescript
interface JwtPayload {
  sub: number;          // User ID
  email: string;
  role: UserRole;       // SUPER_ADMIN | ADMIN | EDITOR | VIEWER
  fullName: string;
  iat: number;          // Issued at
  exp: number;          // Expiration
}
```

### 4.4 Session Management

- Refresh tokens are stored in the database (`sessions` table) to enable server-side revocation.
- Each refresh token has a unique `tokenId` (UUID) stored alongside `userId`, `expiresAt`, `ipAddress`, and `userAgent`.
- On logout, the session is deleted from the database (invalidating the refresh token).
- An admin can view active sessions and forcibly revoke any user's sessions.
- Maximum concurrent sessions per user: configurable (default: 5). Oldest session is revoked when limit is exceeded.

### 4.5 Password Policy

- Minimum 8 characters
- Must contain at least one uppercase letter, one lowercase letter, and one digit
- bcrypt hashing with salt rounds = 12
- Password history: last 5 passwords stored (hashed) to prevent reuse
- Account lockout: 5 failed login attempts triggers a 15-minute lockout
- Lockout tracked per-user (`failedLoginAttempts`, `lockedUntil`)

### 4.6 NestJS Guard Pipeline

```
Request
  │
  ├── JwtAuthGuard (validates access token, attaches user to request)
  │
  ├── RolesGuard (checks @Roles() decorator against user.role)
  │
  └── ThrottleGuard (rate limiting per IP / per user)
```

---

## 5. Database Schema Extensions

The following new tables are added to the existing Prisma schema. They follow the same conventions: snake_case mapping, `isActive`, `createdAt`/`updatedAt` with `@db.Timestamptz(6)`.

### 5.1 Users Table

```prisma
model User {
  id                  Int       @id @default(autoincrement())
  email               String    @unique @db.VarChar(255)
  passwordHash        String    @map("password_hash") @db.VarChar(255)
  fullName            String    @map("full_name") @db.VarChar(200)
  fullNameThai        String?   @map("full_name_thai") @db.VarChar(200)
  role                String    @default("VIEWER") @db.VarChar(20)
  department          String?   @db.VarChar(200)
  position            String?   @db.VarChar(200)
  phoneNumber         String?   @map("phone_number") @db.VarChar(20)
  avatarUrl           String?   @map("avatar_url") @db.VarChar(500)
  failedLoginAttempts Int       @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime? @map("locked_until") @db.Timestamptz(6)
  lastLoginAt         DateTime? @map("last_login_at") @db.Timestamptz(6)
  lastLoginIp         String?   @map("last_login_ip") @db.VarChar(45)
  isActive            Boolean   @default(true) @map("is_active")
  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt           DateTime  @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  sessions         Session[]
  passwordHistory  PasswordHistory[]
  auditLogs        AuditLog[]

  @@index([role], map: "idx_users_role")
  @@map("users")
}
```

### 5.2 Sessions Table

```prisma
model Session {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  tokenId      String   @unique @map("token_id") @db.VarChar(36)
  ipAddress    String?  @map("ip_address") @db.VarChar(45)
  userAgent    String?  @map("user_agent") @db.Text
  expiresAt    DateTime @map("expires_at") @db.Timestamptz(6)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_sessions_user_id")
  @@index([expiresAt], map: "idx_sessions_expires_at")
  @@map("sessions")
}
```

### 5.3 Password History Table

```prisma
model PasswordHistory {
  id           Int      @id @default(autoincrement())
  userId       Int      @map("user_id")
  passwordHash String   @map("password_hash") @db.VarChar(255)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId], map: "idx_password_history_user_id")
  @@map("password_history")
}
```

### 5.4 Audit Logs Table

```prisma
model AuditLog {
  id          Int      @id @default(autoincrement())
  userId      Int?     @map("user_id")
  action      String   @db.VarChar(50)
  entityType  String   @map("entity_type") @db.VarChar(50)
  entityId    Int?     @map("entity_id")
  oldValues   String?  @map("old_values") @db.Text
  newValues   String?  @map("new_values") @db.Text
  ipAddress   String?  @map("ip_address") @db.VarChar(45)
  userAgent   String?  @map("user_agent") @db.Text
  metadata    String?  @db.Text
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz(6)

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId], map: "idx_audit_logs_user_id")
  @@index([entityType, entityId], map: "idx_audit_logs_entity")
  @@index([action], map: "idx_audit_logs_action")
  @@index([createdAt], map: "idx_audit_logs_created_at")
  @@map("audit_logs")
}
```

**Audit Action Types**: `CREATE`, `UPDATE`, `DELETE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `PASSWORD_CHANGE`

**Entity Types**: `Drug`, `DrugTradeName`, `Protocol`, `Regimen`, `RegimenDrug`, `CancerSite`, `CancerStage`, `User`, `Session`, `AppSetting`

### 5.5 App Settings Table

```prisma
model AppSetting {
  id           Int      @id @default(autoincrement())
  settingKey   String   @unique @map("setting_key") @db.VarChar(100)
  settingValue String   @map("setting_value") @db.Text
  description  String?  @db.VarChar(500)
  settingGroup String?  @map("setting_group") @db.VarChar(50)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@index([settingGroup], map: "idx_app_settings_group")
  @@map("app_settings")
}
```

### 5.6 Default App Settings (Seed Data)

| settingKey | settingValue | settingGroup | description |
|---|---|---|---|
| `session_max_concurrent` | `5` | auth | Maximum concurrent sessions per user |
| `session_access_token_ttl` | `900` | auth | Access token TTL in seconds (15 min) |
| `session_refresh_token_ttl` | `604800` | auth | Refresh token TTL in seconds (7 days) |
| `password_min_length` | `8` | auth | Minimum password length |
| `password_history_count` | `5` | auth | Number of previous passwords to check |
| `login_max_attempts` | `5` | auth | Max failed login attempts before lockout |
| `login_lockout_duration` | `900` | auth | Account lockout duration in seconds (15 min) |
| `app_name` | `SSO Cancer Care` | display | Application display name |
| `app_name_thai` | `ระบบจัดการโปรโตคอลรักษามะเร็ง สปส.` | display | Thai application name |
| `items_per_page` | `25` | display | Default pagination size |
| `default_language` | `th` | display | Default UI language |

---

## 6. API Design

All endpoints are prefixed with `/api/v1`. Standard response envelope:

```typescript
// Success
{
  "success": true,
  "data": { ... } | [ ... ],
  "meta": {                    // For paginated responses
    "total": 120,
    "page": 1,
    "limit": 25,
    "totalPages": 5
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "statusCode": 400,
    "timestamp": "2026-02-22T10:30:00.000Z",
    "path": "/api/v1/protocols",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

### 6.1 Authentication Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/login` | No | — | Login with email/password. Returns access + refresh tokens. |
| POST | `/auth/refresh` | Cookie | — | Refresh access token using httpOnly refresh cookie. |
| POST | `/auth/logout` | Yes | All | Invalidate current session. |
| POST | `/auth/change-password` | Yes | All | Change own password (`currentPassword` + `newPassword`). |
| GET | `/auth/me` | Yes | All | Get current user profile. |

### 6.2 Users Endpoints (Admin Only)

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/users` | Yes | SUPER_ADMIN, ADMIN | List users (pagination, search, filter by role/status). |
| GET | `/users/:id` | Yes | SUPER_ADMIN, ADMIN | Get user detail. |
| POST | `/users` | Yes | SUPER_ADMIN, ADMIN | Create new user account. |
| PATCH | `/users/:id` | Yes | SUPER_ADMIN, ADMIN | Update user (role, department, etc.). |
| PATCH | `/users/:id/deactivate` | Yes | SUPER_ADMIN, ADMIN | Soft-deactivate user. |
| PATCH | `/users/:id/activate` | Yes | SUPER_ADMIN, ADMIN | Reactivate user. |
| POST | `/users/:id/reset-password` | Yes | SUPER_ADMIN, ADMIN | Admin-initiated password reset. |
| GET | `/users/:id/sessions` | Yes | SUPER_ADMIN, ADMIN | List active sessions for a user. |
| DELETE | `/users/:id/sessions/:sessionId` | Yes | SUPER_ADMIN, ADMIN | Revoke a specific session. |

### 6.3 Cancer Sites Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/cancer-sites` | Yes | All | List all cancer sites (sorted by `sortOrder`). `?search=`, `?isActive=`. |
| GET | `/cancer-sites/:id` | Yes | All | Site detail with stages and protocol count. |
| GET | `/cancer-sites/:id/protocols` | Yes | All | List all protocols for a cancer site. |
| GET | `/cancer-sites/:id/stages` | Yes | All | List valid stages for a cancer site. |
| POST | `/cancer-sites` | Yes | EDITOR+ | Create new cancer site. |
| PATCH | `/cancer-sites/:id` | Yes | EDITOR+ | Update cancer site. |

### 6.4 Cancer Stages Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/cancer-stages` | Yes | All | List all stages. `?stageGroup=`, `?search=`. |
| GET | `/cancer-stages/:id` | Yes | All | Stage detail. |
| POST | `/cancer-stages` | Yes | EDITOR+ | Create new stage. |
| PATCH | `/cancer-stages/:id` | Yes | EDITOR+ | Update stage. |

### 6.5 Protocols Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/protocols` | Yes | All | List with pagination. `?cancerSiteId=`, `?protocolType=`, `?treatmentIntent=`, `?search=`, `?page=`, `?limit=`. |
| GET | `/protocols/:id` | Yes | All | **Full deep view**: protocol + cancer site + stages + regimens (with drugs and dosing). |
| POST | `/protocols` | Yes | EDITOR+ | Create protocol with associations (stages, regimens). |
| PATCH | `/protocols/:id` | Yes | EDITOR+ | Update protocol metadata. |
| PATCH | `/protocols/:id/deactivate` | Yes | ADMIN+ | Soft-delete protocol. |
| POST | `/protocols/:id/regimens` | Yes | EDITOR+ | Link a regimen (with lineOfTherapy, isPreferred). |
| DELETE | `/protocols/:id/regimens/:regimenId` | Yes | EDITOR+ | Unlink a regimen from a protocol. |
| POST | `/protocols/:id/stages` | Yes | EDITOR+ | Link a stage to a protocol. |
| DELETE | `/protocols/:id/stages/:stageId` | Yes | EDITOR+ | Unlink a stage from a protocol. |

### 6.6 Regimens Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/regimens` | Yes | All | List regimens. `?regimenType=`, `?search=`. |
| GET | `/regimens/:id` | Yes | All | Regimen detail with all drugs and linked protocols. |
| POST | `/regimens` | Yes | EDITOR+ | Create regimen. |
| PATCH | `/regimens/:id` | Yes | EDITOR+ | Update regimen. |
| POST | `/regimens/:id/drugs` | Yes | EDITOR+ | Add a drug to regimen (dose, route, daySchedule). |
| PATCH | `/regimens/:id/drugs/:drugId` | Yes | EDITOR+ | Update drug dosing in regimen. |
| DELETE | `/regimens/:id/drugs/:drugId` | Yes | EDITOR+ | Remove a drug from regimen. |

### 6.7 Drugs Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/drugs` | Yes | All | List generic drugs. `?drugCategory=`, `?search=`, `?page=`, `?limit=`. |
| GET | `/drugs/:id` | Yes | All | Drug detail with all trade names (pricing) and regimens using this drug. |
| POST | `/drugs` | Yes | EDITOR+ | Create generic drug. |
| PATCH | `/drugs/:id` | Yes | EDITOR+ | Update generic drug. |

### 6.8 Drug Trade Names Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/drug-trade-names` | Yes | All | List all trade names (pagination). `?drugId=`, `?search=`, `?hasPrice=`. |
| GET | `/drug-trade-names/:id` | Yes | All | Trade name detail. |
| POST | `/drug-trade-names` | Yes | EDITOR+ | Create new trade name formulation. |
| PATCH | `/drug-trade-names/:id` | Yes | EDITOR+ | Update trade name (price changes trigger audit log). |
| PATCH | `/drug-trade-names/:id/deactivate` | Yes | ADMIN+ | Soft-delete trade name. |

### 6.9 Dashboard Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/dashboard/overview` | Yes | All | Summary statistics (entity counts). |
| GET | `/dashboard/protocols-by-site` | Yes | All | Protocol count grouped by cancer site. |
| GET | `/dashboard/protocols-by-type` | Yes | All | Protocol count grouped by type. |
| GET | `/dashboard/drugs-by-category` | Yes | All | Drug count grouped by category. |
| GET | `/dashboard/price-coverage` | Yes | All | Trade names with/without pricing. |
| GET | `/dashboard/recent-activity` | Yes | ADMIN+ | Recent audit log entries. |

### 6.10 Audit Logs Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/audit-logs` | Yes | ADMIN+ | List with pagination. `?userId=`, `?action=`, `?entityType=`, `?dateFrom=`, `?dateTo=`. |
| GET | `/audit-logs/:id` | Yes | ADMIN+ | Single log detail (old/new values). |
| GET | `/audit-logs/export` | Yes | SUPER_ADMIN | Export as CSV within date range. |

### 6.11 App Settings Endpoints

| Method | Endpoint | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/app-settings` | Yes | ADMIN+ | List all settings grouped by `settingGroup`. |
| PATCH | `/app-settings/:key` | Yes | SUPER_ADMIN | Update a setting value. |

### 6.12 Health Check Endpoint

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Returns `{ status, timestamp, database, uptime }`. |

---

## 7. Frontend Pages and Components

### 7.1 Navigation Structure

```
┌─────────────────────────────────┐
│  SSO Cancer Care                │
│  สปส. ระบบมะเร็ง                │
│                                 │
│  ┌─ ● แดชบอร์ด (Dashboard)      │
│  │                              │
│  ├─ ● โปรโตคอล (Protocols)      │
│  │                              │
│  ├─ ● รายการยา (Drugs)          │
│  │                              │
│  ├─ ○ ผู้ป่วย (Patients)        │  ← "เร็วๆ นี้"
│  │                              │
│  ├─ ○ จัดเก็บรายได้ (Revenue)   │  ← "เร็วๆ นี้"
│  │                              │
│  └─ ● ตั้งค่า (Settings)        │  ← Admin only
│      ├─ จัดการผู้ใช้             │
│      ├─ ตั้งค่าแอป              │
│      └─ บันทึกการใช้งาน          │
│                                 │
│  ──────────────────────         │
│  [Avatar] [User name]           │
│  [Role badge] [Logout]          │
└─────────────────────────────────┘
```

### 7.2 Page Inventory

| Route | Page | Auth | Min Role | Description |
|---|---|---|---|---|
| `/login` | LoginPage | No | — | Login form |
| `/` | DashboardPage | Yes | VIEWER | Dashboard with statistics |
| `/protocols` | ProtocolListPage | Yes | VIEWER | Protocol listing with filters |
| `/protocols/:id` | ProtocolDetailPage | Yes | VIEWER | Full protocol hierarchy view |
| `/protocols/new` | ProtocolCreatePage | Yes | EDITOR | Create new protocol |
| `/protocols/:id/edit` | ProtocolEditPage | Yes | EDITOR | Edit protocol |
| `/drugs` | DrugListPage | Yes | VIEWER | Drug listing with search |
| `/drugs/:id` | DrugDetailPage | Yes | VIEWER | Drug detail + trade names |
| `/drugs/new` | DrugCreatePage | Yes | EDITOR | Create new drug |
| `/drugs/:id/edit` | DrugEditPage | Yes | EDITOR | Edit drug + trade names |
| `/patients` | PatientsPlaceholder | Yes | VIEWER | "Coming Soon" |
| `/revenue` | RevenuePlaceholder | Yes | VIEWER | "Coming Soon" |
| `/settings` | SettingsPage | Yes | ADMIN | Settings overview |
| `/settings/users` | UserManagementPage | Yes | ADMIN | User CRUD |
| `/settings/users/:id` | UserDetailPage | Yes | ADMIN | User detail + sessions |
| `/settings/app` | AppSettingsPage | Yes | SUPER_ADMIN | App configuration |
| `/settings/audit-logs` | AuditLogPage | Yes | ADMIN | Audit log viewer |

### 7.3 Shared Components

| Component | Location | Description |
|---|---|---|
| `AppShell` | `layout/` | Main application shell with sidebar + topbar |
| `Sidebar` | `layout/` | Collapsible sidebar navigation |
| `Topbar` | `layout/` | Top bar with breadcrumbs, theme toggle, user menu |
| `ThemeToggle` | `layout/` | Light / Dark / System mode switch |
| `Breadcrumbs` | `shared/` | Dynamic breadcrumb navigation |
| `DataTable` | `shared/` | Reusable data table with sorting, pagination, column visibility |
| `SearchInput` | `shared/` | Debounced search input with icon |
| `FilterBar` | `shared/` | Multi-select filter dropdowns |
| `StatusBadge` | `shared/` | Colored badge for Active/Inactive, roles |
| `ConfirmDialog` | `shared/` | Confirmation modal for destructive actions |
| `EmptyState` | `shared/` | Placeholder for no-results / no-data |
| `LoadingSkeleton` | `shared/` | Shimmer loading states |
| `ErrorBoundary` | `shared/` | React error boundary with retry |
| `Toast` | `shared/` | Toast notification (Sonner) |
| `FormField` | `shared/` | Labeled form input with validation errors |
| `BilingualInput` | `shared/` | Paired Thai + English text inputs |
| `PriceBadge` | `shared/` | Formatted THB price (red if null) |
| `ComingSoonBanner` | `shared/` | "เร็วๆ นี้" banner for future features |
| `CodeBadge` | `shared/` | Monospace badge for protocol/drug/regimen codes |
| `AuditDiff` | `shared/` | Side-by-side old/new values diff viewer |

---

## 8. Feature Modules in Detail

### 8.1 Dashboard (แดชบอร์ด)

#### 8.1.1 Overview Statistics Cards

A row of 6 summary cards at the top. Each card has a tinted icon circle (40×40px, category color at 10% opacity), a large counter number (DM Sans 32px bold, animated from 0 → value on page load with 600ms ease-out), and a Thai label below:

| Card | Value Source | Icon | Tinted Circle Color |
|---|---|---|---|
| ตำแหน่งมะเร็ง (Cancer Sites) | `COUNT(cancer_sites WHERE isActive)` | `Activity` | `#0F766E` (teal) |
| โปรโตคอล (Protocols) | `COUNT(protocol_names WHERE isActive)` | `FileText` | `#2563EB` (blue) |
| สูตรยา (Regimens) | `COUNT(regimens WHERE isActive)` | `FlaskConical` | `#7C3AED` (violet) |
| รายการยา (Drugs) | `COUNT(drugs WHERE isActive)` | `Pill` | `#059669` (emerald) |
| รหัสยา SSO (SSO Codes) | `COUNT(drug_trade_names WHERE isActive)` | `Barcode` | `#D97706` (amber) |
| ผู้ใช้งาน (Users) | `COUNT(users WHERE isActive)` | `Users` | `#78716C` (stone) |

The Users card is visible to ADMIN+ only. Cards stagger their entrance animation (+50ms delay each) and have a subtle hover lift effect (`translateY(-1px)` + `shadow-md`).

#### 8.1.2 Charts and Visualizations

**Chart 1: Protocols by Cancer Site** (Horizontal Bar Chart)
- Protocol count per cancer site (23 bars), sorted descending
- Thai cancer site names on Y-axis
- Color-coded by protocol type (treatment, non_protocol, radiation, follow_up)
- Clicking a bar navigates to that site's protocol listing

**Chart 2: Drug Distribution by Category** (Donut Chart)
- 5 segments: chemotherapy, hormonal, targeted_therapy, immunotherapy, supportive
- Center shows total drug count
- Legend with Thai category labels

**Chart 3: Drug Price Coverage** (Stacked Bar)
- Per drug category: count of trade names with price vs. without price
- Highlights data completeness gaps

**Chart 4: Protocols by Treatment Intent** (Grouped Bar)
- Groups: adjuvant, palliative, first_line, second_line, neoadjuvant, concurrent_crt, etc.
- Thai labels for each intent

#### 8.1.3 Recent Activity Feed (ADMIN+ Only)

- Timeline-style list of the 10 most recent audit log entries
- Shows: user name, action, entity type, entity name, relative timestamp
- "View all" link to full audit log page

#### 8.1.4 Quick Links

- Browse Breast Cancer Protocols (most common site)
- Recently Updated Protocols (last 5 modified)
- Drugs Missing Prices (shortcut to filtered drug list)

---

### 8.2 Protocols Module (โปรโตคอล)

#### 8.2.1 Protocol List Page

**Filter Bar**:
- **Cancer Site**: Searchable multi-select dropdown (Thai names + English in parentheses), grouped by type (solid tumors, hematologic, other)
- **Protocol Type**: treatment, non_protocol, radiation, follow_up
- **Treatment Intent**: adjuvant, neoadjuvant, palliative, first_line, second_line, concurrent_crt, induction, consolidation, etc.
- **Search**: Across protocolCode, nameThai, nameEnglish
- **Status**: Active / Inactive / All
- **Clear All Filters** button

**Data Table Columns**:

| Column | Type | Sortable | Description |
|---|---|---|---|
| Protocol Code | CodeBadge | Yes | e.g., `C0111` — bold monospace |
| Cancer Site | Text + Badge | Yes | Thai name with site code badge |
| Protocol Name (TH) | Text | Yes | Thai name (primary) |
| Protocol Name (EN) | Text | No | English name (smaller, muted) |
| Type | Badge | Yes | Color-coded (treatment=blue, radiation=orange, etc.) |
| Intent | Badge | Yes | Treatment intent |
| Regimens | Count | Yes | Number of linked regimens |
| Status | Badge | Yes | Active/Inactive |
| Actions | Buttons | No | View / Edit / Deactivate |

**Pagination**: 25 items/page (configurable), showing "X-Y of Z".

**Empty State**: Illustration + "ไม่พบโปรโตคอลที่ตรงกัน / No protocols found" with filter adjustment suggestions.

#### 8.2.2 Protocol Detail Page — The Core Display

This is the most complex page. It shows the full protocol hierarchy.

**Page Header**:
- Breadcrumb: แดชบอร์ด > โปรโตคอล > C0111
- Protocol code (large CodeBadge)
- Protocol name (Thai, large) / (English, smaller, muted)
- Cancer site badge (clickable)
- Protocol type + treatment intent badges
- Status badge
- Edit / Deactivate buttons (role-dependent)

**Section 1: Protocol Information Card**

| Field | Example |
|---|---|
| Cancer Site | 01 - โรคมะเร็งเต้านม (Breast Cancer) |
| Protocol Code | C0111 |
| Protocol Type | Treatment (การรักษา) |
| Treatment Intent | Adjuvant (เสริมหลังผ่าตัด) |
| Status | Active |
| Created / Updated | Timestamps |

**Section 2: Applicable Stages (ระยะโรคที่ใช้ได้)**
- List of stage badges showing stageCode + nameThai
- EDITOR+ can add/remove stages via multi-select dialog

**Section 3: Regimens (สูตรยา) — Core Hierarchical Display**

Each linked regimen displayed as an expandable card with a 3px left-border in the regimen type color (see Section 9.2.3):

```
┌─ 3px blue left border (chemotherapy) ────────────────────────────┐
│                                                                   │
│  ★ [AC]  Doxorubicin + Cyclophosphamide          [สูตรแนะนำ]     │
│     ↑CodeBadge                                    ↑amber badge    │
│  ─────────────────────────────────────────────────────────────    │
│  ขนานที่ 1 (1st line)  •  ทุก 21 วัน  •  สูงสุด 4 cycles        │
│  Type: Chemotherapy                                               │
│                                                                   │
│  ┌── Drug Details ───────────────────────────────────────────┐   │
│  │  Drug              │ Dose        │ Route │ Schedule       │   │
│  │────────────────────┼─────────────┼───────┼────────────────│   │
│  │  doxorubicin HCl   │ 60 mg/m²    │ IV    │ Day 1          │   │
│  │  cyclophosphamide  │ 600 mg/m²   │ IV    │ Day 1          │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                   │
│  [▼ ดูรหัสยา SSO และราคา]  ← Accordion trigger                   │
│                                                                   │
│  When expanded (250ms height-animate + fade):                     │
│  ┌── doxorubicin HCl — รหัสยา SSO ───────────────────────────┐  │
│  │  [202009] │ powder for infusion │ 10 mg    │ vial │ ฿127   │  │
│  │  [202971] │ powder for infusion │ 50 mg    │ vial │ ฿319   │  │
│  │  [201981] │ concentrate         │ 10mg/5mL │ vial │ ฿127   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌── cyclophosphamide — รหัสยา SSO ───────────────────────────┐  │
│  │  [201548] │ powder for injection│ 200 mg   │ vial │ ฿42    │  │
│  │  [201555] │ powder for injection│ 500 mg   │ vial │ ฿79    │  │
│  │  [200214] │ film-coated tablet  │ 50 mg    │ tab  │ ฿3     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

- ★ `Star` icon (filled, amber) and "สูตรแนะนำ / Preferred" amber pill badge on preferred regimens
- Regimens ordered by lineOfTherapy ASC, then isPreferred DESC
- Drug codes in `[brackets]` are CodeBadges (JetBrains Mono, teal-tinted background)
- Trade names without pricing: amber 3px left-border + `--warning-subtle` background + "ไม่มีราคา" in `--warning` text with `AlertTriangle` icon
- Prices displayed in JetBrains Mono with `tabular-nums` for column alignment

**Regimen Management** (EDITOR+):
- "เพิ่มสูตรยา / Add Regimen" button — searchable dropdown excluding already-linked
- Set lineOfTherapy and isPreferred when adding
- "ลบสูตรยา / Remove" with confirmation dialog

#### 8.2.3 Protocol Create/Edit Form

**Section 1: Basic Information**
- Cancer Site: Searchable dropdown (Thai + English names)
- Protocol Code: Auto-suggested based on site code + next available; editable
- Protocol Name (Thai): Textarea
- Protocol Name (English): Textarea
- Protocol Type: Dropdown
- Treatment Intent: Dropdown (shown only when type = "treatment")
- Active: Toggle

**Section 2: Applicable Stages** (multi-select)
- Filtered to show only stages valid for selected cancer site (via `cancer_site_stages`)
- Checkboxes grouped by stageGroup

**Section 3: Linked Regimens** (add/remove)
- Searchable regimen selector
- Per regimen: lineOfTherapy (number) + isPreferred (toggle) + notes

**Validation Rules**:
- `protocolCode`: Required, unique, max 10 chars, pattern `C[0-9]{2}[0-9A-Z]{2}`
- `cancerSiteId`: Required
- `nameEnglish`: Required
- `protocolType`: Required, one of enum values
- No duplicate `protocolCode` across all protocols

#### 8.2.4 Protocol Search UX Workflows

| User Intent | How They Search |
|---|---|
| By cancer type | Select Cancer Site = "01 - มะเร็งเต้านม" |
| By protocol code | Type "C0111" in search |
| By treatment intent | Select Treatment Intent = "adjuvant" |
| By regimen | Go to regimen detail page, see linked protocols |
| By drug | Go to drug detail page, see regimens → protocols |

---

### 8.3 Drug List Module (รายการยา)

#### 8.3.1 Drug List Page

**Filter Bar**:
- **Drug Category**: chemotherapy, hormonal, targeted_therapy, immunotherapy, supportive
- **Search**: Across genericName
- **Price Filter**: "Has price" / "Missing price" / "All"
- **Status**: Active / Inactive / All

**Data Table Columns**:

| Column | Sortable | Description |
|---|---|---|
| Generic Name | Yes | e.g., "cisplatin" |
| Category | Yes | Color badge (chemo=blue, hormonal=pink, targeted=purple, immuno=green, supportive=gray) |
| Trade Names Count | Yes | Number of SSO formulations (e.g., "15 formulations") |
| Price Range | No | Min-Max THB across trade names (e.g., "฿104 - ฿380") or "N/A" |
| Regimen Count | Yes | Number of regimens using this drug |
| Status | Yes | Active/Inactive |
| Actions | No | View / Edit |

#### 8.3.2 Drug Detail Page

**Page Header**:
- Generic name (large text)
- Drug category badge
- "Used in X regimens" subtitle
- Edit button (EDITOR+)

**Section 1: Drug Information**
- Generic Name, Category, Status
- Total Formulations count
- Formulations with Price count
- Price Range (min-max THB)

**Section 2: SSO Drug Trade Names (รหัสยา SSO)**

| SSO Code | Trade Name | Dosage Form | Strength | Unit | Unit Price (THB) | Status |
|---|---|---|---|---|---|---|
| `201746` | — | powder for solution for infusion | 10 mg | vial | `฿109.00` | Active |
| `947693` | — | concentrate for solution for infusion | 10 mg/10 mL | vial | `฿104.00` | Active |
| `201779` | — | powder for solution for infusion | 50 mg | vial | `฿303.00` | Active |
| `201714` | — | solution for infusion | 100 mg/100 mL | vial | **ไม่มีราคา** | Active |

- SSO codes rendered as CodeBadge (JetBrains Mono, teal-tinted background)
- Prices in JetBrains Mono with `tabular-nums` for vertical column alignment
- Rows without pricing: 3px amber left-border + `--warning-subtle` background
- Price column: "ไม่มีราคา" in `--warning` color with `AlertTriangle` icon for null values
- **Inline price editing**: Click price cell → number input appears inline with save (checkmark) / cancel (x) mini-buttons (EDITOR+). Price changes trigger audit log.
- "เพิ่มรหัสยา / Add Trade Name" primary button (EDITOR+)

**Section 3: Used in Regimens**

| Regimen | Dose | Route | Schedule | Protocols |
|---|---|---|---|---|
| AC | 60 mg/m2 | IV | Day 1 | C0111, C0112 |
| TAC | 50 mg/m2 | IV | Day 1 | C0111 |

All codes are clickable links.

#### 8.3.3 Drug Create/Edit Form

**Fields**:
1. Generic Name: Text input, required, unique
2. Drug Category: Dropdown
3. Active: Toggle

**Trade Names Sub-Form** (edit page):
- Table of existing trade names with inline editing
- "Add New Formulation" reveals a form row:
  - Drug Code: Required, unique, max 10 chars
  - Trade Name: Optional text
  - Dosage Form: Required (with autocomplete from existing values)
  - Strength: Required
  - Unit: Optional (tablet, vial, capsule, etc.)
  - Unit Price: Optional decimal (THB)

**Price Edit Audit**: Every price change creates an audit log with old and new values.

---

### 8.4 Settings Module (ตั้งค่า) — Admin Only

#### 8.4.1 User Management (จัดการผู้ใช้)

**Data Table**:

| Column | Description |
|---|---|
| Full Name | User's name (Thai or English) |
| Email | Login email |
| Role | Badge (SUPER_ADMIN=red, ADMIN=orange, EDITOR=blue, VIEWER=gray) |
| Department | Hospital department |
| Last Login | Timestamp + relative time |
| Status | Active/Inactive badge |
| Actions | View / Edit / Reset Password / Deactivate |

**Create User Dialog**:
- Full Name (Thai): Required
- Full Name (English): Optional
- Email: Required, valid email, unique
- Role: Dropdown
- Department: Optional
- Position: Optional
- Phone Number: Optional
- Temporary Password: Auto-generated, displayed once

**User Detail Page**:
- Profile information card
- Active sessions list with "Revoke" per session
- Recent audit activity (last 20 entries)
- Account controls (activate/deactivate, reset password)

#### 8.4.2 App Settings (ตั้งค่าแอป) — SUPER_ADMIN Only

- Key-value editor grouped by category (auth, display, system)
- Each setting shows: key, value, description, last modified
- Inline editing with save/cancel
- Changes are audit-logged

#### 8.4.3 Audit Log Viewer (บันทึกการใช้งาน)

**Filter Bar**:
- Date Range picker (from/to)
- User dropdown
- Action dropdown (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE)
- Entity Type dropdown
- Search text

**Data Table**:

| Column | Description |
|---|---|
| Timestamp | Date + time (Thai locale) |
| User | Full name + email |
| Action | Badge (CREATE=green, UPDATE=blue, DELETE=red, LOGIN=gray) |
| Entity | Type + ID + name |
| Details | Expandable diff view |
| IP Address | Source IP |

**Expandable Row**: Side-by-side diff of old vs. new values. Changes highlighted (red=removed, green=added).

**Export**: SUPER_ADMIN can export filtered results as CSV.

---

### 8.5 Patients Module (ผู้ป่วย) — Future Placeholder

**Page Content**:
- Banner: "ฟีเจอร์นี้กำลังพัฒนา / This feature is under development"
- Description of planned functionality:
  - Patient demographics import (Thai national ID, name, date of birth)
  - Treatment plan assignment (link patients to protocols/regimens)
  - Treatment history tracking
  - Integration with hospital HIS
- Expected timeline illustration

### 8.6 Revenue Collection Module (จัดเก็บรายได้) — Future Placeholder

**Page Content**:
- Banner: "ฟีเจอร์นี้กำลังพัฒนา / This feature is under development"
- Description of planned functionality:
  - SSO reimbursement claim generation
  - Treatment cost calculation (regimen drugs x trade name prices x patient BSA)
  - Monthly/quarterly revenue reports
  - DRG-based billing
  - Export to SSO electronic claim format

---

## 9. UI/UX Design System

### 9.1 Design Philosophy — "Clinical Editorial"

The visual identity draws from the precision of premier medical journals (The Lancet, NEJM) fused with the spatial clarity of modern data platforms (Linear, Notion). This is a system where dense oncology data must be comprehensible at a glance — a pharmacist scanning 120 protocols needs to spot the right regimen in seconds, and every pixel serves the mission of accurate, efficient cancer care delivery.

**Core Design Principles:**

1. **Typographic Hierarchy as Navigation** — Font weight, size, and color do the heavy lifting. A doctor's eye flows naturally from cancer site → protocol → regimen → drug → dose without conscious effort.

2. **Color as Taxonomy** — Every entity type has a consistent color language. A 3px left-border accent on cards and table rows encodes category at a glance — visible in peripheral vision before text is read.

3. **Warm Authority** — Teal primary instead of generic corporate blue. Warm stone backgrounds instead of sterile white. The system feels trustworthy and professional without being cold or clinical.

4. **Data Density with Breathing Room** — Medical data is inherently dense. Rather than cramming, use generous inter-section spacing with tight intra-group spacing, creating visual clusters that aid scanning.

5. **Bilingual Harmony** — Thai and English text coexist gracefully. Thai is always primary (larger, bolder) with English as a subordinate reference, never competing for attention.

**The Memorable Detail:** Left-edge color accents on every categorized card and table row. A doctor scanning the protocol list instantly sees: blue = chemotherapy treatment, orange = radiation, green = follow-up — through peripheral vision alone, before reading any text.

### 9.2 Color System

#### 9.2.1 Core Palette — Light Mode

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `--primary` | `#0F766E` | teal-700 | Primary buttons, active navigation, links, focus rings |
| `--primary-hover` | `#0D9488` | teal-600 | Button hover, link hover |
| `--primary-subtle` | `#CCFBF1` | teal-100 | Primary tinted backgrounds, selected rows |
| `--primary-foreground` | `#FFFFFF` | white | Text on primary backgrounds |
| `--background` | `#FAFAF9` | stone-50 | Page background (warm, not sterile white) |
| `--foreground` | `#1C1917` | stone-900 | Primary text |
| `--muted` | `#78716C` | stone-500 | Secondary text, timestamps, English subtitles |
| `--muted-foreground` | `#A8A29E` | stone-400 | Tertiary text, placeholders |
| `--card` | `#FFFFFF` | white | Card backgrounds |
| `--card-foreground` | `#1C1917` | stone-900 | Card text |
| `--border` | `#E7E5E4` | stone-200 | Borders, dividers, table lines |
| `--ring` | `#0F766E` | teal-700 | Focus rings (2px, offset-2) |
| `--sidebar` | `#F5F5F4` | stone-100 | Sidebar background |
| `--sidebar-foreground` | `#44403C` | stone-700 | Sidebar text |
| `--sidebar-accent` | `#0F766E` | teal-700 | Active sidebar item |
| `--accent` | `#EA580C` | orange-600 | Accent highlights, secondary emphasis |
| `--accent-subtle` | `#FFF7ED` | orange-50 | Accent tinted backgrounds |
| `--destructive` | `#E11D48` | rose-600 | Delete actions, error states |
| `--destructive-subtle` | `#FFF1F2` | rose-50 | Error backgrounds |
| `--warning` | `#D97706` | amber-600 | Warnings, missing price indicators |
| `--warning-subtle` | `#FFFBEB` | amber-50 | Warning backgrounds |
| `--success` | `#059669` | emerald-600 | Success states, active badges |
| `--success-subtle` | `#ECFDF5` | emerald-50 | Success backgrounds |

#### 9.2.2 Core Palette — Dark Mode

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `--primary` | `#2DD4BF` | teal-400 | Brighter teal for dark backgrounds |
| `--primary-hover` | `#5EEAD4` | teal-300 | Hover state |
| `--primary-subtle` | `#042F2E` | teal-950 | Tinted backgrounds in dark |
| `--background` | `#0B1120` | custom | Deep navy background (not pure black) |
| `--foreground` | `#F5F5F4` | stone-100 | Primary text |
| `--muted` | `#A8A29E` | stone-400 | Secondary text |
| `--card` | `#131B2E` | custom | Card backgrounds (elevated from page) |
| `--border` | `#1E293B` | slate-800 | Borders |
| `--sidebar` | `#0F1729` | custom | Sidebar background |

**Dark mode card treatment**: Use `ring-1 ring-white/5` instead of shadows (shadows are invisible on dark backgrounds). Cards feel "elevated" through subtle background-color difference from the page.

#### 9.2.3 Semantic Colors — Medical Data Categories

Each medical category has a designated color used consistently across badges, chart segments, table row accents, and icon backgrounds:

| Category | Light Color | Dark Color | Thai Label | Accent |
|---|---|---|---|---|
| Chemotherapy | `#2563EB` (blue-600) | `#60A5FA` (blue-400) | เคมีบำบัด | 3px left border |
| Hormonal | `#DB2777` (pink-600) | `#F472B6` (pink-400) | ฮอร์โมน | 3px left border |
| Targeted Therapy | `#7C3AED` (violet-600) | `#A78BFA` (violet-400) | ยามุ่งเป้า | 3px left border |
| Immunotherapy | `#059669` (emerald-600) | `#34D399` (emerald-400) | ภูมิคุ้มกันบำบัด | 3px left border |
| Supportive | `#78716C` (stone-500) | `#A8A29E` (stone-400) | ยาสนับสนุน | 3px left border |

**Protocol Type Colors:**

| Type | Color | Thai Label |
|---|---|---|
| Treatment | `#2563EB` (blue-600) | การรักษา |
| Non-protocol | `#78716C` (stone-500) | นอกโปรโตคอล |
| Radiation | `#EA580C` (orange-600) | รังสีรักษา |
| Follow-up | `#059669` (emerald-600) | ติดตามผล |

**Role Badge Colors:**

| Role | Background | Text | Border |
|---|---|---|---|
| SUPER_ADMIN | `#FFF1F2` (rose-50) | `#E11D48` (rose-600) | `#FECDD3` (rose-200) |
| ADMIN | `#FFF7ED` (orange-50) | `#EA580C` (orange-600) | `#FED7AA` (orange-200) |
| EDITOR | `#F0FDFA` (teal-50) | `#0F766E` (teal-700) | `#99F6E4` (teal-200) |
| VIEWER | `#F5F5F4` (stone-100) | `#78716C` (stone-500) | `#E7E5E4` (stone-200) |

### 9.3 Typography

#### 9.3.1 Font Stack

| Purpose | Font Family | Fallback | Source |
|---|---|---|---|
| Headings & UI (Latin) | **DM Sans** | system-ui, sans-serif | Google Fonts (variable, 400-700) |
| Body & Data (Thai + Latin) | **Bai Jamjuree** | "Noto Sans Thai", sans-serif | Google Fonts (400, 500, 600, 700) |
| Monospace (codes) | **JetBrains Mono** | "Fira Code", monospace | Google Fonts (400, 500) |

**Why these fonts:**

- **DM Sans**: Geometric sans-serif with warm, contemporary feel. Its slightly rounded terminals and open apertures make it highly legible at small sizes (critical for dense data tables) while giving headings a modern, authoritative presence. Avoids the overused Inter/Roboto defaults.
- **Bai Jamjuree**: Designed by Cadson Demak (Thailand). A geometric Thai typeface whose proportions naturally harmonize with Latin geometric sans-serifs. Excellent x-height and clear Thai glyph rendering at 13-14px — critical for table data. Bilingual text feels unified rather than stitched together.
- **JetBrains Mono**: Purpose-built for code. Its distinct character forms make drug codes (`201548`) and protocol codes (`C0111`) instantly recognizable. The slight extra width gives medical codes a badge-like presence.

**Font Loading** (`next/font`):

```typescript
import { DM_Sans, Bai_Jamjuree, JetBrains_Mono } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const baiJamjuree = Bai_Jamjuree({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});
```

#### 9.3.2 Type Scale

| Element | Font | Size | Weight | Line Height | Letter Spacing | Color |
|---|---|---|---|---|---|---|
| Page title | DM Sans | 28px (1.75rem) | 700 | 1.2 | -0.02em | `--foreground` |
| Section heading | DM Sans | 20px (1.25rem) | 600 | 1.3 | -0.01em | `--foreground` |
| Card title | DM Sans | 16px (1rem) | 600 | 1.4 | -0.01em | `--foreground` |
| Body text | Bai Jamjuree | 14px (0.875rem) | 400 | 1.6 | 0 | `--foreground` |
| Body emphasis | Bai Jamjuree | 14px (0.875rem) | 600 | 1.6 | 0 | `--foreground` |
| Table header | DM Sans | 12px (0.75rem) | 600 | 1.4 | 0.05em | `--muted` |
| Table cell | Bai Jamjuree | 13px (0.8125rem) | 400 | 1.5 | 0 | `--foreground` |
| Code / badge | JetBrains Mono | 13px (0.8125rem) | 500 | 1.4 | 0.02em | `--primary` |
| Caption / helper | Bai Jamjuree | 12px (0.75rem) | 400 | 1.5 | 0 | `--muted` |
| English subtitle | DM Sans | 12px (0.75rem) | 400 | 1.4 | 0 | `--muted` |
| Stat number | DM Sans | 32px (2rem) | 700 | 1.1 | -0.02em | `--foreground` |
| Sidebar nav | Bai Jamjuree | 14px (0.875rem) | 500 | 1.4 | 0 | `--sidebar-foreground` |

**Thai-English Bilingual Display Pattern:**

```
โรคมะเร็งเต้านม          ← Bai Jamjuree 16px 600, --foreground
Breast Cancer             ← DM Sans 12px 400, --muted
```

### 9.4 Spacing & Layout

#### 9.4.1 Spacing Scale (Tailwind v4, base = 4px)

| Context | Value | Tailwind Class |
|---|---|---|
| Page padding (desktop) | 32px | `p-8` |
| Page padding (mobile) | 16px | `p-4` |
| Card padding | 24px | `p-6` |
| Card internal sections gap | 20px | `space-y-5` |
| Section gap (between cards) | 24px | `space-y-6` |
| Table cell padding | 16px / 12px | `px-4 py-3` |
| Compact table cell | 12px / 8px | `px-3 py-2` |
| Form field gap | 20px | `space-y-5` |
| Inline element gap | 8px | `gap-2` |
| Badge internal padding | 6px / 12px | `px-3 py-1.5` |
| Button padding (default) | 10px / 20px | `px-5 py-2.5` |
| Button padding (small) | 6px / 12px | `px-3 py-1.5` |
| Icon + text gap | 8px | `gap-2` |

#### 9.4.2 Layout Grid

| Zone | Width | Behavior |
|---|---|---|
| Sidebar (expanded) | 260px | Fixed, frosted glass effect (`backdrop-blur-xl`) |
| Sidebar (collapsed) | 64px | Icon-only, tooltip on hover |
| Sidebar (mobile) | 280px | Sheet overlay, `backdrop-blur-sm` on scrim |
| Main content max-width | 1400px | Centered with auto margins (`max-w-7xl mx-auto`) |
| Dashboard stat cards | 6-column | `grid-cols-2 md:grid-cols-3 xl:grid-cols-6` |
| Dashboard charts | 2×2 grid | `grid-cols-1 md:grid-cols-2` |

#### 9.4.3 Card Design System

All content cards follow a consistent structure with category color accents:

```
┌─ 3px left border (category color) ─────────────────────────────┐
│                                                                  │
│  [Icon]  Card Title                         [Action buttons]     │
│          Subtitle / description                                  │
│                                                                  │
│  ─── Separator ──────────────────────────────────────────────    │
│                                                                  │
│  Card body content                                               │
│                                                                  │
│  ─── Separator (optional) ────────────────────────────────────   │
│                                                                  │
│  Footer / metadata                               [Secondary CTA] │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Card Styling:**
- Background: `var(--card)` with `shadow-sm` (light) or `ring-1 ring-white/5` (dark)
- Border radius: `rounded-xl` (12px)
- Left accent: 3px colored `border-left` for categorized items (protocol type, drug category)
- Hover: `shadow-md` transition on interactive cards (200ms ease)
- No visible top/right/bottom borders in light mode (shadow creates separation)

### 9.5 Component Design Language

#### 9.5.1 shadcn/ui Components Used

**Core**: Button, Input, Textarea, Select, Checkbox, Radio Group, Switch, Label, Separator, Badge
**Layout**: Card, Sheet (mobile sidebar), Collapsible, Accordion, Tabs
**Data Display**: Table, Avatar, Tooltip, HoverCard
**Feedback**: Alert, Toast (Sonner), Dialog, Alert Dialog, Progress
**Navigation**: Breadcrumb, Navigation Menu, Dropdown Menu, Command (palette), Pagination
**Forms**: Form (react-hook-form integration), Calendar, Date Picker, Popover, Combobox

#### 9.5.2 Buttons

| Variant | Style | Usage |
|---|---|---|
| Primary | Solid teal (`--primary`), white text, `shadow-sm` | Main CTA: Save, Create, Confirm |
| Secondary | `--background` with `ring-1 ring-border`, dark text | Cancel, Back, secondary actions |
| Destructive | Solid rose (`--destructive`), white text | Delete, Deactivate |
| Ghost | Transparent, teal text, teal hover bg at 10% opacity | Inline actions, table row actions |
| Link | Teal text, underline on hover | Navigation, breadcrumbs |

**Button states:**
- Hover: Slight scale 1.01 + color shift (100ms ease)
- Active: Scale 0.98 (50ms)
- Focus: 2px teal ring, offset-2, subtle glow `shadow-[0_0_0_3px_rgba(15,118,110,0.1)]`
- Disabled: 50% opacity, no pointer events
- Loading: Spinner replaces icon, text dims to 70%

#### 9.5.3 Badges (StatusBadge, CodeBadge, PriceBadge)

**StatusBadge** — pill-shaped with soft background + border:

```css
/* Active: bg-emerald-50 text-emerald-700 border-emerald-200 */
/* Inactive: bg-stone-100 text-stone-500 border-stone-200 */
.status-badge {
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 500;
  font-family: var(--font-body); /* Bai Jamjuree */
  border: 1px solid;
}
```

**CodeBadge** — monospace with teal-tinted background:

```css
.code-badge {
  font-family: var(--font-mono); /* JetBrains Mono */
  font-size: 13px;
  font-weight: 500;
  background: var(--primary-subtle);
  color: var(--primary);
  padding: 2px 8px;
  border-radius: 6px;
  letter-spacing: 0.02em;
}
```

**PriceBadge** — tabular-nums for aligned pricing:

```css
.price {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  /* Has price: text-foreground */
  /* No price: text-warning, italic, "ไม่มีราคา" */
}
```

#### 9.5.4 Data Tables

Tables are the primary data interface. Designed for scanability of dense medical data:

- **Header row**: `bg-stone-50` (light) / `bg-white/5` (dark), uppercase 12px `DM Sans` with 0.05em letter-spacing, `text-muted`
- **Row hover**: `bg-primary-subtle/50` with smooth 150ms transition
- **Selected row**: `bg-primary-subtle` with `ring-1 ring-primary/20`
- **Sortable columns**: Hover shows sort arrow. Active sort column: teal arrow + bold header text
- **Row height**: 48px minimum for comfortable click targets
- **Category accent**: 3px `border-left` color-coded by entity type (protocol type, drug category)
- **Row separation**: Subtle `border-bottom` only (no alternating row colors — clean, modern)
- **Sticky header**: `sticky top-0 z-10` with `backdrop-blur-sm` for scroll context
- **Empty state**: Centered illustration + bilingual message + filter adjustment suggestions

#### 9.5.5 Form Inputs

- **Default**: `ring-1 ring-border`, `rounded-lg`, 40px height, `bg-background`
- **Focus**: `ring-2 ring-primary`, subtle teal glow via `shadow-[0_0_0_3px_rgba(15,118,110,0.1)]`
- **Error**: `ring-2 ring-destructive`, error message below in `text-destructive` 12px
- **Disabled**: `bg-stone-100 opacity-60`
- **Labels**: `DM Sans` 13px 500, positioned above with 6px gap
- **Helper text**: `Bai Jamjuree` 12px 400, `text-muted`, positioned below with 4px gap

#### 9.5.6 Sidebar Navigation

```
┌──────────────────────────────────┐
│                                  │
│  [Logo] SSO Cancer Care          │  ← DM Sans 16px 700, teal
│  ระบบมะเร็ง สปส.                 │  ← Bai Jamjuree 11px 400, muted
│                                  │
│  ════════════════════════════    │
│                                  │
│  ◉ แดชบอร์ด                      │  ← Active: teal bg/10%, teal text,
│                                  │     4px teal left border, font-600
│  ○ โปรโตคอล                      │  ← Inactive: stone-600 text,
│                                  │     hover → stone-100 bg
│  ○ รายการยา                      │
│                                  │
│  ○ ผู้ป่วย          เร็วๆ นี้     │  ← Dimmed text + "เร็วๆ นี้" mini badge
│  ○ จัดเก็บรายได้    เร็วๆ นี้     │
│                                  │
│  ──── ตั้งค่า ──────────────     │  ← Section divider with label
│                                  │
│  ○ จัดการผู้ใช้                   │
│  ○ ตั้งค่าแอป                    │
│  ○ บันทึกการใช้งาน                │
│                                  │
│  ════════════════════════════    │
│                                  │
│  [Avatar]                        │
│  สมชาย แพทย์ดี                   │  ← Bai Jamjuree 14px 500
│  ⬤ ผู้ดูแลระบบ                   │  ← Role badge (colored per 9.2.3)
│  [ออกจากระบบ]                    │  ← Ghost button, small
│                                  │
└──────────────────────────────────┘
```

**Sidebar styling:**
- Background: `var(--sidebar)` with `backdrop-blur-xl` (frosted glass over subtle gradient)
- Border-right: `1px solid var(--border)`
- Collapse/expand transition: 200ms `ease-out`
- Collapsed state: 64px wide, icons only, tooltip on hover showing Thai label
- Logo area: subtle animated gradient underline (teal → accent, 3s infinite alternate)

#### 9.5.7 Topbar

```
┌────────────────────────────────────────────────────────────────────┐
│  แดชบอร์ด > โปรโตคอล > C0111                    🌙  TH ▾  [Avatar] │
│  Dashboard > Protocols > C0111                                      │
└────────────────────────────────────────────────────────────────────┘
```

- Height: 64px, `sticky top-0 z-20`, `backdrop-blur-md bg-background/80`
- Breadcrumb: Thai primary (Bai Jamjuree 14px 500), English secondary (DM Sans 12px 400 muted) below
- Right section: Theme toggle → Language switcher → User avatar dropdown
- Bottom border: `1px solid var(--border)`

### 9.6 Animation & Micro-interactions

#### 9.6.1 Page Transitions

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| Page load | Fade-in + slide-up (8px) | 300ms | `ease-out` |
| Card stagger | Each card delays +50ms | 300ms each | `ease-out` |
| Stat cards | Counter animation (0 → value) | 600ms | `ease-out` with overshoot |
| Route change | Fade-out (150ms) → Fade-in (200ms) | 350ms total | `ease-in-out` |

#### 9.6.2 Component Interactions

| Element | Trigger | Effect | Duration |
|---|---|---|---|
| Card | Hover | `shadow-sm → shadow-md`, subtle `translateY(-1px)` | 200ms |
| Table row | Hover | `bg-primary-subtle/30` highlight | 150ms |
| Button | Click | Scale 0.98 → 1.0 | 100ms |
| Sidebar nav item | Hover | Background slide-in from left | 200ms |
| Accordion/Collapsible | Toggle | Height auto-animate + fade content | 250ms |
| Badge | Appear | Scale 0 → 1 with slight bounce | 300ms |
| Toast | Enter/Exit | Slide-in from right + fade / Slide-out + fade | 200ms / 150ms |
| Modal/Dialog | Enter | Fade backdrop + scale content from 0.95 | 200ms |
| Modal/Dialog | Exit | Fade all | 150ms |

#### 9.6.3 Loading States

- **Page-level**: A thin teal progress bar at the very top of the viewport (like YouTube/GitHub loading indicator)
- **Skeleton screens**: Pulsing `bg-stone-200/60` (light) / `bg-white/5` (dark), rounded shapes matching actual content layout
- **Button loading**: Icon replaced with spinning circle, text remains visible at 70% opacity
- **Data table loading**: 5 skeleton rows matching column widths and heights
- **Stat cards loading**: Skeleton number + label with shimmer animation

#### 9.6.4 Feedback Animations

- **Successful save**: Green checkmark icon briefly pulses + success toast
- **Form validation error**: Shake animation (4px horizontal, 3 cycles, 300ms) on invalid field
- **Destructive confirm**: Dialog appears with slight scale bounce to draw attention

### 9.7 Data Visualization

Charts use **Recharts** with custom theme integration.

#### 9.7.1 Chart Color Palette

```typescript
const chartColors = {
  // Primary data series (ordered for maximum visual distinction)
  series: [
    '#0F766E', // teal-700 (primary)
    '#2563EB', // blue-600
    '#7C3AED', // violet-600
    '#EA580C', // orange-600
    '#DB2777', // pink-600
    '#059669', // emerald-600
    '#CA8A04', // yellow-600
    '#78716C', // stone-500
  ],
  // Grid and axes
  grid: 'var(--border)',
  axis: 'var(--muted)',
  // Tooltip
  tooltipBg: 'var(--card)',
  tooltipBorder: 'var(--border)',
};
```

#### 9.7.2 Chart Styling

- **Grid lines**: Dashed, 1px, `--border` color, horizontal only
- **Axis labels**: `DM Sans` 11px, `--muted` color
- **Tooltip**: Card-style with `shadow-lg`, `rounded-lg`, `backdrop-blur-sm`
- **Legend**: Below chart, horizontal layout, dot indicators, `Bai Jamjuree` 12px
- **Animations**: Bars grow from bottom (500ms, stagger 30ms). Donut draws clockwise (800ms). Lines trace left-to-right (600ms).
- **Hover**: Individual bar/segment highlights at full opacity, siblings dim to 40%

#### 9.7.3 Dashboard Chart Layout

```
┌─ Protocols by Cancer Site ──────────────┐  ┌─ Drug Distribution ──────────┐
│                                          │  │                               │
│  เต้านม ████████████████████  18         │  │      ┌───────────┐            │
│  ปอด   █████████████████  15             │  │     ╱  เคมีบำบัด  ╲           │
│  ลำไส้  ████████████  10                 │  │    │    66 ยา     │           │
│  ปากมดลูก ██████████  8                  │  │     ╲            ╱           │
│  ...                                     │  │      └───────────┘            │
│                                          │  │  [Legend with Thai labels]     │
│  [Clickable bars → navigate to site]     │  │                               │
└──────────────────────────────────────────┘  └───────────────────────────────┘

┌─ Price Coverage ────────────────────────┐  ┌─ Protocols by Intent ─────────┐
│                                          │  │                               │
│  เคมี    ████████░░░  80% covered        │  │  ████ adjuvant                │
│  ฮอร์โมน ██████░░░░░  55%                │  │  ████ palliative              │
│  มุ่งเป้า ████░░░░░░  35%                │  │  ███ first_line               │
│  ...                                     │  │  ██ neoadjuvant               │
│                                          │  │  ...                          │
└──────────────────────────────────────────┘  └───────────────────────────────┘
```

### 9.8 Icon System

Uses **Lucide React** (the default shadcn/ui icon library).

**Entity icons:**

| Context | Icon | Usage |
|---|---|---|
| Cancer Sites | `Activity` | Navigation, card headers |
| Protocols | `FileText` | Navigation, card headers |
| Regimens | `FlaskConical` | Navigation, card headers |
| Drugs | `Pill` | Navigation, card headers |
| SSO Codes | `Barcode` | Dashboard stat, badge prefix |
| Users | `Users` | Navigation, admin section |
| Dashboard | `LayoutDashboard` | Navigation |
| Settings | `Settings` | Navigation |
| Audit Logs | `ScrollText` | Navigation, admin section |

**Status & action icons:**

| Context | Icon | Color |
|---|---|---|
| Preferred regimen | `Star` (filled) | `--warning` (amber) |
| Active status | `CircleCheck` | `--success` (emerald) |
| Inactive status | `CircleX` | `--muted` (stone) |
| Price missing | `AlertTriangle` | `--warning` (amber) |
| Expand/Collapse | `ChevronDown` / `ChevronUp` | `--muted` |
| Search | `Search` | `--muted` |
| Filter | `SlidersHorizontal` | `--muted` |
| Add | `Plus` | `--primary` |
| Edit | `Pencil` | `--primary` |
| Delete | `Trash2` | `--destructive` |
| Export | `Download` | `--primary` |

**Icon sizing:** 16px inline, 20px buttons, 24px navigation, 40px stat cards.

**Stat card icon treatment:** Icon inside a 40×40px rounded circle with category-color background at 10% opacity. Icon color matches the category. Creates a distinctive visual anchor for each dashboard metric.

### 9.9 Responsive Design

#### 9.9.1 Breakpoints (Tailwind v4)

| Breakpoint | Value | Target |
|---|---|---|
| `sm` | 640px | Large phones |
| `md` | 768px | Tablets (portrait) |
| `lg` | 1024px | Tablets (landscape) / small laptops |
| `xl` | 1280px | Standard desktops |
| `2xl` | 1536px | Wide monitors |

#### 9.9.2 Responsive Behavior Matrix

| Component | < 768px (Mobile) | 768-1024px (Tablet) | > 1024px (Desktop) |
|---|---|---|---|
| Sidebar | Hidden → Sheet overlay via hamburger | Collapsed (64px, icons only) | Expanded (260px) |
| Topbar | Hamburger + minimal breadcrumb | Full breadcrumb, compact controls | Full breadcrumb + all controls |
| Stat cards | 2-column grid, horizontally scrollable | 3-column grid | 6-column single row |
| Data tables | Card-list transformation (see below) | Horizontal scroll, sticky first column | Full table |
| Charts | Stack vertically, full width | 2-column grid | 2-column grid |
| Filter bar | Collapse into "Filters" bottom sheet | Horizontal scroll | Full inline row |
| Protocol detail | Stacked sections | 2-column (info + stages) | Full layout |
| Forms | Full-width stacked fields | 2-column grid for short fields | 2-column grid |
| Dialogs | Full-screen sheet (from bottom) | Centered modal (480px) | Centered modal (560px) |

**Mobile Data Table → Card Transformation:**

```
Desktop table row:
| C0111 | 01 - เต้านม | AC + Cyclophosphamide... | Treatment | Active | [Edit] |

Mobile card:
┌─ 3px teal border ──────────────────────────┐
│  C0111                          Active ●    │
│  AC + Cyclophosphamide...                   │
│  01 - มะเร็งเต้านม                          │
│  Treatment • Adjuvant                        │
│  ────────────────────────────────────────   │
│  [ดูรายละเอียด]                  [แก้ไข]    │
└─────────────────────────────────────────────┘
```

### 9.10 Thai Language UI Considerations

- **Primary language**: All UI labels, navigation, and system messages display in Thai by default
- **Bilingual data fields**: Thai name displayed first (larger, `font-600`), English below (smaller, `text-muted`)
- **Numerals**: Standard Arabic numerals (0-9) for all codes, prices, and quantities — NOT Thai numerals (๐-๙)
- **Currency**: "฿" prefix with thousands separator, 2 decimal places. Use `Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })`
- **Date format**: `DD/MM/YYYY` Gregorian calendar (NOT Buddhist Era). Relative dates in Thai (e.g., "2 ชั่วโมงที่แล้ว")
- **Font rendering**: Bai Jamjuree at minimum 13px for Thai readability. Line-height >= 1.5 for Thai script (ascenders/descenders need vertical space)
- **Text wrapping**: `overflow-wrap: break-word` with `word-break: keep-all` for Thai text
- **Text direction**: LTR throughout (Thai is LTR)
- **Search**: Thai text search should handle terms without tone marks (future enhancement)

### 9.11 Dark Mode Implementation

**Architecture:**
- Theme state managed via `next-themes` (`ThemeProvider` with `attribute="class"`)
- Theme stored in `localStorage` key `theme` (values: `light`, `dark`, `system`)
- `system` mode respects OS `prefers-color-scheme`
- Toggle cycles: Light → Dark → System

**CSS Variable Strategy:**

```css
:root {
  --background: #FAFAF9;
  --foreground: #1C1917;
  --primary: #0F766E;
  /* ... all tokens from 9.2.1 */
}

.dark {
  --background: #0B1120;
  --foreground: #F5F5F4;
  --primary: #2DD4BF;
  /* ... all tokens from 9.2.2 */
}
```

**Dark mode-specific adjustments:**
- Cards use `ring-1 ring-white/5` instead of shadows (shadows invisible on dark backgrounds)
- Chart colors shift to brighter variants (see 9.2.3 dark color column)
- Table row hover uses `bg-white/5` instead of tinted backgrounds
- Code badges: `bg-teal-950 text-teal-400` in dark mode
- Images/illustrations: Apply `brightness-90 contrast-110` filter
- Top loading progress bar uses `bg-teal-400` (brighter than light mode teal-700)

### 9.12 Key Page Visual Compositions

#### 9.12.1 Login Page

Full-screen split layout:

```
┌───────────────────────────────────┬─────────────────────────┐
│                                   │                         │
│        SSO Cancer Care            │   เข้าสู่ระบบ            │
│   ระบบจัดการโปรโตคอลรักษามะเร็ง    │   Sign in               │
│                                   │                         │
│    ╱╲  ╱╲  ╱╲                     │   ┌─────────────────┐   │
│   ╱  ╲╱  ╲╱  ╲   (molecular      │   │  อีเมล           │   │
│   ╲  ╱╲  ╱╲  ╱    pattern)       │   └─────────────────┘   │
│    ╲╱  ╲╱  ╲╱                     │   ┌─────────────────┐   │
│                                   │   │  รหัสผ่าน         │   │
│     สำนักงานประกันสังคม             │   └─────────────────┘   │
│                                   │                         │
│                                   │   [   เข้าสู่ระบบ   ]   │
│                                   │                         │
└───────────────────────────────────┴─────────────────────────┘
```

- **Left panel (60%)**: Teal-to-navy gradient background with large, semi-transparent hexagonal geometric pattern (evoking molecular structures). App logo + tagline in white. Institutional branding.
- **Right panel (40%)**: Clean white card with login form, vertically centered. DM Sans heading, Bai Jamjuree labels.
- **Mobile**: Full-screen white form, gradient becomes a top banner (20vh) with logo.
- **Error state**: Shake animation on form card + red inline message below password field.

#### 9.12.2 Dashboard

Visual hierarchy top-to-bottom:

1. **Greeting bar**: "สวัสดี, สมชาย" + current date (Thai locale) + last login info
2. **Stat cards row**: 6 cards in a single row, each with:
   - Tinted icon circle (40px, category-colored at 10% opacity)
   - Large counter number (DM Sans 32px 700, animated from 0)
   - Thai label below (Bai Jamjuree 13px)
   - Subtle hover lift effect
3. **Charts grid**: 2×2 on desktop, stacked on mobile. Each chart in a card with title + "ดูทั้งหมด" link.
4. **Quick links**: 3 shortcut cards (Breast Cancer protocols, recently updated, drugs missing prices) with right-arrow icons.
5. **Recent activity** (ADMIN+): Timeline with avatar, color-coded action icon, description, relative time in Thai.

#### 9.12.3 Protocol Detail (Hero Page)

The most data-dense and most important page in the system. Designed for maximum information density without overwhelming the user:

1. **Sticky header section**: Protocol code (large CodeBadge) + Thai name (20px bold) + English name (14px muted) + inline badges (type, intent, status) + action buttons. Sticks to top on scroll with `backdrop-blur-md`.

2. **Info card**: Grid of key-value pairs. Labels in muted 12px DM Sans uppercase, values in 14px Bai Jamjuree. Cancer site is a clickable link with site-code badge.

3. **Stages section**: Horizontal wrap of stage badges. Each badge: pill-shaped `bg-stone-100 text-stone-700 rounded-full px-3 py-1`. EDITOR+ sees an "+ เพิ่มระยะ" ghost button at the end.

4. **Regimens section** (the core hierarchical display): Each regimen is an expandable card with 3px left-border in regimen type color:
   - **Card header**: Star icon (if preferred, in amber) + regimen code (CodeBadge) + regimen name + "สูตรแนะนำ" amber badge (if preferred)
   - **Metadata row**: Line of therapy label + cycle duration + regimen type
   - **Drug table**: Compact table inside the card — drug name, dose, route, day schedule
   - **Expandable SSO details**: "ดูรหัสยา SSO และราคา" accordion trigger. When expanded, each drug shows its trade name formulations with SSO code, dosage form, strength, unit, and price. Missing prices: amber left-border + `--warning-subtle` background + "ไม่มีราคา" in warning text.

5. **Bottom metadata**: Created/updated timestamps, last editor name.

#### 9.12.4 Drug Detail Page

1. **Header**: Generic name (DM Sans 28px 700) + category badge (colored) + "ใช้ใน X สูตรยา" subtitle
2. **Summary metric cards**: 3 cards in a row — total formulations, formulations with price, price range (min-max in JetBrains Mono)
3. **Trade names table**: Full-width table with inline price editing. Rows without price have amber 3px left-border + `--warning-subtle` background. Price cells are editable on click (EDITOR+): number input appears inline with save/cancel mini-buttons.
4. **Regimen usage table**: Shows which regimens use this drug with dose/route/schedule, and which protocols link to those regimens. All codes are clickable CodeBadge links.

---

## 10. Security

### 10.1 OWASP Top 10 Mitigations

| Risk | Mitigation |
|---|---|
| **A01: Broken Access Control** | Role-based guards on every endpoint. `RolesGuard` validates `@Roles()`. No default-allow. Soft-delete instead of hard-delete. |
| **A02: Cryptographic Failures** | bcrypt (salt=12) for passwords. TLS/HTTPS in production. No sensitive data in JWT beyond user ID and role. DB connection via SSL. |
| **A03: Injection** | Prisma ORM parameterized queries. `ValidationPipe` with `class-validator` on all DTOs. No raw SQL in application layer. |
| **A04: Insecure Design** | Admin-only account creation. No self-registration. Refresh tokens in httpOnly cookies. Rate limiting. Account lockout. |
| **A05: Security Misconfiguration** | Helmet.js for HTTP headers. CORS restricted to frontend origin. Non-default JWT secret. No debug mode in production. Non-root container user. |
| **A06: Vulnerable Components** | npm audit in CI. Lockfile pinning. Alpine-based images. |
| **A07: Authentication Failures** | Strong password policy. Account lockout after 5 attempts. Server-side session revocation. Refresh token rotation. |
| **A08: Data Integrity Failures** | Audit log on all mutations. Soft-delete prevents data loss. Input validation on all endpoints. |
| **A09: Logging Failures** | Comprehensive audit logging. Structured JSON logs. Request ID tracking. Sensitive fields redacted. |
| **A10: SSRF** | No user-controlled URLs processed by server. No external HTTP calls based on user input. |

### 10.2 HTTP Security Headers (Helmet.js)

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  noSniff: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));
```

### 10.3 CORS Configuration

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400,
});
```

### 10.4 Rate Limiting

| Endpoint Group | Limit | Window |
|---|---|---|
| `/auth/login` | 5 requests | per minute per IP |
| `/auth/refresh` | 10 requests | per minute per IP |
| Global API | 100 requests | per minute per user |
| Export endpoints | 5 requests | per minute per user |

Implemented via `@nestjs/throttler`.

### 10.5 Input Validation

All DTOs validated with `class-validator`. Global `ValidationPipe`:

```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
}));
```

### 10.6 Additional Protections

- **SQL Injection**: Prisma ORM parameterized queries. No `$executeRawUnsafe` in application layer.
- **XSS**: React auto-escapes. No `dangerouslySetInnerHTML`. CSP headers.
- **CSRF**: Stateless JWT. `SameSite=Strict` cookies. CORS restricted.

---

## 11. Docker and Deployment

### 11.1 docker-compose.yml

```yaml
version: '3.8'

services:
  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "${WEB_PORT:-3000}:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://api:4000/api/v1
    depends_on:
      api:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "${API_PORT:-4000}:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:4000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    restart: unless-stopped
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

### 11.2 Backend Dockerfile (apps/api/Dockerfile)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY prisma/ ./prisma/
RUN npm ci --workspace=apps/api
COPY apps/api/ ./apps/api/
RUN npx prisma generate --config prisma/prisma.config.ts
RUN npm run build --workspace=apps/api

# Stage 2: Production
FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
WORKDIR /app
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma/generated ./prisma/generated
USER nestjs
EXPOSE 4000
CMD ["node", "dist/main.js"]
```

### 11.3 Frontend Dockerfile (apps/web/Dockerfile)

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY apps/web/package*.json ./apps/web/
RUN npm ci --workspace=apps/web
COPY apps/web/ ./apps/web/
RUN npm run build --workspace=apps/web

# Stage 2: Production
FROM node:20-alpine AS runner
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
WORKDIR /app
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./public
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### 11.4 Environment Variables

```env
# Database (external PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/sso_cancer?schema=public&sslmode=require

# JWT
JWT_SECRET=<random-256-bit-hex>
JWT_REFRESH_SECRET=<different-random-256-bit-hex>

# CORS
CORS_ORIGIN=https://sso-cancer.hospital.go.th

# Ports
WEB_PORT=3000
API_PORT=4000

# Application
NODE_ENV=production
LOG_LEVEL=info
```

### 11.5 Health Check

```
GET /api/v1/health → { "status": "ok", "timestamp": "...", "database": "connected", "uptime": 86400 }
```

Verifies database connectivity via `SELECT 1`.

---

## 12. Error Handling and Logging

### 12.1 Error Code Catalog

| Code | HTTP Status | Thai Message | English Message |
|---|---|---|---|
| `VALIDATION_ERROR` | 400 | ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ | Validation failed |
| `INVALID_CREDENTIALS` | 401 | อีเมลหรือรหัสผ่านไม่ถูกต้อง | Invalid email or password |
| `TOKEN_EXPIRED` | 401 | เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่ | Session expired |
| `TOKEN_INVALID` | 401 | Token ไม่ถูกต้อง | Invalid token |
| `FORBIDDEN` | 403 | คุณไม่มีสิทธิ์ในการดำเนินการนี้ | Insufficient permissions |
| `ACCOUNT_LOCKED` | 423 | บัญชีถูกล็อก กรุณาลองใหม่ภายหลัง | Account locked |
| `ACCOUNT_DEACTIVATED` | 403 | บัญชีถูกปิดใช้งาน | Account deactivated |
| `NOT_FOUND` | 404 | ไม่พบข้อมูลที่ต้องการ | Not found |
| `DUPLICATE_ENTRY` | 409 | ข้อมูลซ้ำ กรุณาตรวจสอบ | Duplicate entry |
| `RATE_LIMITED` | 429 | คำขอมากเกินไป กรุณารอสักครู่ | Too many requests |
| `INTERNAL_ERROR` | 500 | เกิดข้อผิดพลาดในระบบ | Internal error |

### 12.2 Structured Logging

JSON log format via Pino:

```json
{
  "level": "info",
  "timestamp": "2026-02-22T10:30:00.000Z",
  "requestId": "uuid-v4",
  "method": "PATCH",
  "path": "/api/v1/drugs/5",
  "userId": 3,
  "role": "EDITOR",
  "statusCode": 200,
  "responseTime": 45,
  "ip": "10.0.1.50"
}
```

**Log Levels**: error, warn, info, debug (dev only). Passwords and tokens are never logged.

### 12.3 Audit Log Interceptor

A NestJS interceptor captures audit entries for all mutations (POST, PATCH, DELETE) on clinical data:

- Captures: userId, action, entityType, entityId, oldValues, newValues, ipAddress, userAgent
- Auth events (LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE) logged directly by auth service

### 12.4 Frontend Error Handling

- **Error Boundary**: Wraps main content. Shows retry button on unhandled errors.
- **Toast Notifications**: All actions produce toasts via Sonner (green=success, red=error, amber=warning, blue=info).
- **API Error Mapping**: Centralized API client maps backend error codes to bilingual user-facing messages.

---

## 13. Performance

### 13.1 Caching Strategy

| Data | Mechanism | TTL | Invalidation |
|---|---|---|---|
| Cancer Sites list | NestJS in-memory cache | 1 hour | On CREATE/UPDATE |
| Cancer Stages list | NestJS in-memory cache | 1 hour | On CREATE/UPDATE |
| Drug categories | NestJS in-memory cache | 1 hour | On CREATE/UPDATE |
| Dashboard statistics | NestJS in-memory cache | 5 minutes | Time-based expiry |
| Protocol detail | Cache by ID | 10 minutes | On protocol/regimen/drug UPDATE |
| Static assets | Browser / CDN | 1 year (hashed) | Deploy-based |

### 13.2 Protocol Detail Query Optimization

The most complex query uses Prisma nested includes for one round-trip:

```typescript
prisma.protocolName.findUnique({
  where: { id },
  include: {
    cancerSite: true,
    protocolStages: {
      include: { stage: true },
      orderBy: { stage: { sortOrder: 'asc' } },
    },
    protocolRegimens: {
      include: {
        regimen: {
          include: {
            regimenDrugs: {
              include: {
                drug: {
                  include: {
                    tradeNames: {
                      where: { isActive: true },
                      orderBy: { unitPrice: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { lineOfTherapy: 'asc' },
        { isPreferred: 'desc' },
      ],
    },
  },
});
```

Existing indexes on junction table foreign keys support this query pattern.

### 13.3 Pagination

Offset-based: `?page=1&limit=25&sortBy=createdAt&sortOrder=desc`
- Default limit: 25 (configurable via app settings)
- Maximum limit: 100 (hardcoded)
- Response includes `meta: { total, page, limit, totalPages }`

### 13.4 Frontend Optimizations

- **Code Splitting**: Next.js App Router auto-splits by route. Dynamic imports for charts.
- **React Server Components**: List pages use RSC for reduced client bundle.
- **Debounced Search**: 300ms debounce on all search inputs.
- **Lazy Chart Loading**: `next/dynamic` for Recharts components.
- **Image Optimization**: `next/image` for logos and illustrations.

---

## 14. Internationalization

### 14.1 Strategy

Thai-first bilingual system:

- **UI labels**: Thai primary, English secondary
- **Data fields**: Display both `nameThai` and `nameEnglish` (Thai larger/primary)
- **System messages**: Thai with English fallback
- **Numbers/dates**: Arabic numerals, Gregorian calendar

### 14.2 Implementation

- **Translation files**: `public/locales/th.json` and `public/locales/en.json`
- **Hook**: `useTranslation()` context hook
- **Language toggle**: Dropdown in topbar (TH / EN)
- **Data display**: Always shows both languages; priority follows user's preference

### 14.3 Translation Scope (~150 keys)

- Sidebar menu labels (~10)
- Page headings (~20)
- Button labels (~30)
- Form labels (~50)
- Error messages (~20)
- Status labels (~10)
- Confirmation dialogs (~10)

---

## 15. Testing Strategy

### 15.1 Testing Pyramid

```
           ┌──────────┐
           │   E2E    │  ~20 tests (Playwright)
           │  (3-5%)  │
          ┌┴──────────┴┐
          │ Integration │  ~50 tests (Supertest + Prisma)
          │  (20-30%)   │
         ┌┴─────────────┴┐
         │  Unit Tests    │  ~150 tests (Jest)
         │  (65-75%)      │
         └────────────────┘
```

### 15.2 Unit Tests (Jest)

**Backend**: Service CRUD, guards, DTOs, interceptors, utilities
**Frontend**: Custom hooks, utility functions, component rendering

### 15.3 Integration Tests (Supertest)

- Auth flow (login, refresh, logout, lockout)
- CRUD with nested associations
- Permission checks per role
- Pagination and filtering
- Audit log creation on mutations

**Test database**: Separate `sso_cancer_test`, migrated + seeded before runs.

### 15.4 E2E Tests (Playwright)

- Login flow → dashboard
- Protocol browsing → filter → detail with full hierarchy
- Drug search → detail → trade names
- Admin creates user → user logs in → admin deactivates → user blocked
- Theme toggle (light/dark)
- Mobile responsive sidebar

### 15.5 Coverage Targets

| Category | Target |
|---|---|
| Backend services | > 80% |
| Backend controllers | > 70% |
| Frontend hooks/utils | > 80% |
| Frontend components | > 60% |
| Overall | > 75% |

---

## 16. Accessibility

### 16.1 WCAG 2.1 AA Compliance

| Guideline | Implementation |
|---|---|
| **1.1 Text Alternatives** | All icons have `aria-label`. Badges have screen-reader text. |
| **1.3 Adaptable** | Semantic HTML (headings, landmarks, lists). `<th scope>` on data tables. |
| **1.4 Distinguishable** | Color contrast >= 4.5:1. Badge colors supplemented by text/icons. |
| **2.1 Keyboard Accessible** | All interactive elements keyboard-navigable. Focus trapping in modals. |
| **2.4 Navigable** | Skip navigation link. Breadcrumbs. Focus management on route changes. |
| **3.1 Readable** | `lang="th"` on HTML element. Language attribute updates on toggle. |
| **3.3 Input Assistance** | Validation errors via `aria-describedby`. `aria-required` on required fields. |
| **4.1 Compatible** | Valid HTML. ARIA attributes where semantic HTML insufficient. |

### 16.2 Thai Language Accessibility

- Screen reader support via proper `lang` attributes
- `word-break: keep-all` for Thai text wrapping
- Adequate font size (14px base) for Thai script vertical space

---

## 17. Future Roadmap

### Phase 2: Patient Module (ผู้ป่วย) — Est. 3-4 months after launch

**New Tables**: `patients`, `patient_treatments`, `treatment_cycles`

**Features**:
- Patient demographics import (CSV/Excel from hospital HIS)
- Treatment plan assignment (patient → protocol → regimen)
- Cycle tracking with dates and outcomes
- Patient search by national ID, hospital number, or name

### Phase 3: Revenue Collection (จัดเก็บรายได้) — Est. 2-3 months after Phase 2

**New Tables**: `revenue_claims`, `claim_items`, `revenue_reports`

**Features**:
- Automatic cost calculation (regimen drugs x SSO unit prices x patient BSA)
- SSO reimbursement claim generation
- Revenue dashboard (monthly revenue, claims by status, revenue by cancer site)
- Export to SSO electronic claim format (CSV/XML)
- DRG-based billing for inpatient treatments

### Phase 4: Reporting and Analytics

- Protocol utilization reports
- Drug consumption analysis
- Trend analysis over time
- Export to Excel/PDF

### Integration Points

| System | Direction | Data | Format |
|---|---|---|---|
| Hospital HIS | Import | Patient demographics, visits | CSV / HL7 |
| SSO E-Claim | Export | Reimbursement claims | SSO XML/CSV |
| Hospital Pharmacy | Import | Drug inventory, purchase prices | CSV |
| Thai FDA Drug DB | Import | Drug registration, indications | API (future) |

---

## Appendix A: Existing Data Summary

### A.1 Cancer Sites (23 entries)

Codes 01-21 cover specific cancer types: Breast (01), Cervical (02), Ovarian (03), Uterine (04), Head & Neck (05), Lung (06), Colorectal (07), Esophageal (08), Gastric (09), Hepatobiliary/Pancreatic (10), Bladder/Kidney (11), Prostate (12), Adult ALL (13), Adult AML (14), Adult APL (15), Adult CML (16), Adult Lymphoma (17), Multiple Myeloma/MDS (18), Bone (19), Soft Tissue Sarcoma (20), Pediatric (21). Code 88 = Surgical Treatment. Code 99 = Other Cancer Types.

### A.2 Cancer Stages (28 entries in 6 groups)

- **solid_tumor** (6): EARLY, LOCALLY_ADVANCED, ADVANCED, METASTATIC, RECURRENT, LOCOREGIONAL
- **tnm** (6): STAGE_I, STAGE_II, STAGE_III, STAGE_IIIA, STAGE_IIIB_C, STAGE_IV
- **lung** (2): LIMITED_STAGE, EXTENSIVE_STAGE
- **prostate** (2): M1CSPC, M1CRPC
- **hematologic** (6): INDUCTION, CONSOLIDATION, MAINTENANCE, RELAPSED, REFRACTORY, BLAST_CRISIS
- **general** (6): ADJUVANT, NEOADJUVANT, PERIOPERATIVE, PALLIATIVE, CONCURRENT_CRT, DEFINITIVE

### A.3 Protocol Naming Convention

Pattern: `C{siteCode}{seq}` — e.g., `C0111`, `C0212`, `C011P`, `C022N`
- 11-19: Treatment protocols
- 2N: Non-protocol
- 2R: Radiation
- 2S: Follow-up
- 1P: Special protocols

### A.4 Drug Pricing Notes

Of 307 drug trade names: ~150 have SSO unit prices, ~157 have no pricing (unitPrice IS NULL). Price range: ฿1.00 (prednisolone 5mg tablet) to ฿33,959.00 (carmustine 100mg vial). This coverage gap is tracked on the dashboard.

### A.5 Regimen Types

- `chemotherapy`: Standard cytotoxic (majority)
- `targeted`: CDK4/6 inhibitors, TKIs
- `chemo_immuno`: R-CHOP, R-CVP
- `chemoradiation`: Concurrent CRT regimens
- `hormonal`: LHRH agonists

---

## Appendix B: Glossary

| Thai Term | English Term | Context |
|---|---|---|
| สปส. | SSO (Social Security Office) | Thai government insurance program |
| โปรโตคอล | Protocol | Standardized treatment plan |
| สูตรยา | Regimen | Specific drug combination with dosing |
| รหัสยา | Drug Code | SSO-assigned unique identifier per formulation |
| ระยะโรค | Disease Stage | Cancer staging classification |
| ตำแหน่งมะเร็ง | Cancer Site | Anatomical location |
| เคมีบำบัด | Chemotherapy | Cytotoxic drug treatment |
| ฮอร์โมน | Hormonal Therapy | Hormone-modulating treatment |
| ยามุ่งเป้า | Targeted Therapy | Molecular-targeted treatment |
| ภูมิคุ้มกันบำบัด | Immunotherapy | Immune-modulating treatment |
| ยาสนับสนุน | Supportive Care | Side-effect management drugs |
| ขนานแรก / ขนานที่สอง | First-line / Second-line | Treatment order |
| เสริมหลังผ่าตัด | Adjuvant | Post-surgery treatment |
| ก่อนการผ่าตัด | Neoadjuvant | Pre-surgery treatment |
| ประคับประคอง | Palliative | Symptom management |
| รังสีรักษา | Radiation Therapy | Ionizing radiation treatment |
| แพร่กระจาย | Metastatic | Distant organ spread |
| กลับเป็นซ้ำ | Recurrent | Cancer returned after treatment |
| แดชบอร์ด | Dashboard | Overview/summary screen |
| จัดเก็บรายได้ | Revenue Collection | SSO reimbursement tracking |
| ผู้ดูแลระบบ | Administrator | System admin user |
| ผู้แก้ไขข้อมูล | Editor | Data editor user |
| ผู้ดูข้อมูล | Viewer | Read-only user |
