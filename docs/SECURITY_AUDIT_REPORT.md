# Security Audit Report — SSO Cancer Care

**Date:** 2026-03-02
**Auditor:** Automated Security Review (Claude Code)
**Codebase:** SSO Cancer Care v1.0.0 (NestJS 11 + Next.js 15 + Prisma 7 Monorepo)
**Scope:** Full-stack security review covering authentication, authorization, input validation, secrets management, API security, frontend security, infrastructure, and data protection.
**Status:** Remediation applied — 24 of 35 findings fixed (5 Critical, 9 High, 5 Medium, 5 Low). Both API and Web builds verified.

---

## Executive Summary

The SSO Cancer Care application demonstrates **strong security fundamentals** with professional-grade JWT authentication, comprehensive session management, proper RBAC enforcement, and thorough audit logging. However, the review identified **5 Critical, 10 High, 12 Medium, and 8 Low** severity findings that should be addressed before production deployment in a hospital environment.

### Overall Security Rating: **7.5 / 10 (GOOD)**

| Category | Rating | Notes |
|----------|--------|-------|
| Authentication & Authorization | 9/10 | Excellent JWT, session management, RBAC |
| Input Validation & SQL Injection | 8/10 | Strong Prisma safety; raw SQL risks in backup module |
| Secrets Management | 5/10 | Committed .env files, plain-text API keys in DB |
| API Security (CORS, Headers, Rate Limiting) | 7/10 | Helmet enabled; missing nginx headers, CSP |
| Frontend Security (XSS, CSRF, Tokens) | 9/10 | No XSS vectors, proper token handling |
| File Upload & Data Import | 8/10 | Size limits enforced; needs MIME validation |
| Infrastructure (Docker, Deployment) | 7/10 | Non-root containers; needs hardening |
| Data Protection (PHI/PII) | 8/10 | AI prompts sanitized; backups unencrypted |

---

## Table of Contents

