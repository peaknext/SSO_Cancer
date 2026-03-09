# Production Server Upgrade Prompt for Claude Code Agent

> **Usage**: Copy the entire content below (from "# Context" to the end) and paste it into Claude Code running on the production server at `C:\sso_cancer`.

---

# Context

You are on a **Windows Server 2022** production server for the SSO Cancer Care system.
Working directory: `C:\sso_cancer`

This is a monorepo with two apps:
- **API**: NestJS 11 (`apps/api/`), runs on port 4000 via PM2
- **Web**: Next.js 15.5.12 (`apps/web/`), runs on port 3000 via PM2
- **Database**: PostgreSQL 16, managed by Prisma 7 ORM
- **Process Manager**: PM2 with `ecosystem.config.js`
- **Reverse Proxy**: nginx on ports 80/443, proxies to localhost:3000 and localhost:4000

All Prisma commands require `--config prisma/prisma.config.ts`. The env file is at `C:\sso_cancer\.env`.

---

# Goal

Complete the production upgrade end-to-end:
1. Fix the Next.js build error (see below)
2. Build both API and Web
3. Run database migration (new migration: `20260305_temporal_aipn_versioning`)
4. Compile Prisma client to CommonJS for runtime
5. Restart PM2 services
6. Verify the system is healthy

---

# Current Build Error

`npm run build --workspace=apps/web` fails every time with:

```
Error occurred prerendering page "/_not-found"
Error [InvariantError]: Invariant: Expected workUnitAsyncStorage to have a store. This is a bug in Next.js.
```

This error occurs during Next.js static prerendering of the `/_not-found` page at build time.
**The same build succeeds on the dev machine** (Windows 11, Node 22.13.0) every time. The problem is specific to this production server.

---

# Fixes Already Applied (all committed and pushed — none solved the problem on production)

1. Moved `next/font/google` imports out of root layout into Providers client component
2. Root layout is now pure HTML — no client imports, no hooks, no providers
3. `not-found.tsx` uses only inline styles (zero dependencies, zero imports)
4. Created `global-error.tsx` with inline styles (zero dependencies)
5. Created `pages/_error.tsx` (Pages Router) with inline styles
6. Moved Providers (ThemeProvider + Toaster) to route group layouts only
7. Added `export const dynamic = 'force-dynamic'` to both `(auth)/layout.tsx` and `(dashboard)/layout.tsx`
8. Pinned Next.js to exactly `15.5.12` (no caret)
9. Added `experimental: { workerThreads: false, cpus: 1 }` to `next.config.ts`
10. Added React/ReactDOM `overrides` in root `package.json`
11. Applied null-safe `pathname`/`searchParams` across all components using `usePathname`/`useSearchParams`

---

# Current State of Key Files

## `apps/web/src/app/layout.tsx` — Root Layout (pure HTML, no client imports)

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSO Cancer Care',
  description: 'Cancer Treatment Protocol Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
```

## `apps/web/src/app/not-found.tsx` — Zero dependencies, inline styles only

```tsx
export default function NotFound() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center',
      justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 700, color: '#0F766E', margin: 0 }}>404</h1>
        <p style={{ fontSize: '1rem', color: '#71717a', marginTop: '0.5rem' }}>Page not found</p>
        <a href="/" style={{ display: 'inline-block', marginTop: '1.5rem', padding: '0.5rem 1.5rem',
          backgroundColor: '#0F766E', color: '#fff', borderRadius: '0.5rem',
          textDecoration: 'none', fontSize: '0.875rem' }}>Home</a>
      </div>
    </div>
  );
}
```

## `apps/web/src/components/providers.tsx` — Client component (used in route group layouts)

```tsx
'use client';
import { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { dmSans, baiJamjuree, jetbrainsMono } from '@/lib/fonts';

const fontVariableClasses = [dmSans.variable, baiJamjuree.variable, jetbrainsMono.variable];

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add(...fontVariableClasses);
    return () => document.documentElement.classList.remove(...fontVariableClasses);
  }, []);
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {children}
      <Toaster position="top-right" richColors toastOptions={{ className: 'font-body' }} />
    </ThemeProvider>
  );
}
```

## `apps/web/next.config.ts`

```ts
import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
  eslint: { ignoreDuringBuilds: true },
  async headers() { /* CSP security headers */ },
  async rewrites() {
    const apiUrl = process.env.API_INTERNAL_URL || 'http://localhost:48002';
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
};
export default nextConfig;
```

## Route Group Layouts (both have `force-dynamic` + Providers)

```tsx
// apps/web/src/app/(auth)/layout.tsx
import { Providers } from '@/components/providers';
export const dynamic = 'force-dynamic';
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}

