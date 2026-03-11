# คู่มือ Deploy บน Windows Server 2022 — ไม่ใช้ Docker (Native)

คู่มือนี้อธิบายขั้นตอนการ deploy ระบบ SSO Cancer Care บน **Windows Server 2022 โดยตรง** โดยไม่ใช้ Docker — ติดตั้ง Node.js, PostgreSQL, nginx, PM2 บน host

> **หมายเหตุ**: ถ้าต้องการ deploy ด้วย Docker ให้ดูไฟล์ [DEPLOYMENT.md](DEPLOYMENT.md) แทน

---

## สารบัญ

1. [สถาปัตยกรรมระบบ](#1-สถาปัตยกรรมระบบ)
2. [ข้อกำหนดเบื้องต้น](#2-ข้อกำหนดเบื้องต้น)
3. [ติดตั้ง Prerequisites](#3-ติดตั้ง-prerequisites)
4. [เตรียม Source Code & Environment](#4-เตรียม-source-code--environment)
5. [Build](#5-build)
6. [Database Migration & Seed](#6-database-migration--seed)
7. [ตั้งค่า nginx for Windows](#7-ตั้งค่า-nginx-for-windows)
8. [ตั้งค่า PM2 (Process Manager)](#8-ตั้งค่า-pm2-process-manager)
9. [Windows Firewall](#9-windows-firewall)
10. [ทดสอบระบบ](#10-ทดสอบระบบ)
11. [การอัปเดตเวอร์ชัน](#11-การอัปเดตเวอร์ชัน)
12. [คำสั่งดูแลระบบ](#12-คำสั่งดูแลระบบ)
13. [Troubleshooting](#13-troubleshooting)
14. [Quick Reference](#14-quick-reference)

---

## 1. สถาปัตยกรรมระบบ

ระบบทำงานบน Windows Server โดยตรง ไม่มี container:

```
┌─── Windows Server 2022 ──────────────────────────────────────┐
│                                                               │
│   ┌─ nginx (reverse proxy) ───────────────────────────────┐  │
│   │  port 80  → redirect ไป 443                          │  │
│   │  port 443 → SSL/TLS + HTTP/2                         │  │
│   │  /api/*   → proxy ไป 127.0.0.1:4000                  │  │
│   │  /*       → proxy ไป 127.0.0.1:3000                  │  │
│   └───────────────────────────────────────────────────────┘  │
│        │                              │                       │
│   ┌─ NestJS API ──────────┐   ┌─ Next.js Frontend ───────┐  │
│   │ node dist/.../main.js  │   │ node server.js           │  │
│   │ port 4000 (localhost)  │   │ port 3000 (localhost)    │  │
│   │ จัดการโดย PM2          │   │ จัดการโดย PM2            │  │
│   └────────┬───────────────┘   └──────────────────────────┘  │
│            │                                                  │
│   ┌─ PostgreSQL 16 ───────────────┐                          │
│   │ port 5432 (localhost)          │                          │
│   │ Windows Service (auto-start)   │                          │
│   └────────────────────────────────┘                          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

ผู้ใช้เข้าถึงผ่าน `https://192.168.1.100` (หรือ hostname ของ server)

---

## 2. ข้อกำหนดเบื้องต้น

| รายการ | ข้อกำหนด |
|--------|---------|
| OS | Windows Server 2022 (64-bit) |
| RAM | 4 GB ขึ้นไป (แนะนำ 8 GB) |
| พื้นที่ว่าง | 5 GB ขึ้นไป |
| Node.js | 20.x LTS ขึ้นไป (ทดสอบถึง v24) |
| PostgreSQL | 16 ขึ้นไป |
| nginx | 1.24+ (Windows build) |
| Git | 2.39+ |
| Port ว่าง | 80, 443, 3000, 4000, 5432 |

---

## 3. ติดตั้ง Prerequisites

### 3.1 Node.js 20 LTS

1. ดาวน์โหลด **Node.js 20 LTS** (Windows Installer .msi) จาก https://nodejs.org/
2. รันตัวติดตั้ง — เลือก **Add to PATH** (ค่าเริ่มต้น)
3. **Restart PowerShell** แล้วตรวจสอบ:

```powershell
node --version     # v20.x.x
npm --version      # 10.x.x
```

### 3.2 PostgreSQL (16 ขึ้นไป)

1. ดาวน์โหลด **PostgreSQL 16 ขึ้นไป** จาก https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
2. รันตัวติดตั้ง:
   - **Password**: ตั้งรหัสผ่านสำหรับ user `postgres` (จดไว้ — ใช้ใน `DATABASE_URL`)
   - **Port**: 5432 (ค่าเริ่มต้น)
   - **Locale**: Thai, Thailand หรือ Default
3. ตรวจสอบ service ทำงาน:

```powershell
Get-Service postgresql*
# Status: Running
```

4. สร้าง database:

```powershell
# เปิด psql (อยู่ใน C:\Program Files\PostgreSQL\{version}\bin\)
& "C:\Program Files\PostgreSQL\{version}\bin\psql.exe" -U postgres

# ใน psql:
CREATE DATABASE sso_cancer;
\q
```

> **Tip**: เพิ่ม PostgreSQL bin ใน PATH เพื่อความสะดวก:
> ```powershell
> [System.Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\PostgreSQL\16\bin", "Machine")
> ```

### 3.3 Git

1. ดาวน์โหลด **Git for Windows** จาก https://git-scm.com/download/win
2. รันตัวติดตั้ง — เลือก **Git from the command line and also from 3rd-party software**
3. ตั้งค่า line endings:

```powershell
git config --global core.autocrlf input
```

### 3.4 nginx for Windows

1. ดาวน์โหลด **nginx/Windows** (Stable version) จาก https://nginx.org/en/download.html
2. แตกไฟล์ไปที่ `C:\nginx\`
3. ตรวจสอบ:

```powershell
C:\nginx\nginx.exe -v
# nginx version: nginx/1.2x.x
```

> **หมายเหตุ**: nginx for Windows ไม่ได้ติดตั้งเป็น Windows Service อัตโนมัติ — ดูหัวข้อ 7 สำหรับการตั้งค่า

### 3.5 PM2

```powershell
npm install -g pm2
pm2 --version    # 5.x.x
```

#### ติดตั้ง pm2-installer (ให้ PM2 รันเป็น Windows Service)

```powershell
# ดาวน์โหลด pm2-installer
npm install -g pm2-windows-service

# ติดตั้งเป็น Windows Service
pm2-service-install

# เมื่อถูกถามว่า "Perform environment setup?" ให้ตอบ Y
# ตั้ง PM2_HOME เป็น C:\Users\<username>\.pm2 (ค่าเริ่มต้น)
```

> **ผลลัพธ์**: PM2 จะรันอัตโนมัติเมื่อ Windows เริ่มต้น และ restart app ให้เมื่อ crash

### 3.6 OpenSSL (สำหรับสร้าง SSL certificate)

Git for Windows มี OpenSSL มาด้วยแล้ว ตรวจสอบ:

```powershell
# ใช้ Git Bash หรือเรียกผ่าน path
& "C:\Program Files\Git\usr\bin\openssl.exe" version
```

หรือถ้าต้องการ OpenSSL แยก ดาวน์โหลดจาก https://slproweb.com/products/Win32OpenSSL.html

---

## 4. เตรียม Source Code & Environment

### 4.1 Clone Repository

```powershell
cd C:\
git clone https://github.com/peaknext/SSO_Cancer.git
cd SSO_Cancer
```

### 4.2 ติดตั้ง Dependencies

```powershell
npm install
```

### 4.3 ตั้งค่า Environment Variables

> **สำคัญมาก**: ต้องสร้างไฟล์ `.env` **ก่อน build และก่อนรัน** — API ต้องการ `.env` ตั้งแต่ตอน startup (JWT_SECRET, DATABASE_URL ฯลฯ)

#### สร้างไฟล์ `.env`

```powershell
Copy-Item .env.example .env
notepad .env
```

#### ค่าที่ต้องตั้ง

```ini
# ─── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/sso_cancer?schema=public

# ─── JWT Secrets (สร้างด้วย: openssl rand -hex 32) ─────────────
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>

# ─── Application ───────────────────────────────────────────────
NODE_ENV=production
PORT=4000
CORS_ORIGIN=https://192.168.1.100

# ─── Security ──────────────────────────────────────────────────
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_SECONDS=900
MAX_CONCURRENT_SESSIONS=5
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
PASSWORD_HISTORY_COUNT=5
SESSION_INACTIVITY_TIMEOUT=1800

# ─── Encryption (สร้างด้วย: openssl rand -hex 32) ──────────────
SETTINGS_ENCRYPTION_KEY=<64-char-hex>
BACKUP_ENCRYPTION_KEY=<64-char-hex>
```

> **`PORT`**: ใช้ `PORT=4000` (ไม่ใช่ `API_PORT`) — production API อ่านจาก `PORT` ก่อน, `API_PORT` เป็น fallback สำหรับ dev เท่านั้น
>
> **`CORS_ORIGIN`**: เปลี่ยนเป็น URL ของ server (เช่น `https://192.168.1.100` หรือ `https://sso-cancer.hospital.local`) — ห้ามใช้ `*` (wildcard)

#### สร้าง Secrets

เปิด **Git Bash** แล้วรัน:

```bash
openssl rand -hex 32    # → JWT_SECRET
openssl rand -hex 32    # → JWT_REFRESH_SECRET
openssl rand -hex 32    # → SETTINGS_ENCRYPTION_KEY
openssl rand -hex 32    # → BACKUP_ENCRYPTION_KEY
```

> **สำคัญ**: ค่าทุกตัวต้องเป็น hex string 64 ตัวอักษร (256 bits)

หรือรัน PowerShell ได้โดยตรง:

```powershell
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Minimum 0 -Maximum 256) })
```

### 4.4 Generate Prisma Client

> **สำคัญ**: ถ้าเคย deploy มาก่อน โฟลเดอร์ `prisma/generated/prisma/client/` จะมี compiled CJS files ค้างอยู่ (`.js`, `package.json` ฯลฯ) ซึ่งทำให้ `prisma generate` ปฏิเสธเพราะมองว่าไม่ใช่ generated client ที่ถูกต้อง — **ต้องลบทิ้งก่อน**:
>
> ```powershell
> Remove-Item -Recurse -Force prisma\generated\prisma\client -ErrorAction SilentlyContinue
> ```

```powershell
npx prisma generate --config prisma/prisma.config.ts
```

---

## 5. Build

### 5.1 Build API (NestJS)

> **สำคัญ**: ต้อง build API **ก่อน** compile Prisma เป็น CJS เพราะ NestJS build ต้องการไฟล์ `.ts` ของ Prisma client สำหรับ type checking

```powershell
cd apps\api
npm run build
cd ..\..
```

ผลลัพธ์: compiled output ใน `apps/api/dist/`

### 5.2 Build Web (Next.js)

> **คำเตือน (Path Casing)**: ต้อง `cd C:\SSO_Cancer` (ตัวพิมพ์ใหญ่ตรงกับชื่อโฟลเดอร์จริงบน disk) ก่อน build — ถ้า cwd เป็น `C:\sso_cancer` (ตัวเล็ก) Webpack จะ load React 2 ครั้งผ่าน 2 paths ทำให้ build ล้มเหลว (`workUnitAsyncStorage` error). ดูรายละเอียดใน [Troubleshooting section 13](#next-js-build-ล้มเหลว-workunitasyncstorage-error)

```powershell
# ลบ .next cache เก่า (ป้องกัน webpack module errors จาก stale cache)
Remove-Item -Recurse -Force apps\web\.next -ErrorAction SilentlyContinue

# ตั้ง environment variables สำหรับ build
$env:NEXT_PUBLIC_API_URL = ""
$env:API_INTERNAL_URL = "http://localhost:4000"
$env:NEXT_TELEMETRY_DISABLED = "1"

cd apps\web
npm run build
cd ..\..
```

ผลลัพธ์: standalone output ใน `apps/web/.next/standalone/`

#### คัดลอก static files เข้า standalone (สำคัญ)

Next.js standalone output **ไม่รวม** static files และ public folder — ต้อง copy เข้าไปเอง:

```powershell
# Static files (CSS, JS chunks)
Copy-Item -Path "apps\web\.next\static" -Destination "apps\web\.next\standalone\apps\web\.next\static" -Recurse -Force

# Public folder (favicon, locales, images)
Copy-Item -Path "apps\web\public" -Destination "apps\web\.next\standalone\apps\web\public" -Recurse -Force
```

> **ถ้าไม่ทำขั้นตอนนี้**: หน้าเว็บจะโหลดเป็นหน้าขาว — CSS/JS ทั้งหมดจะ 404

### 5.3 Compile Prisma Client เป็น CommonJS (สำคัญมาก)

> **ทำไมต้องทำ**: Prisma 7 generate เป็น TypeScript files ที่ **runtime (Node.js)** อ่านไม่ได้ — ต้อง compile เป็น CommonJS ก่อนรัน production
>
> **ทำไมต้องทำหลัง build**: ขั้นตอนนี้จะลบไฟล์ `.ts` ทิ้ง ถ้าทำก่อน build จะทำให้ NestJS build ไม่มี types ใช้

#### ขั้นตอนที่ 1: สร้าง tsconfig ชั่วคราว

```powershell
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
```

#### ขั้นตอนที่ 2: Compile TypeScript

```powershell
Push-Location prisma\generated\prisma\client
npx tsc --project tsconfig.json
Pop-Location
```

#### ขั้นตอนที่ 3: คัดลอก compiled files กลับ

```powershell
Copy-Item -Path "prisma\generated\prisma\client\compiled\*" -Destination "prisma\generated\prisma\client\" -Recurse -Force
Remove-Item -Path "prisma\generated\prisma\client\compiled" -Recurse -Force
Remove-Item -Path "prisma\generated\prisma\client\tsconfig.json" -Force
```

#### ขั้นตอนที่ 4: เพิ่ม package.json สำหรับ CommonJS mode

```powershell
'{"type":"commonjs"}' | Set-Content -Path "prisma\generated\prisma\client\package.json" -Encoding UTF8
```

#### ขั้นตอนที่ 5: แก้ไข ESM/CJS issues ใน compiled files

```powershell
# แก้ไขทุกไฟล์ .js ใน prisma\generated\prisma\client\
Get-ChildItem -Path "prisma\generated\prisma\client" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content) {
        # 1. แทนที่ import.meta.url ด้วย CommonJS equivalent
        $content = $content -replace 'import\.meta\.url', '"file://" + __filename'

        # 2. แก้ globalThis.__dirname setup
        $content = $content -replace "globalThis\['__dirname'\] = .*fileURLToPath.*", "globalThis['__dirname'] = __dirname;"

        # 3. แก้ .ts extension เป็น .js
        $content = $content -replace '\.ts"', '.js"'
        $content = $content -replace "\.ts'", ".js'"

        Set-Content -Path $_.FullName -Value $content -NoNewline -Encoding UTF8
    }
}
```

#### ขั้นตอนที่ 6: ลบ TypeScript files (เก็บเฉพาะ JS)

```powershell
Get-ChildItem -Path "prisma\generated\prisma\client" -Filter "*.ts" -Recurse | Remove-Item -Force
```

### 5.4 Pre-compile Seed

```powershell
npx tsc prisma/seed.ts `
    --outDir prisma/ `
    --target ES2020 `
    --module commonjs `
    --moduleResolution node `
    --esModuleInterop `
    --skipLibCheck `
    --resolveJsonModule
```

ผลลัพธ์: ได้ไฟล์ `prisma/seed.js`

### 5.5 คัดลอก Prisma artifacts ไป dist

NestJS runtime ต้องการ Prisma client compiled (CJS) อยู่ใน `dist/prisma/generated/`:

```powershell
# คัดลอก prisma generated (compiled CJS) ไปที่ dist
Copy-Item -Path "prisma\generated" -Destination "apps\api\dist\prisma\generated" -Recurse -Force

# คัดลอก prisma config, schema, migrations, seed.js สำหรับ deploy commands
Copy-Item -Path "prisma\prisma.config.ts" -Destination "apps\api\dist\prisma\" -Force
Copy-Item -Path "prisma\schema.prisma" -Destination "apps\api\dist\prisma\" -Force
Copy-Item -Path "prisma\migrations" -Destination "apps\api\dist\prisma\migrations" -Recurse -Force
```

> **หมายเหตุ**: ขั้นตอนนี้จำลองสิ่งที่ Dockerfile ทำในบรรทัด 110-125

---

## 6. Database Migration & Seed

### 6.1 รัน Migration

```powershell
cd C:\SSO_Cancer
npx prisma migrate deploy --config prisma/prisma.config.ts
```

ผลลัพธ์:

```
Prisma schema loaded from prisma/schema.prisma
xx migrations found in prisma/migrations
xx migrations applied successfully
```

### 6.2 รัน Seed

```powershell
node prisma/seed.js
```

ผลลัพธ์: seed 17 SQL files (~1,700 rows ข้อมูลพื้นฐาน)

> SQL seed ใช้ `ON CONFLICT DO NOTHING` จึงรันซ้ำได้อย่างปลอดภัย

### 6.3 ตรวจสอบ

```powershell
& "C:\Program Files\PostgreSQL\{version}\bin\psql.exe" -U postgres -d sso_cancer -c "SELECT count(*) FROM drugs;"
# ควรได้ค่าประมาณ 98
```

---

## 7. ตั้งค่า nginx for Windows

### 7.1 สร้าง SSL Certificate

#### กรณีมี certificate จริงจากโรงพยาบาล (แนะนำ)

```powershell
mkdir C:\nginx\ssl
Copy-Item C:\path\to\hospital-cert.pem C:\nginx\ssl\cert.pem
Copy-Item C:\path\to\hospital-key.pem C:\nginx\ssl\key.pem
```

#### กรณีใช้ self-signed certificate (สำหรับทดสอบ)

เปิด **Git Bash**:

```bash
mkdir -p /c/nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout /c/nginx/ssl/key.pem \
  -out /c/nginx/ssl/cert.pem \
  -subj '//CN=sso-cancer.hospital.local'
```

### 7.2 เปลี่ยน SSL Certificate (Renewal)

เมื่อได้ SSL certificate ใหม่ (เช่น cert หมดอายุ หรือได้ cert จริงจาก CA มาแทน self-signed):

#### ขั้นตอนที่ 1: วางไฟล์ certificate ใหม่

```powershell
# วางทับไฟล์เดิม (ชื่อต้องเป็น cert.pem และ key.pem)
Copy-Item C:\path\to\new-certificate.pem C:\nginx\ssl\cert.pem -Force
Copy-Item C:\path\to\new-private-key.pem C:\nginx\ssl\key.pem -Force
```

**กรณีได้ cert มาหลายไฟล์** (cert + intermediate CA / chain):

เปิด **Git Bash**:

```bash
# รวม cert + chain เป็นไฟล์เดียว (cert ของเราต้องอยู่บนสุด)
cat your-cert.pem intermediate-ca.pem > /c/nginx/ssl/cert.pem
cp your-private-key.pem /c/nginx/ssl/key.pem
```

> **สำคัญ**: ลำดับในไฟล์ cert.pem ต้องเป็น: (1) Server certificate → (2) Intermediate CA → (3) Root CA (ถ้ามี)

#### ขั้นตอนที่ 2: ตรวจสอบ certificate

เปิด **Git Bash**:

```bash
# ดูข้อมูล cert (ชื่อ, ผู้ออก, วันหมดอายุ)
openssl x509 -in /c/nginx/ssl/cert.pem -noout -subject -issuer -dates

# ตรวจว่า key กับ cert ตรงกัน (ค่า modulus ต้องเหมือนกัน)
openssl x509 -in /c/nginx/ssl/cert.pem -noout -modulus | md5sum
openssl rsa  -in /c/nginx/ssl/key.pem  -noout -modulus | md5sum
```

> ถ้า md5sum ของทั้งสองไม่ตรงกัน แสดงว่า key ไม่ใช่คู่กับ cert นี้ — ต้องขอ key ที่ถูกต้อง

หรือใช้ **PowerShell** (ถ้า OpenSSL อยู่ใน PATH):

```powershell
& "C:\Program Files\Git\usr\bin\openssl.exe" x509 -in C:\nginx\ssl\cert.pem -noout -subject -issuer -dates
```

#### ขั้นตอนที่ 3: Reload nginx

```powershell
# Reload config (ไม่ต้อง restart — ไม่มี downtime)
C:\nginx\nginx.exe -s reload

# หรือถ้าใช้ NSSM:
C:\nginx\nssm.exe restart nginx
```

ตรวจสอบ cert ใหม่ทำงาน:

```powershell
# ดู cert ที่ server ใช้จริง (SkipCertificateCheck สำหรับ self-signed)
Invoke-WebRequest -Uri https://localhost/api/v1/health -SkipCertificateCheck -UseBasicParsing | Select-Object StatusCode
```

หรือใน **Git Bash**:

```bash
echo | openssl s_client -connect localhost:443 -servername localhost 2>/dev/null | openssl x509 -noout -dates
```

> **ไม่ต้องแก้ nginx.conf** — ชื่อไฟล์เดิม (`cert.pem` / `key.pem`) แค่ reload nginx ก็เพียงพอ

### 7.3 ตั้งค่า nginx.conf

แก้ไขไฟล์ `C:\nginx\conf\nginx.conf` ให้มีเนื้อหาดังนี้:

```nginx
worker_processes  1;

events {
    worker_connections  1024;
}

http {
    include       mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout  65;

    upstream api_backend {
        server 127.0.0.1:4000;
    }

    upstream web_frontend {
        server 127.0.0.1:3000;
    }

    # HTTP -> HTTPS redirect
    server {
        listen 80;
        server_name _;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl;
        http2 on;
        server_name _;

        ssl_certificate     C:/nginx/ssl/cert.pem;
        ssl_certificate_key C:/nginx/ssl/key.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers on;

        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 1d;
        ssl_session_tickets off;

        server_tokens off;
        client_max_body_size 50M;

        # Security Headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-XSS-Protection "0" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

        # API routes -> NestJS
        location /api/ {
            proxy_pass http://api_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
        }

        # Everything else -> Next.js
        location / {
            proxy_pass http://web_frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 7.4 ทดสอบ config

```powershell
C:\nginx\nginx.exe -t
# nginx: configuration file C:\nginx\conf\nginx.conf test is successful
```

### 7.5 เริ่ม nginx

```powershell
cd C:\nginx
Start-Process nginx.exe
```

### 7.6 ตั้ง nginx เป็น Windows Service (แนะนำ)

ใช้ **NSSM** (Non-Sucking Service Manager) เพื่อให้ nginx auto-start:

1. ดาวน์โหลด NSSM จาก https://nssm.cc/download
2. แตกไฟล์ `nssm.exe` ไปที่ `C:\nginx\`

```powershell
# ติดตั้ง nginx เป็น Windows Service
C:\nginx\nssm.exe install nginx "C:\nginx\nginx.exe"
C:\nginx\nssm.exe set nginx AppDirectory "C:\nginx"

# เริ่ม service
C:\nginx\nssm.exe start nginx
```

### 7.7 คำสั่งจัดการ nginx

```powershell
# Reload config (ไม่ต้อง restart)
C:\nginx\nginx.exe -s reload

# หยุด nginx
C:\nginx\nginx.exe -s stop

# ถ้าใช้ NSSM:
C:\nginx\nssm.exe restart nginx
C:\nginx\nssm.exe stop nginx
C:\nginx\nssm.exe start nginx
```

---

## 8. ตั้งค่า PM2 (Process Manager)

### 8.1 สร้าง ecosystem.config.js

สร้างไฟล์ `C:\SSO_Cancer\ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'sso-cancer-api',
      script: 'dist/apps/api/src/main.js',
      cwd: 'C:\\SSO_Cancer\\apps\\api',
      // cwd ต้องเป็น apps/api เพราะ NestJS ConfigModule ใช้ envFilePath: '../../.env'
      // ซึ่ง resolve สัมพัทธ์กับ cwd → ../../ จาก apps/api/ = C:\SSO_Cancer\.env ✓
      env: {
        NODE_ENV: 'production',
        PORT: '4000',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'C:\\SSO_Cancer\\logs\\api-error.log',
      out_file: 'C:\\SSO_Cancer\\logs\\api-out.log',
      merge_logs: true,
    },
    {
      name: 'sso-cancer-web',
      script: 'apps/web/.next/standalone/apps/web/server.js',
      cwd: 'C:\\SSO_Cancer',
      env: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'C:\\SSO_Cancer\\logs\\web-error.log',
      out_file: 'C:\\SSO_Cancer\\logs\\web-out.log',
      merge_logs: true,
    },
  ],
};
```

### 8.2 สร้าง logs directory

```powershell
mkdir C:\SSO_Cancer\logs
```

### 8.3 เริ่ม Services

```powershell
cd C:\SSO_Cancer

# เริ่มทั้ง API และ Web
pm2 start ecosystem.config.js

# ตรวจสถานะ
pm2 status
```

ผลลัพธ์ที่คาดหวัง:

```
┌─────────────────┬────┬─────────┬──────┬──────┬────────┐
│ App name         │ id │ mode    │ pid  │ status │ restart │
├─────────────────┼────┼─────────┼──────┼──────┼────────┤
│ sso-cancer-api   │ 0  │ cluster │ 1234 │ online │ 0      │
│ sso-cancer-web   │ 1  │ cluster │ 5678 │ online │ 0      │
└─────────────────┴────┴─────────┴──────┴──────┴────────┘
```

### 8.4 บันทึก PM2 state (สำหรับ auto-start)

```powershell
pm2 save
```

> **สำคัญ**: หลัง `pm2 save` ถ้าติดตั้ง `pm2-windows-service` ไว้แล้ว PM2 จะ start apps อัตโนมัติเมื่อ Windows restart

### 8.5 คำสั่ง PM2 ที่ใช้บ่อย

```powershell
# ดู logs (real-time)
pm2 logs

# ดู logs เฉพาะ API
pm2 logs sso-cancer-api

# Restart ทั้งหมด
pm2 restart all

# Restart เฉพาะ API
pm2 restart sso-cancer-api

# หยุดทั้งหมด
pm2 stop all

# ดู resource usage
pm2 monit
```

---

## 9. Windows Firewall

เปิด **PowerShell** ด้วยสิทธิ์ **Administrator**:

```powershell
# เปิด port 80 (HTTP)
New-NetFirewallRule -DisplayName "SSO Cancer HTTP" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow

# เปิด port 443 (HTTPS)
New-NetFirewallRule -DisplayName "SSO Cancer HTTPS" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow
```

> **หมายเหตุ**: ไม่ต้องเปิด port 3000, 4000, 5432 เพราะเข้าถึงผ่าน nginx เท่านั้น (localhost only)

---

## 10. ทดสอบระบบ

### 10.1 ตรวจ Health Check

```powershell
# ตรวจ API โดยตรง
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing | Select-Object StatusCode

# ตรวจผ่าน nginx (HTTPS, skip cert check สำหรับ self-signed)
Invoke-WebRequest -Uri https://localhost/api/v1/health -SkipCertificateCheck -UseBasicParsing | Select-Object StatusCode
```

### 10.2 เข้าใช้งานผ่าน Browser

1. เปิด browser → ไปที่ `https://192.168.1.100` (หรือ hostname ของ server)
2. ถ้าใช้ self-signed cert จะเห็นหน้าเตือน → กด **Advanced** → **Proceed**
3. เข้าสู่ระบบด้วย:
   - **Email**: `admin@sso-cancer.local`
   - **Password**: `Admin@1234`
4. **เปลี่ยนรหัสผ่านทันที** — ระบบมี `mustChangePassword` flag บังคับให้เปลี่ยน

---

## 11. การอัปเดตเวอร์ชัน

### ขั้นตอนอัปเดต

```powershell
cd C:\SSO_Cancer

# ──── 1. หยุด services ────
pm2 stop all

# ──── 2. ดึง code ใหม่ ────
git pull origin main

# ──── 3. ติดตั้ง dependencies ────
npm install

# ──── 4. Generate Prisma client ────
# ⚠ ต้องลบ generated client เก่าก่อน (มี compiled CJS ค้างจาก deploy ก่อนหน้า)
Remove-Item -Recurse -Force prisma\generated\prisma\client -ErrorAction SilentlyContinue
npx prisma generate --config prisma/prisma.config.ts

# ──── 5. Build API ────
cd apps\api
npm run build
cd ..\..

# ──── 6. Build Web ────
# ⚠ ตรวจสอบว่า cwd ตรงกับ disk casing: ต้องเป็น C:\SSO_Cancer (ตัวพิมพ์ใหญ่)
#   ถ้าผิด จะเกิด workUnitAsyncStorage error เพราะ Webpack load React 2 ครั้ง
Remove-Item -Recurse -Force apps\web\.next -ErrorAction SilentlyContinue
$env:NEXT_PUBLIC_API_URL = ""
$env:API_INTERNAL_URL = "http://localhost:4000"
$env:NEXT_TELEMETRY_DISABLED = "1"
npm run build --workspace=apps/web

# ──── 7. คัดลอก static files เข้า standalone ────
Copy-Item -Path "apps\web\.next\static" `
  -Destination "apps\web\.next\standalone\apps\web\.next\static" -Recurse -Force
Copy-Item -Path "apps\web\public" `
  -Destination "apps\web\.next\standalone\apps\web\public" -Recurse -Force

# ──── 8. Compile Prisma Client เป็น CJS ────
# 8a. สร้าง tsconfig ชั่วคราว
@"
{
  "compilerOptions": {
    "target": "ES2022", "module": "commonjs", "lib": ["ES2022"],
    "moduleResolution": "node", "esModuleInterop": true,
    "strict": false, "skipLibCheck": true, "declaration": false,
    "outDir": "./compiled", "rootDir": "."
  },
  "include": ["./**/*.ts"], "exclude": ["node_modules", "compiled"]
}
"@ | Set-Content -Path "prisma\generated\prisma\client\tsconfig.json" -Encoding UTF8

# 8b. Compile
Push-Location prisma\generated\prisma\client
npx tsc --project tsconfig.json
Pop-Location

# 8c. คัดลอก compiled files กลับ + ลบ temp
Copy-Item -Path "prisma\generated\prisma\client\compiled\*" `
  -Destination "prisma\generated\prisma\client\" -Recurse -Force
Remove-Item -Path "prisma\generated\prisma\client\compiled" -Recurse -Force
Remove-Item -Path "prisma\generated\prisma\client\tsconfig.json" -Force

# 8d. เพิ่ม package.json สำหรับ CommonJS
'{"type":"commonjs"}' | Set-Content -Path "prisma\generated\prisma\client\package.json" -Encoding UTF8

# 8e. แก้ ESM/CJS compatibility
Get-ChildItem -Path "prisma\generated\prisma\client" -Filter "*.js" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content) {
        $content = $content -replace 'import\.meta\.url', '"file://" + __filename'
        $content = $content -replace "globalThis\['__dirname'\] = .*fileURLToPath.*", "globalThis['__dirname'] = __dirname;"
        $content = $content -replace '\.ts"', '.js"'
        $content = $content -replace "\.ts'", ".js'"
        Set-Content -Path $_.FullName -Value $content -NoNewline -Encoding UTF8
    }
}

# 8f. ลบ TypeScript source files (เก็บเฉพาะ JS)
Get-ChildItem -Path "prisma\generated\prisma\client" -Filter "*.ts" -Recurse | Remove-Item -Force

# ──── 9. Compile seed.ts ────
npx tsc prisma/seed.ts `
    --outDir prisma/ `
    --target ES2020 `
    --module commonjs `
    --moduleResolution node `
    --esModuleInterop `
    --skipLibCheck `
    --resolveJsonModule

# ──── 10. คัดลอก Prisma artifacts ไป API dist ────
Copy-Item -Path "prisma\generated" `
  -Destination "apps\api\dist\prisma\generated" -Recurse -Force
Copy-Item -Path "prisma\prisma.config.ts" -Destination "apps\api\dist\prisma\" -Force
Copy-Item -Path "prisma\schema.prisma" -Destination "apps\api\dist\prisma\" -Force
Copy-Item -Path "prisma\migrations" `
  -Destination "apps\api\dist\prisma\migrations" -Recurse -Force

# ──── 11. รัน migration ────
npx prisma migrate deploy --config prisma/prisma.config.ts

# ──── 12. รัน seed (ปลอดภัย — ON CONFLICT DO NOTHING) ────
node prisma/seed.js

# ──── 13. เริ่ม services + ตรวจ health ────
pm2 restart all
pm2 save
Start-Sleep -Seconds 10
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -MaximumRedirection 0
```

### Rollback

```powershell
pm2 stop all
git checkout v2.0.0e    # ย้อนกลับไป tag เก่า
# ทำ build ใหม่ตามขั้นตอนด้านบน
pm2 restart all
```

> **คำเตือน**: Rollback จะ **ไม่** revert database migrations ที่รันไปแล้ว

---

## 12. คำสั่งดูแลระบบ

### สำรองข้อมูล (Backup)

#### วิธีที่ 1: ผ่าน UI (แนะนำ)

เข้าระบบด้วย role SUPER_ADMIN → **Settings → Backup** → **Download**

#### วิธีที่ 2: pg_dump

```powershell
mkdir C:\SSO_Cancer\backups

# Backup
& "C:\Program Files\PostgreSQL\{version}\bin\pg_dump.exe" `
    -U postgres -F c -d sso_cancer `
    -f "C:\SSO_Cancer\backups\backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"

# Restore
& "C:\Program Files\PostgreSQL\{version}\bin\pg_restore.exe" `
    -U postgres -d sso_cancer --clean --if-exists `
    "C:\SSO_Cancer\backups\backup_20260303_143000.dump"
```

### รัน Migration ด้วยมือ

```powershell
cd C:\SSO_Cancer
npx prisma migrate deploy --config prisma/prisma.config.ts
```

### รัน Seed ด้วยมือ

```powershell
# วิธี 1: ผ่าน seed.js
node prisma/seed.js

# วิธี 2: SQL ตรงๆ (fallback)
Get-ChildItem "database\seeds\*.sql" | ForEach-Object {
    Write-Host "Seeding $($_.Name)..."
    Get-Content $_.FullName | & "C:\Program Files\PostgreSQL\{version}\bin\psql.exe" -U postgres -d sso_cancer
}
```

### ลืมรหัสผ่าน admin

```powershell
& "C:\Program Files\PostgreSQL\{version}\bin\psql.exe" -U postgres -d sso_cancer -c @"
UPDATE users SET
    password_hash = '`$2b`$12`$LJ3m4ys3Lg7Yt18G4WQJG.vGPqFnsgXOdGmCd7JnRqT1l/TCSeDV6',
    failed_login_attempts = 0,
    locked_until = NULL,
    must_change_password = true
WHERE email = 'admin@sso-cancer.local';
"@
```

> รหัสผ่านจะถูก reset เป็น `Admin@1234` (ต้องเปลี่ยนทันทีหลังเข้าสู่ระบบ)

---

## 13. Troubleshooting

### Next.js build ล้มเหลว: `workUnitAsyncStorage` error

```
Error occurred prerendering page "/_not-found"
Error [InvariantError]: Invariant: Expected workUnitAsyncStorage to have a store.
```

**สาเหตุ**: Windows path casing ไม่ตรงกับชื่อโฟลเดอร์จริงบน disk

Windows เป็น case-insensitive สำหรับ file access แต่ **Webpack ถือว่า path ที่ casing ต่างกันเป็นคนละ module** เช่น ถ้าโฟลเดอร์จริงชื่อ `C:\SSO_Cancer` แต่ shell resolve เป็น `C:\sso_cancer` (ตัวเล็ก) Webpack จะ load React 2 ครั้งผ่าน 2 paths ทำให้ `AsyncLocalStorage` ของ Next.js พัง

**วิธีแก้**:

```powershell
# ตรวจ casing จริงของโฟลเดอร์
Get-Item C:\sso_cancer | Select-Object FullName

# ใช้ casing ที่ตรงกับผลลัพธ์ด้านบน เช่น:
cd C:\SSO_Cancer    # ← ตรงกับชื่อจริง ไม่ใช่ C:\sso_cancer

# แล้ว build ใหม่
npm run build --workspace=apps/web
```

> **สำคัญ**: ตรวจสอบให้ cwd ตรงกับ disk casing ทุกครั้งก่อน build — เปิด PowerShell ใหม่แล้ว cd ด้วย path ที่ถูกต้อง

### PM2 process ไม่ online

```powershell
# ดู error log
pm2 logs sso-cancer-api --lines 50

# สาเหตุที่พบบ่อย:
# - JWT_SECRET environment variable is required → ไม่มีไฟล์ .env หรือยังไม่ได้ตั้งค่า (ดูขั้นตอน 4.3)
# - DATABASE_URL ผิด → แก้ใน .env
# - Port ถูกใช้อยู่แล้ว → netstat -an | findstr ":4000"
# - Prisma client ไม่ได้ compile → ทำตามขั้นตอน 5.3 ใหม่
```

> **สาเหตุ #1 ที่พบบ่อยที่สุด**: ลืมสร้างไฟล์ `.env` — API อ่าน `.env` จาก root ของ repo (`C:\SSO_Cancer\.env`) ทุกครั้งที่ start
>
> **สาเหตุ #2**: PM2 cwd ผิด — API ใช้ `envFilePath: '../../.env'` ซึ่ง resolve สัมพัทธ์กับ cwd ดังนั้น cwd ต้องเป็น `C:\SSO_Cancer\apps\api` (ไม่ใช่ `C:\SSO_Cancer`) เพื่อให้ `../../.env` ชี้ถูกที่

### เข้าเว็บไม่ได้ (Connection refused)

```powershell
# 1. ตรวจว่า PM2 services ทำงาน
pm2 status

# 2. ตรวจว่า nginx ทำงาน
Get-Process nginx

# 3. ตรวจ port
netstat -an | findstr ":80 :443 :3000 :4000"

# 4. ตรวจ firewall
Get-NetFirewallRule -DisplayName "SSO Cancer*"
```

### 502 Bad Gateway

nginx เชื่อมต่อ API/Web ไม่ได้:

```powershell
# ตรวจว่า API ตอบ
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -UseBasicParsing

# ตรวจว่า Web ตอบ
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing

# Restart ทุกอย่าง
pm2 restart all
C:\nginx\nginx.exe -s reload
```

### Prisma generate ปฏิเสธ: "exists and is not empty but doesn't look like a generated Prisma Client"

```
Error: prisma/generated/prisma/client exists and is not empty but doesn't look like a generated Prisma Client.
```

**สาเหตุ**: จากขั้นตอน compile Prisma → CJS (5.3) ของ deploy ครั้งก่อน — ไฟล์ `.js`, `package.json` ฯลฯ ที่เหลือค้างทำให้ `prisma generate` ไม่รู้จัก

**วิธีแก้**: ลบ generated client ทิ้งก่อน generate ใหม่:

```powershell
Remove-Item -Recurse -Force prisma\generated\prisma\client -ErrorAction SilentlyContinue
npx prisma generate --config prisma/prisma.config.ts
```

> **หมายเหตุ**: ปัญหานี้เกิดทุกครั้งที่ deploy ซ้ำ — ในส่วนอัปเดตเวอร์ชัน (section 11) ได้เพิ่มขั้นตอนนี้ไว้แล้ว

### Prisma client error ตอน runtime

```
Error: Cannot find module 'prisma/generated/prisma/client'
```

แก้ไข: ทำขั้นตอน 4.4 + 5.1–5.3 ใหม่ทั้งหมด แล้ว rebuild API

### Line ending issues

ถ้าเจอ error แปลกๆ เกี่ยวกับ file parsing:

```powershell
# แปลง line endings ของ seed files
git config core.autocrlf input
git checkout -- database/seeds/
```

### Next.js static files ไม่โหลด

standalone output ต้องมี static files:

```powershell
# ตรวจว่า static files อยู่ถูกที่
Test-Path "apps\web\.next\static"
Test-Path "apps\web\public"
```

ถ้าไม่มี ให้ build ใหม่: `cd apps\web && npm run build`

### CORS_ORIGIN=* ทำให้ API ปิดตัว

ดู log: `pm2 logs sso-cancer-api`

ถ้าเห็น error เกี่ยวกับ CORS → แก้ `CORS_ORIGIN` ใน `.env` ให้เป็น URL ที่ชัดเจน เช่น `https://192.168.1.100`

---

## 14. Quick Reference

| ต้องการ | คำสั่ง |
|---------|--------|
| เริ่มทุก service | `pm2 start ecosystem.config.js` |
| ดูสถานะ | `pm2 status` |
| ดู logs | `pm2 logs` |
| ดู logs เฉพาะ API | `pm2 logs sso-cancer-api` |
| Restart ทั้งหมด | `pm2 restart all` |
| Restart เฉพาะ API | `pm2 restart sso-cancer-api` |
| หยุดทั้งหมด | `pm2 stop all` |
| Reload nginx | `C:\nginx\nginx.exe -s reload` |
| รัน migration | `npx prisma migrate deploy --config prisma/prisma.config.ts` |
| รัน seed | `node prisma/seed.js` |
| Backup DB | `pg_dump -U postgres -F c -d sso_cancer > backup.dump` |
| Health check | `curl http://localhost:4000/api/v1/health` |
| เข้าสู่ระบบ | `admin@sso-cancer.local` / `Admin@1234` (ต้องเปลี่ยนรหัสผ่านทันที) |

### สร้าง secrets ทั้งหมด

```bash
# รันใน Git Bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "SETTINGS_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)"
```