1. [Critical Findings (P0)](#1-critical-findings-p0)
2. [High Severity Findings (P1)](#2-high-severity-findings-p1)
3. [Medium Severity Findings (P2)](#3-medium-severity-findings-p2)
4. [Low Severity Findings (P3)](#4-low-severity-findings-p3)
5. [Positive Security Findings](#5-positive-security-findings)
6. [Remediation Priority Matrix](#6-remediation-priority-matrix)
7. [Appendix: Files Reviewed](#7-appendix-files-reviewed)

---

## 1. Critical Findings (P0)

> Items that must be resolved **immediately** before any production deployment.

---

### C-01: JWT Secrets Committed to Git Repository

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Secrets Management |
| **Files** | `.env` (lines 2-3), `.env.docker` (lines 2-3) |
| **OWASP** | A02:2021 Cryptographic Failures |

**Description:**
Real JWT secrets are committed to the repository in both `.env` and `.env.docker`:

```
JWT_SECRET=6e49d13e57f2d5aa055be7a15bd2e4edae4bc7d2c7b6485c675772714d7f0fc7
JWT_REFRESH_SECRET=601d3d2b9082b604108173333e18745b1b152d530896fc94f3431ddd4770bd4a
```

The `.gitignore` correctly lists these files, but they were already committed before the rule was added. This means anyone with repository access (or if the repo is ever made public) can forge valid JWT tokens.

**Impact:** Complete authentication bypass. Attacker can sign tokens for any user including SUPER_ADMIN.

**Remediation:**
1. Regenerate ALL secrets immediately (JWT_SECRET, JWT_REFRESH_SECRET, DB_PASSWORD)
2. Scrub secrets from git history using `git filter-branch` or `bfg-repo-cleaner`
3. Force all developers to re-clone the repository
4. Replace `.env` and `.env.docker` with `.env.example` and `.env.docker.example` containing placeholder values
5. Add pre-commit hooks to prevent future secret commits (e.g., `git-secrets`, `detect-secrets`)

---

### C-02: Unmasked API Key Returned in PATCH Response

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Secrets Management |
| **Files** | `apps/api/src/modules/app-settings/app-settings.service.ts` (lines 45-55) |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
When updating sensitive settings (AI API keys, HIS API key) via `PATCH /app-settings/:key`, the service returns the full unmasked `settingValue` in the response. The `maskValue()` function correctly masks values in GET responses, but is NOT applied to PATCH responses.

**Flow:**
1. Admin sends `PATCH /app-settings/ai_claude_api_key` with `{ settingValue: "sk-ant-..." }`
2. Service returns `{ success: true, data: { settingKey, settingValue: "sk-ant-...", ... } }`
3. Full API key visible in response body, browser DevTools, and network logs

**Impact:** API keys for AI providers (Gemini, Claude, OpenAI) and HIS system exposed in HTTP responses.

**Remediation:**
Apply `maskValue()` to PATCH response before returning, or return a minimal response:
```typescript
async update(key: string, dto: UpdateSettingDto) {
  const result = await this.prisma.appSetting.update({ ... });
  if (SENSITIVE_KEYS.includes(key)) {
    result.settingValue = this.maskValue(result.settingValue);
  }
  return result;
}
```

---

### C-03: API Key Transmitted in Plain Text via validate-key Endpoint

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Secrets Management |
| **Files** | `apps/api/src/modules/ai/ai.controller.ts` (lines 44-49), `apps/api/src/modules/ai/dto/ai-suggestion.dto.ts` (lines 1-16) |
| **OWASP** | A02:2021 Cryptographic Failures |

**Description:**
The `POST /ai/settings/validate-key` endpoint accepts an unencrypted API key in the request body:

```json
POST /api/v1/ai/settings/validate-key
{
  "provider": "claude",
  "apiKey": "sk-ant-api03-..."
}
```

This key is visible in server request logs, network proxies, browser DevTools history, and API monitoring systems.

**Impact:** AI provider API keys leaked through multiple channels.

**Remediation:**
1. Remove the validate-key endpoint entirely, OR
2. Redesign: validate the key already stored in `app_settings` (server-side only) without accepting it in request body
3. If validation must be client-initiated, save the key first (via existing PATCH) and then call a `/validate` endpoint that reads from DB

---

### C-04: SQL Injection Risk in Backup-Restore Module

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Input Validation / SQL Injection |
| **Files** | `apps/api/src/modules/backup-restore/backup-restore.service.ts` (lines 85, 345, 357-371, 388-389, 407-408) |
| **OWASP** | A03:2021 Injection |

**Description:**
Multiple instances of unsafe string interpolation in raw SQL queries:

```typescript
// Line 85: Table name interpolation
await this.prisma.$queryRawUnsafe(`SELECT * FROM "${table}" ORDER BY id`);

// Line 345: Dynamic column/value construction
await this.prisma.$executeRawUnsafe(
  `INSERT INTO "${table}" (${colList}) VALUES ${valueSets.join(', ')} ON CONFLICT DO NOTHING`,
  ...params,
);

// Lines 368-369: Sequence name from DB result directly interpolated
await this.prisma.$executeRawUnsafe(
  `SELECT setval('${seqName}', $1)`,
  maxId,
);
```

While table names come from the hardcoded `TABLE_ORDER` array (mitigating risk), the `seqName` variable is derived from a database query result (`pg_get_serial_sequence()`) and interpolated without validation. A malicious backup file that modifies table schemas could exploit this.

**Impact:** SQL injection could lead to data theft, modification, or complete database compromise.

**Remediation:**
1. Validate `seqName` against a strict regex: `/^[a-z_][a-z0-9_."]*$/i`
2. Use PostgreSQL's `pg_quote_ident()` for all dynamic identifiers
3. Whitelist expected sequence names
4. Consider using Prisma's safe query methods where possible

---

### C-05: Hardcoded Mock HIS API Key with Console Logging

| Field | Value |
|-------|-------|
| **Severity** | CRITICAL |
| **Category** | Secrets Management |
| **Files** | `SSO_Mock_Project/server.js` (lines 9, 280) |
| **OWASP** | A07:2021 Identification and Authentication Failures |

**Description:**
The mock HIS server has a hardcoded fallback API key and logs it to stdout:

```javascript
const API_KEY = process.env.HIS_API_KEY || 'mock-his-api-key-2024';
// ...
console.log(`[mock-his] API Key: ${API_KEY}`);
```

If developers use the mock server without setting `HIS_API_KEY`, they use a known credential. The key is also logged to console output.

**Impact:** Known API key could be used in non-mock environments if accidentally deployed.

**Remediation:**
1. Remove hardcoded fallback; fail if `HIS_API_KEY` not set
2. Never log API keys, even in mock servers
3. Add startup validation: `if (!process.env.HIS_API_KEY) { throw new Error('HIS_API_KEY required'); }`

---

## 2. High Severity Findings (P1)

> Items that should be resolved **within 1 week**.

---

### H-01: Missing Security Headers in Nginx Reverse Proxy

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Infrastructure |
| **Files** | `deploy/nginx/nginx.conf` (lines 16-45) |
| **OWASP** | A05:2021 Security Misconfiguration |

**Description:**
The nginx configuration lacks critical security headers:
- No `X-Frame-Options` (clickjacking protection)
- No `X-Content-Type-Options: nosniff` (MIME sniffing prevention)
- No `Strict-Transport-Security` (HSTS)
- No `Content-Security-Policy`
- No `Referrer-Policy`

While Helmet in NestJS provides some of these for API responses, the Next.js frontend served through nginx does NOT have these headers.

**Remediation:**
Add to nginx `server` block:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

---

### H-02: No Multi-Factor Authentication (MFA)

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Authentication |
| **Files** | `apps/api/src/modules/auth/` (entire module) |
| **OWASP** | A07:2021 Identification and Authentication Failures |

**Description:**
The system relies solely on username/password authentication. For a healthcare application handling cancer treatment protocols and patient data, MFA is a critical security requirement.

**Impact:** Compromised credentials provide full access without a second factor.

**Remediation:**
1. Implement TOTP-based MFA (Google Authenticator compatible) as optional for all users
2. **Require** MFA for SUPER_ADMIN and ADMIN roles
3. Provide backup codes for account recovery
4. Add MFA setup and verification endpoints

---

### H-03: HIS API Key Stored as Plain Text in Database

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Secrets Management |
| **Files** | `apps/api/src/modules/his-integration/his-api.client.ts` (line 41), `database/seeds/017_hospital_settings.sql` (line 5) |
| **OWASP** | A02:2021 Cryptographic Failures |

**Description:**
AI provider API keys and the HIS API key are stored as plain text in the `app_settings` table. While masked in GET API responses, the actual values are readable to anyone with database access.

**Impact:** Database breach exposes all third-party API credentials, allowing unauthorized access to AI services and the hospital HIS system.

**Remediation:**
1. Implement field-level encryption (AES-256-GCM) for `settingValue` when `settingKey` is in `SENSITIVE_KEYS`
2. Store encryption key in environment variable (not in DB)
3. Encrypt before write, decrypt on read in `AppSettingsService`
4. Add key rotation mechanism

---

### H-04: Missing Content Security Policy (CSP) on Frontend

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Frontend Security |
| **Files** | `apps/web/next.config.ts`, `apps/api/src/main.ts` |
| **OWASP** | A05:2021 Security Misconfiguration |

**Description:**
No explicit Content Security Policy is configured for the Next.js frontend. Helmet provides a default CSP for API responses, but the frontend pages have no CSP headers.

**Impact:** XSS attacks that bypass React's built-in protection would have unrestricted script execution capabilities.

**Remediation:**
Add security headers in `next.config.ts`:
```typescript
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' " + process.env.NEXT_PUBLIC_API_URL },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ],
  }];
}
```

---

### H-05: Unencrypted Database Backup Files

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Data Protection |
| **Files** | `apps/api/src/modules/backup-restore/backup-restore.service.ts` (lines 69-112) |
| **OWASP** | A02:2021 Cryptographic Failures |

**Description:**
Database backups contain ALL data including:
- User credentials (password hashes)
- Patient PII (HN, citizen ID, full names)
- API keys (plain text in `app_settings`)
- Complete audit trail

Backups are gzip-compressed but NOT encrypted. The SHA256 checksum provides integrity but not confidentiality.

**Impact:** If backup file is intercepted or leaked, all patient data and credentials are exposed.

**Remediation:**
1. Add AES-256-GCM encryption wrapper around gzip payload
2. Derive encryption key from a separate secret (not the JWT secret)
3. Include encryption metadata in backup header
4. Document secure storage requirements for backup files

---

### H-06: No Forced Password Change for Temporary Passwords

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Authentication |
| **Files** | `apps/api/src/modules/users/users.service.ts` (lines 77-90, 233-240) |
| **OWASP** | A07:2021 Identification and Authentication Failures |

**Description:**
When admins create users or reset passwords, a temporary password is generated. However:
1. No `mustChangePassword` flag forces the user to change it on first login
2. The temp password is not included in password history
3. No secure delivery mechanism exists (no email/SMS)

The frontend displays the temp password inline with a fallback to 'Check server logs'.

**Impact:** Temporary passwords may remain in use indefinitely or be communicated insecurely.

**Remediation:**
1. Add `mustChangePassword: boolean` field to User model
2. Set it `true` on user creation and password reset
3. Enforce password change before any other API access (middleware check)
4. Add temp password to password history

---

### H-07: CORS Wildcard in Docker Environment

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | API Security |
| **Files** | `.env.docker` (line 4) |
| **OWASP** | A05:2021 Security Misconfiguration |

**Description:**
```
CORS_ORIGIN=*
```
The Docker environment file sets `CORS_ORIGIN=*`, allowing any origin to make authenticated cross-origin requests. While intended for development, this file is committed to the repository and could be accidentally used in production-like environments.

**Impact:** CSRF attacks, credential theft via cross-origin requests from malicious domains.

**Remediation:**
1. Change to `CORS_ORIGIN=http://localhost:47001,http://localhost:3000`
2. Add runtime validation in `main.ts` to reject wildcard `*` when `NODE_ENV=production`
3. Log a warning if wildcard is used in any environment

---

### H-08: Login Rate Limiting Allows Credential Stuffing

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Authentication |
| **Files** | `apps/api/src/modules/auth/auth.controller.ts` (line 41) |
| **OWASP** | A07:2021 Identification and Authentication Failures |

**Description:**
The login endpoint allows 10 requests per 60 seconds per IP. While individual accounts lock after 5 failed attempts, an attacker can target multiple accounts:
- 10 attempts/min * 60 min = 600 login attempts per hour from a single IP
- Distributed attacks from multiple IPs bypass this limit entirely

**Impact:** Credential stuffing attacks against multiple user accounts.

**Remediation:**
1. Reduce login rate limit to 5 requests per minute
2. Add global failed-login monitoring (alert on > 20 failures/hour across all accounts)
3. Implement CAPTCHA after 3 consecutive failures
4. Consider IP-based progressive delays

---

### H-09: No Session Activity Monitoring / Inactivity Timeout

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | Session Management |
| **Files** | `apps/api/src/modules/auth/auth.service.ts` |
| **OWASP** | A07:2021 Identification and Authentication Failures |

**Description:**
Sessions have a 7-day refresh token TTL but no inactivity timeout. A stolen session remains valid for the full 7 days regardless of whether the legitimate user is active.

**Impact:** Session hijacking window is unnecessarily large. In a hospital environment where workstations may be shared, this is a significant risk.

**Remediation:**
1. Add `lastActivityAt` field to Session model
2. Update on each token refresh
3. Implement configurable inactivity timeout (default: 30 minutes)
4. Reject refresh requests if `lastActivityAt` exceeds timeout

---

### H-10: No CSRF Token Validation

| Field | Value |
|-------|-------|
| **Severity** | HIGH |
| **Category** | API Security |
| **Files** | `apps/api/src/main.ts` |
| **OWASP** | A01:2021 Broken Access Control |

**Description:**
No explicit CSRF token mechanism is implemented. Protection relies solely on:
1. `SameSite=Strict` on refresh token cookie (good)
2. Bearer token in Authorization header (good for API calls)
3. CORS restrictions (good)

While these mitigations are strong, a defense-in-depth approach recommends additional CSRF protection.

**Mitigating factors:** The combination of Bearer token auth + SameSite=Strict cookies significantly reduces CSRF risk. This is acceptable for most SPA architectures but noted for completeness.

**Remediation (Optional but recommended):**
1. Add `X-CSRF-Token` header validation for state-changing operations
2. Or validate `Origin`/`Referer` headers on mutation requests

---

## 3. Medium Severity Findings (P2)

> Items that should be resolved **within the current sprint**.

---

### M-01: File Upload Extension-Only Validation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | File Upload Security |
| **Files** | `apps/api/src/modules/protocol-analysis/protocol-analysis.controller.ts` (lines 46-68) |

**Description:**
Excel file uploads are validated only by file extension (`.xlsx`/`.xls`). No MIME type or magic bytes validation is performed. A malicious file with `.xlsx` extension could potentially exploit the XLSX parser.

**Remediation:**
1. Add magic bytes validation for XLSX format (ZIP signature: `50 4B 03 04`)
2. Verify MIME type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
3. Consider sanitizing cell values (remove leading `=`, `+`, `-`, `@` to prevent formula injection)

---

### M-02: XLSX Formula Injection Risk

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | File Upload Security |
| **Files** | `apps/api/src/modules/protocol-analysis/services/import.service.ts` (line 2) |

**Description:**
The `xlsx` library (v0.18.5) is used for parsing Excel files. While it doesn't execute formulas by default, imported cell values are stored as-is. If these values are later exported to Excel, formula injection could occur.

**Remediation:**
1. Strip formula prefixes (`=`, `+`, `-`, `@`) from cell values during import
2. Verify `xlsx` library version is latest and has no known CVEs
3. Document that formulas are not executed during import

---

### M-03: JWT Token TTL Not Validated at Environment Level

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Authentication |
| **Files** | `apps/api/src/modules/auth/auth.service.ts` (lines 37-43) |

**Description:**
Access and refresh token TTLs are configurable via environment variables (`JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`) with no validation preventing dangerously long values (e.g., `JWT_ACCESS_TTL=365d`).

**Remediation:**
Add constructor validation:
```typescript
if (parseTtlToSeconds(this.accessTokenTtl) > 3600) {
  throw new Error('JWT_ACCESS_TTL must not exceed 1 hour');
}
if (parseTtlToSeconds(this.refreshTokenTtl) > 30 * 86400) {
  throw new Error('JWT_REFRESH_TTL must not exceed 30 days');
}
```

---

### M-04: Email Address in JWT Payload

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Data Protection |
| **Files** | `apps/api/src/modules/auth/auth.service.ts` (lines 243-248) |

**Description:**
JWT access token payload includes `email` and `fullName`. Since JWTs are Base64-encoded (not encrypted), these PII fields are readable by anyone who intercepts the token.

**Remediation:**
Include only `sub` (user ID) and `role` in the JWT payload. Fetch user details from the database during request validation (already done in `JwtStrategy.validate()`).

---

### M-05: Audit Log Retention Not Enforced

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Data Protection |
| **Files** | `apps/api/src/modules/audit-logs/` |

**Description:**
Audit logs grow unbounded with no retention policy. Over time, this can cause storage exhaustion and backup file bloat.

**Remediation:**
1. Implement configurable retention policy (e.g., `AUDIT_LOG_RETENTION_DAYS=365`)
2. Add a scheduled job (`@nestjs/schedule`) to purge old logs
3. Offer option to archive to cold storage before deletion

---

### M-06: HIS API Data Accepted Without Sanitization

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Input Validation |
| **Files** | `apps/api/src/modules/his-integration/his-integration.service.ts` |

**Description:**
Patient names, ICD-10 codes, and medication data from the HIS API are accepted and stored without sanitization. If the HIS system is compromised, malicious payloads could be injected into the SSO Cancer database.

**Remediation:**
1. Validate ICD-10 codes match expected format (`/^[A-Z]\d{2}(\.\d{1,4})?$/`)
2. Trim and limit length of patient names
3. Sanitize medication descriptions
4. Log all HIS imports for audit

---

### M-07: ILIKE Wildcard Characters Not Escaped in Search

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Input Validation |
| **Files** | `apps/api/src/modules/cancer-patients/cancer-patients.service.ts` (lines 80-89) |

**Description:**
The `drugName` search parameter is used in an ILIKE query without escaping wildcard characters (`%`, `_`):
```typescript
const pattern = `%${drugName}%`;
```
A user inputting `drug%admin` would match unintended rows.

**Remediation:**
Escape ILIKE wildcards before use:
```typescript
const escaped = drugName.replace(/[%_\\]/g, '\\$&');
const pattern = `%${escaped}%`;
```

---

### M-08: Backup Upload Missing MIME Type / Decompression Bomb Validation

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | File Upload Security |
| **Files** | `apps/api/src/modules/backup-restore/backup-restore.controller.ts` (line 58) |

**Description:**
The 50MB backup upload limit applies to the compressed file. A malicious gzip file could decompress to a much larger size, causing memory exhaustion (decompression bomb).

**Remediation:**
1. Add a maximum uncompressed size check during decompression
2. Use streaming decompression with size tracking
3. Validate MIME type (only `application/gzip` and `application/json`)
4. Reject files that exceed 200MB when decompressed

---

### M-09: Password Reset Has No Secure Delivery Mechanism

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Authentication |
| **Files** | `apps/api/src/modules/users/users.service.ts` (lines 77-90) |

**Description:**
When an admin resets a user's password, the temporary password has no secure delivery mechanism. It's displayed in the admin UI for manual communication to the user.

**Remediation:**
1. Implement email delivery of temporary passwords (or better: single-use password reset links)
2. Add SMS delivery option
3. At minimum, document the secure communication procedure

---

### M-10: Implicit Type Conversion in ValidationPipe

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Input Validation |
| **Files** | `apps/api/src/main.ts` (lines 33-40) |

**Description:**
`enableImplicitConversion: true` in the ValidationPipe can cause unexpected type coercion. Edge cases like very large numbers or special string values might bypass validation.

**Remediation:**
1. Ensure all numeric query params have explicit `@Max()` and `@Min()` decorators
2. The existing `@Max(100)` on `PaginationQueryDto.limit` is good; verify all DTOs have similar bounds
3. Consider disabling implicit conversion and using explicit `@Type(() => Number)` decorators

---

### M-11: Error Response Validation Details May Leak Internal Structure

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Information Disclosure |
| **Files** | `apps/api/src/common/filters/http-exception.filter.ts` (lines 62-108) |

**Description:**
Validation errors return field-level details that expose internal DTO property names and structure. While useful for development, this helps attackers understand the API schema.

**Remediation:**
In production, reduce validation error detail level. Map internal field names to generic identifiers.

---

### M-12: AI Suggestion Prompts Stored in Database

| Field | Value |
|-------|-------|
| **Severity** | MEDIUM |
| **Category** | Data Protection |
| **Files** | `apps/api/src/modules/ai/ai.service.ts` (lines 131-137) |

**Description:**
AI suggestion prompts (first 10,000 characters) are stored in the `ai_suggestions` table. While HN/VN are excluded from prompts, clinical details (ICD-10 codes, drug names, staging info) are present and could reveal patient treatment information.

**Remediation:**
1. Document in privacy policy that AI prompts are stored for audit purposes
2. Consider reducing storage to 5,000 characters
3. Apply retention policy to AI suggestions

---

## 4. Low Severity Findings (P3)

> Items to address in future development sprints.

---

### L-01: Default Admin Credentials Documented in README

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | CLAUDE.md, `database/seeds/012_initial_super_admin.sql` |

**Description:** Default credentials (`admin@sso-cancer.local` / `Admin@1234`) are documented and seeded. No forced password change on first login.

**Remediation:** Add `mustChangePassword` mechanism (see H-06).

---

### L-02: Auth Flag Cookie Uses SameSite=Lax Instead of Strict

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `apps/web/src/stores/auth-store.ts` (line 10) |

**Description:** The non-sensitive auth flag cookie uses `SameSite=Lax`. While this cookie is only a UX hint (not a security boundary), `SameSite=Strict` provides stronger protection.

**Remediation:** Change to `SameSite=Strict` since real auth is JWT-based.

---

### L-03: No Device Fingerprinting for Session Anomaly Detection

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `apps/api/src/modules/auth/auth.service.ts` |

**Description:** The system stores IP and user agent per session but doesn't validate consistency. A stolen session could be used from a different country/device without detection.

**Remediation:** Implement optional session fingerprinting and anomaly alerting.

---

### L-04: Source Maps in Compiled API Output

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `apps/api/dist/**/*.js.map` |

**Description:** Source maps exist in the compiled API output. If the `dist/` directory were accidentally served publicly, source code would be exposed.

**Remediation:** Ensure Docker builds exclude `.map` files, or configure `tsconfig.build.json` to disable source maps.

---

### L-05: SSOP Export Files Not Encrypted

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `apps/api/src/modules/ssop-export/ssop-export.service.ts` |

**Description:** SSOP billing export ZIP files stored in `BillingExportBatch.fileData` contain patient billing data in plain text (Windows-874 encoded).

**Remediation:** Consider encrypting export files at rest and adding file expiration.

---

### L-06: Swagger Docs Accessible Without Authentication in Development

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `apps/api/src/main.ts` (lines 49-61) |

**Description:** Swagger docs at `/api/v1/docs` are publicly accessible in development mode, exposing all endpoints, DTOs, and auth patterns.

**Remediation:** Disabled in production (already done). Optionally require Bearer token for dev access.

---

### L-07: No Automated Container Image Scanning

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `.github/workflows/build-and-push.yml` |

**Description:** CI/CD pipeline builds and pushes Docker images but doesn't scan them for known CVEs.

**Remediation:** Add Trivy or Snyk scanning step to GitHub Actions workflow.

---

### L-08: Self-Signed SSL Certificate Uses RSA 2048

| Field | Value |
|-------|-------|
| **Severity** | LOW |
| **Files** | `deploy/deploy.sh`, `deploy/pull-and-run.sh` |

**Description:** Deployment scripts generate self-signed certificates with RSA 2048 and 365-day validity.

**Remediation:** Use RSA 4096 or ECDSA P-256. Reduce validity to 90 days. Integrate Let's Encrypt for production.

---

## 5. Positive Security Findings

The following security measures are well-implemented and demonstrate professional security practices:

### Authentication & Authorization
- **Bcrypt 12 rounds** — Industry-standard password hashing (`auth.service.ts`)
- **Timing attack prevention** — Dummy hash comparison for non-existent users
- **Token rotation** — New tokenId (UUID) on every refresh, old tokens immediately invalid
- **httpOnly refresh cookies** — `httpOnly: true`, `sameSite: 'strict'`, `path: '/api/v1/auth'`
- **Separate JWT secrets** — Different secrets for access and refresh tokens
- **Session revocation on password change** — ALL sessions deleted immediately
- **Concurrent session limits** — Max 5 sessions, oldest auto-deleted
- **Account lockout** — 5 failed attempts, 15-minute lockout (configurable)
- **Password history** — Last 5 passwords checked on change

### Authorization
- **Global guards** — JwtAuthGuard + RolesGuard + ThrottlerGuard applied via APP_GUARD
- **@Public() decorator** — Explicit opt-in for public routes (only login, refresh, health)
- **SUPER_ADMIN protection** — Cannot be created/modified by non-SUPER_ADMIN users
- **JWT validated against DB** — Every request checks user exists and is active

### Input Validation
- **Global ValidationPipe** — `whitelist: true` + `forbidNonWhitelisted: true`
- **sortBy whitelist** — `@IsIn(ALLOWED_SORT_FIELDS)` + regex validation prevents column injection
- **Prisma parameterized queries** — All search/filter operations use safe Prisma methods
- **Search field length limits** — `@MaxLength(200)` on all search parameters
- **Pagination max limit** — `@Max(100)` prevents excessive data extraction

### Frontend Security
- **No XSS vectors** — Zero `dangerouslySetInnerHTML` usage in entire codebase
- **No localStorage for tokens** — Access token in memory only, explicitly NOT persisted
- **Silent refresh** — Page reload triggers cookie-based refresh without token exposure
- **Refresh mutex** — Prevents concurrent refresh race conditions
- **No console logging** — No debug output in production frontend code

### Infrastructure
- **Non-root Docker containers** — Both API and Web containers run as dedicated users
- **Helmet middleware** — Default security headers applied to all API responses
- **30-second timeout** — Global request timeout prevents slow DoS
- **Cookie parser** — Properly configured for httpOnly cookie handling

### Data Protection
- **PHI excluded from AI prompts** — HN/VN never sent to AI providers (privacy by design)
- **Sensitive field redaction** — AuditLogInterceptor strips password, apiKey, secret, settingValue
- **API key masking** — Sensitive settings masked in GET responses (middle chars replaced with dots)
- **Backup integrity** — SHA256 checksum verification on restore
- **File size limits** — 10MB for Excel imports, 50MB for backup uploads

### Audit & Monitoring
- **Comprehensive audit logging** — All POST/PATCH/DELETE operations recorded
- **IP address tracking** — Login IP, session IP, audit log IP
- **User agent logging** — For session tracking and anomaly detection
- **CSV export** — Audit logs exportable for compliance review

---

## 6. Remediation Priority Matrix

### Immediate (P0) — Before Production Deployment

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| C-01 | Scrub secrets from git, rotate all credentials | 2-4 hours | Eliminates authentication bypass risk |
| C-02 | Mask PATCH response for sensitive settings | 30 min | Prevents API key leakage |
| C-03 | Redesign validate-key endpoint | 1-2 hours | Eliminates API key transmission risk |
| C-04 | Add sequence name validation in backup module | 1-2 hours | Prevents SQL injection |
| C-05 | Remove hardcoded mock HIS API key | 30 min | Eliminates known credential risk |

### Week 1 (P1)

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| H-01 | Add nginx security headers | 1 hour | Clickjacking, MIME sniffing protection |
| H-02 | Implement TOTP MFA | 2-3 days | Eliminates credential-only attack vector |
| H-03 | Encrypt sensitive settings in DB | 1 day | Protects API keys at rest |
| H-04 | Configure CSP headers | 2-4 hours | Mitigates XSS impact |
| H-05 | Encrypt backup files | 1 day | Protects PHI in backups |
| H-06 | Force password change on temp password | 4 hours | Eliminates weak temp password persistence |
| H-07 | Fix CORS wildcard configuration | 1 hour | Prevents cross-origin attacks |
| H-08 | Strengthen login rate limiting | 2 hours | Reduces credential stuffing risk |
| H-09 | Add session inactivity timeout | 4 hours | Reduces session hijacking window |
| H-10 | Add CSRF token validation (optional) | 4 hours | Defense-in-depth |

### Sprint (P2)

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| M-01 | Add MIME/magic bytes file validation | 2 hours | Prevents malicious file uploads |
| M-02 | Formula injection prevention | 1 hour | Prevents Excel-based attacks |
| M-03 | Validate JWT TTL bounds | 1 hour | Prevents misconfiguration |
| M-04 | Remove PII from JWT payload | 2 hours | Reduces data exposure |
| M-05 | Implement audit log retention | 4 hours | Storage and compliance |
| M-06 | Sanitize HIS API data | 4 hours | Prevents injection via HIS |
| M-07 | Escape ILIKE wildcards | 30 min | Prevents pattern injection |
| M-08 | Decompression bomb protection | 2 hours | Prevents DoS via backup upload |
| M-09 | Secure password delivery | 1 day | Improves password reset security |
| M-10 | Verify DTO numeric bounds | 2 hours | Prevents edge case exploits |
| M-11 | Reduce error detail in production | 2 hours | Reduces information disclosure |
| M-12 | AI prompt retention policy | 2 hours | Privacy compliance |

### Backlog (P3)

| # | Finding | Effort | Impact |
|---|---------|--------|--------|
| L-01 | mustChangePassword mechanism | Covered by H-06 | |
| L-02 | Auth flag cookie SameSite=Strict | 15 min | Minor hardening |
| L-03 | Session anomaly detection | 1 day | Advanced threat detection |
| L-04 | Remove source maps from builds | 30 min | Prevents code exposure |
| L-05 | Encrypt SSOP exports | 4 hours | PHI protection |
| L-06 | Auth on dev Swagger | 1 hour | Prevents reconnaissance |
| L-07 | Container image scanning | 2 hours | Vulnerability detection |
| L-08 | Stronger SSL certificates | 1 hour | Modern crypto standards |

---

## 7. Appendix: Files Reviewed

### API Backend (`apps/api/src/`)
- `main.ts` — Application bootstrap, middleware, security config
- `app.module.ts` — Module registration, global guards
- `modules/auth/` — Auth service, controller, strategies, DTOs
- `modules/users/` — User service, DTOs
- `modules/app-settings/` — Settings service with masking
- `modules/ai/` — AI service, controller, providers
- `modules/backup-restore/` — Backup/restore service, controller
- `modules/protocol-analysis/` — Import service, controller
- `modules/his-integration/` — HIS API client, service
- `modules/ssop-export/` — SSOP export service
- `modules/cancer-patients/` — Patient service
- `modules/dashboard/` — Dashboard service (raw queries)
- `modules/hospitals/` — Hospital service
- `common/guards/` — JWT auth guard, roles guard
- `common/interceptors/` — Audit log, timeout, transform interceptors
- `common/filters/` — HTTP exception filter
- `common/dto/` — Pagination DTO
- `common/decorators/` — Public, Roles, CurrentUser

### Frontend (`apps/web/src/`)
- `stores/auth-store.ts` — Auth state management
- `lib/api-client.ts` — API client with token handling
- `middleware.ts` — Route protection
- `app/` — All page components (checked for XSS vectors)
- `components/` — Shared components (checked for dangerouslySetInnerHTML)

### Infrastructure
- `deploy/nginx/nginx.conf` — Nginx reverse proxy config
- `deploy/deploy.sh` — Production deployment script
- `deploy/build-and-export.sh` — Docker image export
- `deploy/pull-and-run.sh` — Docker image pull and deploy
- `deploy/import-and-run.sh` — Offline deployment
- `docker-compose.yml` — Development compose
- `docker-compose.prod.yml` — Production compose
- `docker-compose.deploy.yml` — Pre-built image deployment
- `apps/api/Dockerfile` — API container
- `apps/web/Dockerfile` — Web container
- `.github/workflows/build-and-push.yml` — CI/CD pipeline

### Configuration
- `.env` — Development environment (committed with secrets)
- `.env.docker` — Docker environment (committed with secrets)
- `.env.production.example` — Production template
- `.gitignore` — Git exclusion rules
- `prisma/schema.prisma` — Database schema
- `prisma/seed.ts` — Seed execution
- `SSO_Mock_Project/server.js` — Mock HIS server

---

*This report was generated by automated security analysis. All findings should be verified manually before implementing remediations. Compliance with local healthcare data protection regulations (Thai PDPA, etc.) should be validated separately by a qualified legal team.*