// apps/web/src/app/(dashboard)/layout.tsx
import { Providers } from '@/components/providers';
import { DashboardShell } from '@/components/layout/dashboard-shell';
export const dynamic = 'force-dynamic';
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <Providers><DashboardShell>{children}</DashboardShell></Providers>;
}
```

## Key Dependencies (`apps/web/package.json`)

```json
"next": "15.5.12",
"react": "^19.1.0",
"react-dom": "^19.1.0",
"zustand": "5.0.10",
"next-themes": "^0.4.6",
"sonner": "^2.0.3",
"tailwindcss": "^4.1.8"
```

## Root `package.json` — React overrides

```json
"overrides": {
  "react": "^19.1.0",
  "react-dom": "^19.1.0"
}
```

---

# Step 1: Diagnose the Root Cause

Run these diagnostic commands **before** attempting any fix:

```powershell
# 1. Check Node.js version (must be 18.18+, recommended 20.x LTS)
node --version

# 2. Check npm version
npm --version

# 3. Check which Next.js version is actually installed
node -e "console.log(require('./node_modules/next/package.json').version)"

# 4. Check for duplicate React instances (run in Git Bash, not PowerShell)
#    In Git Bash:
#    find . -path "*/node_modules/react/package.json" -not -path "*/node_modules/*/node_modules/*" 2>/dev/null | while read f; do echo "$f: $(node -e "console.log(require('./$f').version)")"; done
#
#    Or in PowerShell:
Get-ChildItem -Recurse -Filter "package.json" -Path "node_modules" |
  Where-Object { $_.FullName -match "\\react\\package.json$" -and $_.FullName -notmatch "node_modules.*node_modules.*node_modules" } |
  ForEach-Object { "$($_.FullName): $(node -e "console.log(require('./$($_.FullName.Replace('\','/')  )').version)")" }

# 5. Check if .next cache exists
Test-Path apps\web\.next

# 6. Check disk space
Get-PSDrive C | Select-Object Used, Free
```

**Key things to look for:**
- If Node.js is **not 20.x** (e.g., 18.x or 16.x), upgrade to Node 20 LTS first
- If there are **multiple React versions** (e.g., 19.1.0 AND 19.2.4), that's the problem
- If Next.js version is **not 15.5.12**, the lockfile wasn't used properly
- If `.next` cache exists from a previous failed build, delete it

---

# Step 2: Fix the Build Error

Based on diagnosis, apply the appropriate fix:

## Fix A: Node.js Version Mismatch
If Node.js is not 20.x LTS:
1. Download Node.js 20 LTS from https://nodejs.org/
2. Install (select "Add to PATH")
3. Restart PowerShell
4. Verify: `node --version` shows `v20.x.x`
5. Delete `node_modules` and reinstall:
```powershell
pm2 stop all
Remove-Item -Recurse -Force node_modules, apps\web\node_modules, apps\api\node_modules
Remove-Item -Recurse -Force apps\web\.next
npm install
```

## Fix B: Duplicate React Instances
If multiple React copies are found:
```powershell
pm2 stop all
Remove-Item -Recurse -Force node_modules, apps\web\node_modules, apps\api\node_modules
Remove-Item -Force package-lock.json
npm install
```

## Fix C: Stale Cache / Unknown Cause
```powershell
pm2 stop all
Remove-Item -Recurse -Force node_modules, apps\web\node_modules, apps\api\node_modules
Remove-Item -Recurse -Force apps\web\.next
Remove-Item -Force package-lock.json
npm install
```

## Fix D: Try Build with Debug Output
```powershell
$env:NODE_ENV = "production"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
cd apps\web
npx next build --debug 2>&1 | Tee-Object -FilePath C:\sso_cancer\build-debug.log
cd ..\..
```
Examine `build-debug.log` for the actual unminified stack trace.

## Fix E: Try Removing `globals.css` Import Temporarily
Test if Tailwind v4 CSS processing is the root cause:
```powershell
# Temporarily comment out the CSS import in root layout
# Change: import './globals.css';
# To:     // import './globals.css';
# Then build. If it passes, the issue is in CSS processing.
```

## Fix F: Try a Different Next.js Version
```powershell
# In apps/web/package.json, change "next": "15.5.12" to "next": "15.3.3"
# Then:
Remove-Item -Recurse -Force node_modules, apps\web\node_modules
Remove-Item -Force package-lock.json
npm install
npm run build --workspace=apps/web
```

## Fix G: Minimal Reproduction Test
Strip the app down to find the exact cause:
```powershell
# Temporarily rename all route group folders
Rename-Item apps\web\src\app\(dashboard) apps\web\src\app\_dashboard_bak
Rename-Item apps\web\src\app\(auth) apps\web\src\app\_auth_bak

# Create a minimal page.tsx
# apps/web/src/app/page.tsx should just return <div>Hello</div>

# Try building
npm run build --workspace=apps/web

# If it passes, add back route groups one at a time to isolate the cause
# Restore after testing:
Rename-Item apps\web\src\app\_dashboard_bak apps\web\src\app\(dashboard)
Rename-Item apps\web\src\app\_auth_bak apps\web\src\app\(auth)
```

## Fix H: Try Build Without Standalone Output
```powershell
# In apps/web/next.config.ts, temporarily comment out:
#   output: 'standalone',
# Then build. If it passes, the issue is standalone-specific.
```

---

# Step 3: After Build Succeeds — Complete the Upgrade

Run all commands in PowerShell from `C:\sso_cancer`:

```powershell
cd C:\sso_cancer

# 3.1 Stop services
pm2 stop all

# 3.2 Pull latest code (if not already done)
git pull origin main

# 3.3 Install dependencies
npm install

# 3.4 Generate Prisma client
npx prisma generate --config prisma/prisma.config.ts

# 3.5 Build API
cd apps\api
npm run build
cd ..\..

# 3.6 Build Web
$env:NEXT_PUBLIC_API_URL = ""
$env:API_INTERNAL_URL = "http://localhost:4000"
$env:NEXT_TELEMETRY_DISABLED = "1"
npm run build --workspace=apps/web

# 3.7 Copy static files into standalone (CRITICAL — without this, pages render blank)
Copy-Item -Path "apps\web\.next\static" `
  -Destination "apps\web\.next\standalone\apps\web\.next\static" -Recurse -Force
Copy-Item -Path "apps\web\public" `
  -Destination "apps\web\.next\standalone\apps\web\public" -Recurse -Force

# 3.8 Compile Prisma Client to CommonJS (CRITICAL — Node.js cannot run TypeScript at runtime)
#     Step 1: Create temporary tsconfig
@"
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
"@ | Set-Content -Path "prisma\generated\prisma\client\tsconfig.json" -Encoding UTF8

#     Step 2: Compile TypeScript to JavaScript
Push-Location prisma\generated\prisma\client
npx tsc --project tsconfig.json
Pop-Location

#     Step 3: Copy compiled files back and clean up
Copy-Item -Path "prisma\generated\prisma\client\compiled\*" `
  -Destination "prisma\generated\prisma\client\" -Recurse -Force
Remove-Item -Path "prisma\generated\prisma\client\compiled" -Recurse -Force
Remove-Item -Path "prisma\generated\prisma\client\tsconfig.json" -Force

#     Step 4: Add package.json for CommonJS mode
'{"type":"commonjs"}' | Set-Content -Path "prisma\generated\prisma\client\package.json" -Encoding UTF8

#     Step 5: Fix ESM/CJS compatibility issues in compiled files
Get-ChildItem -Path "prisma\generated\prisma\client" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content) {
        # Replace import.meta.url with CommonJS equivalent
        $content = $content -replace 'import\.meta\.url', '"file://" + __filename'
        # Fix globalThis.__dirname setup
        $content = $content -replace "globalThis\['__dirname'\] = .*fileURLToPath.*", "globalThis['__dirname'] = __dirname;"
        # Fix .ts extension references to .js
        $content = $content -replace '\.ts"', '.js"'
        $content = $content -replace "\.ts'", ".js'"
        Set-Content -Path $_.FullName -Value $content -NoNewline -Encoding UTF8
    }
}

#     Step 6: Remove TypeScript source files (keep only compiled JS)
Get-ChildItem -Path "prisma\generated\prisma\client" -Filter "*.ts" -Recurse | Remove-Item -Force

# 3.9 Pre-compile seed.ts
npx tsc prisma/seed.ts `
    --outDir prisma/ `
    --target ES2020 `
    --module commonjs `
    --moduleResolution node `
    --esModuleInterop `
    --skipLibCheck `
    --resolveJsonModule

# 3.10 Copy Prisma artifacts to API dist folder
Copy-Item -Path "prisma\generated" `
  -Destination "apps\api\dist\prisma\generated" -Recurse -Force
Copy-Item -Path "prisma\prisma.config.ts" -Destination "apps\api\dist\prisma\" -Force
Copy-Item -Path "prisma\schema.prisma" -Destination "apps\api\dist\prisma\" -Force
Copy-Item -Path "prisma\migrations" `
  -Destination "apps\api\dist\prisma\migrations" -Recurse -Force

# 3.11 Run database migration (includes new: 20260305_temporal_aipn_versioning)
npx prisma migrate deploy --config prisma/prisma.config.ts

# 3.12 Run seed (safe — uses ON CONFLICT DO NOTHING)
node prisma/seed.js

# 3.13 Start services
pm2 restart all

# 3.14 Wait and verify health
Start-Sleep -Seconds 10
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing
```

---

# Step 4: Verification Checklist

After all services are running:

```powershell
# Check PM2 status — both should show "online"
pm2 status

# Check API health
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing

# Check Web is serving pages
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -MaximumRedirection 0

# Check nginx proxy (HTTPS, skip cert check for self-signed)
Invoke-WebRequest -Uri https://localhost/api/v1/health -SkipCertificateCheck -UseBasicParsing

# Check PM2 logs for errors
pm2 logs --lines 20
```

If everything is healthy, open a browser and navigate to `https://<server-ip>`:
- Login: `admin@sso-cancer.local` / `Admin@1234`
- Verify dashboard loads with charts
- Navigate to Settings > AIPN Catalog to verify the new temporal versioning feature

---

# Reference: Important Paths and Commands

| Item | Path / Command |
|------|---------------|
| Project root | `C:\sso_cancer` |
| Environment file | `C:\sso_cancer\.env` |
| PM2 ecosystem | `C:\sso_cancer\ecosystem.config.js` |
| API dist | `C:\sso_cancer\apps\api\dist\` |
| API runtime script | `dist\apps\api\src\main.js` (cwd: `apps\api`) |
| Web standalone | `apps\web\.next\standalone\apps\web\server.js` |
| Prisma schema | `prisma\schema.prisma` |
| Prisma config | `prisma\prisma.config.ts` |
| Prisma migrations | `prisma\migrations\` |
| Logs | `C:\sso_cancer\logs\` |
| nginx config | `C:\nginx\conf\nginx.conf` |
| SSL certs | `C:\nginx\ssl\` |

| Command | Description |
|---------|-------------|
| `pm2 stop all` | Stop all services |
| `pm2 restart all` | Restart all services |
| `pm2 status` | Check service status |
| `pm2 logs` | View real-time logs |
| `pm2 logs sso-cancer-api` | API logs only |
| `pm2 logs sso-cancer-web` | Web logs only |
| `pm2 save` | Save PM2 state for auto-start on reboot |
| `npx prisma generate --config prisma/prisma.config.ts` | Regenerate Prisma client |
| `npx prisma migrate deploy --config prisma/prisma.config.ts` | Apply pending migrations |
| `npx prisma studio --config prisma/prisma.config.ts` | Open database GUI |

---

# Warnings and Gotchas

1. **CRITICAL — Windows path casing**: The working directory casing MUST match the actual folder name on disk. If the folder is `C:\SSO_Cancer`, you must `cd C:\SSO_Cancer` — NOT `cd C:\sso_cancer`. Windows is case-insensitive for file access, but **Webpack treats different casings as different modules**, causing React to load twice and breaking `AsyncLocalStorage`. Verify with: `Get-Item C:\sso_cancer | Select-Object FullName` to see the real disk casing. This was the root cause of the `/_not-found` prerender error on production.
2. **PowerShell syntax**: Use `Remove-Item -Recurse -Force` not `rmdir /s /q` (that's cmd.exe)
2. **PM2 file locks**: PM2 locks `bcrypt.node` — always run `pm2 stop all` before deleting `node_modules`
3. **Standalone output**: Next.js standalone does NOT include static files — you MUST copy them manually (Step 3.7)
4. **Prisma 7 generates TypeScript**: Node.js runtime cannot execute TypeScript — you MUST compile to CommonJS (Step 3.8)
5. **NestJS ConfigModule**: Reads `.env` from `../../.env` relative to cwd — PM2 cwd must be `apps\api\`
6. **env file**: Production uses `C:\sso_cancer\.env` (NOT `.env.docker`)
7. **package-lock.json**: Was deleted during previous troubleshooting — `npm install` will create a fresh one
8. **CORS_ORIGIN**: Must NOT be `*` in production — API exits on startup if it is
9. **Default admin**: `admin@sso-cancer.local` / `Admin@1234`
10. **New migration**: `20260305_temporal_aipn_versioning` changes `sso_aipn_items` unique constraint from `code` to `(code, date_effective)`
