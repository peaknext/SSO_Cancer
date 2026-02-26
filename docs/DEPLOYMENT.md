# คู่มือการ Deploy — SSO Cancer Care

คู่มือนี้อธิบายขั้นตอนการ deploy ระบบ SSO Cancer Care ไปยัง server ของโรงพยาบาลอย่างละเอียด รองรับ 2 วิธีหลัก:

- **วิธี A**: บันทึก Docker image เป็นไฟล์ `.tar` → โอนไฟล์ไป server → deploy (สำหรับ server ที่ไม่มี internet)
- **วิธี B**: Push image ขึ้น Docker Hub → Pull จาก server → deploy (สำหรับ server ที่มี internet)

> **หมายเหตุ**: นอกจากนี้ยังมี `deploy/deploy.sh` ซึ่งเป็นวิธีที่ 3 — build image จาก source code บน server โดยตรง (ใช้ `docker-compose.prod.yml`) เหมาะสำหรับ dev/CI ที่มี source code อยู่แล้ว ไม่ได้อธิบายในคู่มือนี้

---

## สารบัญ

1. [สถาปัตยกรรมระบบ](#1-สถาปัตยกรรมระบบ)
2. [ข้อกำหนดเบื้องต้น](#2-ข้อกำหนดเบื้องต้น)
3. [เตรียม server โรงพยาบาล (ทำครั้งเดียว)](#3-เตรียม-server-โรงพยาบาล-ทำครั้งเดียว)
4. [วิธี A: Deploy ด้วยไฟล์ tar (Offline)](#4-วิธี-a-deploy-ด้วยไฟล์-tar-offline)
5. [วิธี B: Deploy ผ่าน Docker Hub (Online)](#5-วิธี-b-deploy-ผ่าน-docker-hub-online)
6. [การนำข้อมูลจากเครื่อง Dev ไป Production](#6-การนำข้อมูลจากเครื่อง-dev-ไป-production)
7. [การอัปเดตเวอร์ชัน](#7-การอัปเดตเวอร์ชัน)
8. [คำสั่งดูแลระบบ](#8-คำสั่งดูแลระบบ)
9. [การแก้ปัญหา (Troubleshooting)](#9-การแก้ปัญหา-troubleshooting)

---

## 1. สถาปัตยกรรมระบบ

ระบบประกอบด้วย 4 Docker containers ที่ทำงานร่วมกันผ่าน internal network:

```
┌─── Server โรงพยาบาล ──────────────────────────────────────────┐
│                                                                │
│   ┌─ nginx (reverse proxy) ────────────────────────────────┐   │
│   │  port 80  → redirect ไป 443                           │   │
│   │  port 443 → SSL/TLS                                   │   │
│   │  /api/*   → proxy ไป api:4000                         │   │
│   │  /*       → proxy ไป web:3000                         │   │
│   └────────────────────────────────────────────────────────┘   │
│        │                              │                        │
│   ┌─ api ───────────┐   ┌─ web ───────────────┐               │
│   │ NestJS REST API  │   │ Next.js Frontend    │               │
│   │ port 4000        │   │ port 3000           │               │
│   │ (internal only)  │   │ (internal only)     │               │
│   └────────┬─────────┘   └─────────────────────┘               │
│            │                                                   │
│   ┌─ db ───────────────────┐                                   │
│   │ PostgreSQL 16           │                                   │
│   │ port 5432 (internal)    │                                   │
│   │ data → pgdata volume    │                                   │
│   └─────────────────────────┘                                   │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

ผู้ใช้เข้าถึงผ่าน `https://sso-cancer.hospital.local` (หรือ IP ของ server)

---

## 2. ข้อกำหนดเบื้องต้น

### เครื่อง Dev (สำหรับ build image)

| รายการ | เวอร์ชันขั้นต่ำ |
|--------|----------------|
| Docker | 24.0+ |
| Docker Compose | v2.20+ |
| Git | 2.39+ |
| Node.js | 20+ (สำหรับ dev เท่านั้น) |
| RAM ว่าง | 4 GB (ขณะ build) |
| พื้นที่ว่าง | 5 GB (สำหรับ image + tar) |

### Server โรงพยาบาล

| รายการ | เวอร์ชันขั้นต่ำ |
|--------|----------------|
| OS | Ubuntu 22.04+ / CentOS 8+ / Windows Server 2019+ |
| Docker | 24.0+ |
| Docker Compose | v2.20+ (มากับ Docker Desktop หรือ plugin) |
| RAM | 2 GB ขึ้นไป |
| พื้นที่ว่าง | 3 GB ขึ้นไป |
| Port ว่าง | 80, 443 (หรือกำหนดเอง) |

### ตรวจสอบ Docker บน server

```bash
docker --version          # Docker version 24.x+
docker compose version    # Docker Compose version v2.x+
```

ถ้ายังไม่ได้ติดตั้ง Docker ให้ทำตามคู่มือ: https://docs.docker.com/engine/install/

---

## 3. เตรียม server โรงพยาบาล (ทำครั้งเดียว)

### 3.1 โอนไฟล์ project ไป server

โอนเฉพาะไฟล์ที่จำเป็น (ไม่ต้องโอน node_modules หรือ source code ทั้งหมด):

```
โครงสร้างไฟล์ที่ต้องมีบน server:
├── docker-compose.deploy.yml
├── .env.production
├── deploy/
│   ├── import-and-run.sh        # วิธี A: import จาก .tar
│   ├── pull-and-run.sh          # วิธี B: pull จาก Docker Hub
│   ├── build-and-export.sh      # (ใช้บนเครื่อง dev เท่านั้น — สร้าง .tar)
│   └── nginx/
│       ├── nginx.conf
│       └── ssl/
│           ├── cert.pem
│           └── key.pem
└── prisma/                      # สำหรับ migration (ถ้าใช้ภายใน container จะมีอยู่แล้ว)
```

วิธีง่ายที่สุดคือ `git clone` ทั้ง repo แล้วทำงานจาก root directory:

```bash
git clone https://github.com/peaknext/SSO_Cancer.git
cd SSO_Cancer
```

### 3.2 สร้างไฟล์ `.env.production`

```bash
cp .env.production.example .env.production
```

แก้ไขค่าต่อไปนี้ **ทุกรายการ**:

```bash
nano .env.production    # หรือใช้ vi / notepad
```

#### ค่าที่ต้องแก้ไข

| ตัวแปร | คำอธิบาย | ตัวอย่าง |
|--------|----------|---------|
| `DB_PASSWORD` | รหัสผ่าน PostgreSQL (ตั้งให้ซับซ้อน) | `Str0ng!P@ssw0rd#2026` |
| `JWT_SECRET` | Secret สำหรับ access token | สร้างด้วยคำสั่งด้านล่าง |
| `JWT_REFRESH_SECRET` | Secret สำหรับ refresh token | สร้างด้วยคำสั่งด้านล่าง |
| `CORS_ORIGIN` | URL ของระบบ (ตรงกับ hostname) | `https://192.168.1.100` |
| `IMAGE_REGISTRY` | Docker Hub username ตามด้วย `/` (วิธี B) | `peaknext/` |

ค่าตัวแปรเสริม (optional):

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|--------|------------|---------|
| `IMAGE_TAG` | `latest` | เวอร์ชัน image (deploy scripts ส่งค่านี้ผ่าน command line แต่จำเป็นถ้ารัน compose โดยตรง) |
| `NGINX_HTTP_PORT` | `80` | port HTTP ของ nginx (เปลี่ยนถ้า 80 ไม่ว่าง) |
| `NGINX_HTTPS_PORT` | `443` | port HTTPS ของ nginx |

#### สร้าง JWT secrets

```bash
# รันบน server หรือเครื่อง dev แล้วคัดลอกค่าไปใส่ใน .env.production
openssl rand -hex 32    # ← ใช้ค่านี้สำหรับ JWT_SECRET
openssl rand -hex 32    # ← ใช้ค่านี้สำหรับ JWT_REFRESH_SECRET
```

#### ตัวอย่าง `.env.production` ที่พร้อมใช้งาน

```ini
# ─── Database ────────────────────────────────────────────
DB_PASSWORD=Str0ng!P@ssw0rd#2026
POSTGRES_DB=sso_cancer
POSTGRES_USER=postgres

# ─── JWT Secrets ─────────────────────────────────────────
JWT_SECRET=6e49d13e57f2d5aa055be7a15bd2e4edae4bc7d2c7b6485c675772714d7f0fc7
JWT_REFRESH_SECRET=601d3d2b9082b604108173333e18745b1b152d530896fc94f3431ddd4770bd4a

# ─── Application ─────────────────────────────────────────
CORS_ORIGIN=https://192.168.1.100

# ─── Security ────────────────────────────────────────────
MAX_FAILED_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_SECONDS=900
MAX_CONCURRENT_SESSIONS=5
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
PASSWORD_HISTORY_COUNT=5
```

> **หมายเหตุ**: ค่า JWT_SECRET ด้านบนเป็นตัวอย่างเท่านั้น ต้องสร้างค่าใหม่ด้วย `openssl rand -hex 32`

### 3.3 สร้าง SSL Certificate

#### กรณีมี certificate จริงจากโรงพยาบาล (แนะนำ)

```bash
mkdir -p deploy/nginx/ssl
# คัดลอกไฟล์ certificate ที่ได้รับ
cp /path/to/hospital-cert.pem deploy/nginx/ssl/cert.pem
cp /path/to/hospital-key.pem  deploy/nginx/ssl/key.pem
```

#### กรณีใช้ self-signed certificate (สำหรับทดสอบ)

```bash
mkdir -p deploy/nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout deploy/nginx/ssl/key.pem \
  -out deploy/nginx/ssl/cert.pem \
  -subj '/CN=sso-cancer.hospital.local'
```

> **หมายเหตุ**: Self-signed cert จะทำให้ browser แสดงคำเตือน "Your connection is not private" — ผู้ใช้ต้องกด "Advanced" → "Proceed" เพื่อเข้าใช้งาน

---

## 4. วิธี A: Deploy ด้วยไฟล์ tar (Offline)

เหมาะสำหรับ server ที่ **ไม่มีอินเทอร์เน็ต** หรือไม่สามารถเข้าถึง Docker Hub ได้

### ภาพรวมขั้นตอน

```
เครื่อง Dev                             Server โรงพยาบาล
──────────                             ──────────────────
1. build image
2. export เป็น .tar      ──USB/SCP──►  3. import จาก .tar
                                       4. docker compose up
```

### ขั้นตอนที่ 1: Build image บนเครื่อง Dev

เปิด terminal ที่ root ของ project:

```bash
cd SSO_Cancer

# Build แบบไม่ระบุ tag (ใช้ latest)
bash deploy/build-and-export.sh

# หรือ Build แบบระบุ version tag
bash deploy/build-and-export.sh v1.0.0
```

สิ่งที่เกิดขึ้น:
1. Build image `sso-cancer-api:v1.0.0` จาก `apps/api/Dockerfile`
2. Build image `sso-cancer-web:v1.0.0` จาก `apps/web/Dockerfile` (build-arg: `NEXT_PUBLIC_API_URL=""`, `API_INTERNAL_URL=http://api:4000` — ค่านี้ถูก bake ลงใน image)
3. บันทึกทั้ง 2 image เป็นไฟล์ `sso-cancer-images-v1.0.0.tar`

ผลลัพธ์:
```
=== Done! ===
File: sso-cancer-images-v1.0.0.tar (850M)
```

> ขนาดไฟล์ประมาณ 800 MB – 1 GB

### ขั้นตอนที่ 2: โอนไฟล์ไป server

#### ผ่าน SCP (ถ้ามี SSH)

```bash
scp sso-cancer-images-v1.0.0.tar user@192.168.1.100:/home/user/SSO_Cancer/
```

#### ผ่าน USB drive

1. คัดลอก `sso-cancer-images-v1.0.0.tar` ลง USB
2. เสียบ USB ที่ server
3. คัดลอกไฟล์ไปที่ `/home/user/SSO_Cancer/` (หรือ directory ที่ clone repo ไว้)

### ขั้นตอนที่ 3: Deploy บน server

SSH เข้า server แล้วรัน:

```bash
cd SSO_Cancer

# ตรวจสอบว่าไฟล์ tar อยู่ใน directory
ls -lh sso-cancer-images-v1.0.0.tar

# Deploy!
bash deploy/import-and-run.sh v1.0.0
```

script จะทำสิ่งต่อไปนี้โดยอัตโนมัติ:

| ขั้นตอน | สิ่งที่เกิดขึ้น |
|---------|----------------|
| Pre-flight | ตรวจ `.env.production`, ไฟล์ tar, SSL cert |
| 1/5 | `docker load` — import image จากไฟล์ tar |
| 2/5 | หยุด services เดิม (ถ้ามี) |
| 3/5 | เริ่ม database + รัน Prisma migration |
| 4/5 | รัน database seed (ข้อมูลยา, โปรโตคอล, รพ. ฯลฯ) |
| 5/5 | เริ่ม services ทั้งหมด (db → api → web → nginx) |
| Health check | รอ 30 วินาที แล้วตรวจสอบ `/api/v1/health` |

ผลลัพธ์ที่คาดหวัง:

```
=== Deployment successful! ===

Access the application:
  https://192.168.1.100

Default admin login:
  Email:    admin@sso-cancer.local
  Password: Admin@1234
```

### ขั้นตอนที่ 4: ทดสอบเข้าใช้งาน

1. เปิด browser → ไปที่ `https://192.168.1.100` (หรือ hostname ของ server)
2. ถ้าใช้ self-signed cert จะเห็นหน้าเตือน → กด **Advanced** → **Proceed**
3. เข้าสู่ระบบด้วย:
   - **Email**: `admin@sso-cancer.local`
   - **Password**: `Admin@1234`
4. **เปลี่ยนรหัสผ่านทันที** หลังเข้าสู่ระบบครั้งแรก

---

## 5. วิธี B: Deploy ผ่าน Docker Hub (Online)

เหมาะสำหรับ server ที่ **มีอินเทอร์เน็ต** และต้องการ deploy/อัปเดตได้สะดวก

### ภาพรวมขั้นตอน

```
เครื่อง Dev                  Docker Hub                Server โรงพยาบาล
──────────                  ──────────                ──────────────────
1. git tag + push    ──►    2. GitHub Actions
                            build & push image  ──►   3. docker pull
                                                      4. docker compose up
```

### ขั้นตอนเตรียมการ (ทำครั้งเดียว)

#### A. สร้าง Docker Hub account + access token

1. ไปที่ https://hub.docker.com → สมัครสมาชิก (ฟรี)
2. ไปที่ **Account Settings** → **Security** → **New Access Token**
3. ตั้งชื่อ token เช่น `sso-cancer-github-actions`
4. เลือก permission: **Read, Write, Delete**
5. คัดลอก token เก็บไว้ (จะแสดงเพียงครั้งเดียว)

#### B. ตั้งค่า GitHub Secrets

ไปที่ GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:

| Secret name | ค่า |
|------------|-----|
| `DOCKERHUB_USERNAME` | username ของ Docker Hub เช่น `peaknext` |
| `DOCKERHUB_TOKEN` | access token ที่สร้างในข้อ A |

#### C. กำหนด `IMAGE_REGISTRY` บน server

ค่า `IMAGE_REGISTRY` มีอยู่ใน `.env.production.example` แล้ว ตรวจสอบให้ตรงกับ Docker Hub username ของคุณ:

```ini
# ใส่ Docker Hub username ตามด้วย / (trailing slash)
IMAGE_REGISTRY=peaknext/
```

### ขั้นตอน Deploy

#### วิธี 1: Push tag อัตโนมัติ (แนะนำ)

บนเครื่อง dev:

```bash
cd SSO_Cancer

# สร้าง git tag
git tag v1.0.0

# Push tag ไป GitHub → trigger GitHub Actions อัตโนมัติ
git push origin v1.0.0
```

**GitHub Actions จะทำงานอัตโนมัติ**:
1. Build image `peaknext/sso-cancer-api:v1.0.0` + `:latest`
2. Build image `peaknext/sso-cancer-web:v1.0.0` + `:latest`
3. Push ทั้ง 2 image ขึ้น Docker Hub

ตรวจสอบสถานะ: ไปที่ GitHub repo → **Actions** tab → ดู workflow run

เมื่อ build เสร็จแล้ว SSH เข้า server:

```bash
cd SSO_Cancer

bash deploy/pull-and-run.sh v1.0.0
```

#### วิธี 2: Trigger manual จาก GitHub UI

1. ไปที่ GitHub repo → **Actions** → **Build & Push Docker Images**
2. กด **Run workflow**
3. ใส่ tag เช่น `v1.0.0` → กด **Run workflow**
4. รอ build เสร็จ → SSH เข้า server → `bash deploy/pull-and-run.sh v1.0.0`

### สิ่งที่ `pull-and-run.sh` ทำ

| ขั้นตอน | สิ่งที่เกิดขึ้น |
|---------|----------------|
| Pre-flight | ตรวจ `.env.production`, `IMAGE_REGISTRY`, SSL cert |
| 1/5 | `docker compose pull api web` — ดึง image จาก Docker Hub (db, nginx ใช้ stock image) |
| 2/5 | หยุด services เดิม (ถ้ามี) |
| 3/5 | เริ่ม database + รัน Prisma migration |
| 4/5 | รัน database seed (ข้อมูลยา, โปรโตคอล, รพ. ฯลฯ) |
| 5/5 | เริ่ม services ทั้งหมด |
| Health check | ตรวจสอบ `/api/v1/health` |

---

## 6. การนำข้อมูลจากเครื่อง Dev ไป Production

เมื่อ deploy ปกติ (วิธี A หรือ B) ระบบจะรัน Prisma migration เพื่อสร้าง schema + seed ข้อมูลพื้นฐาน (~1,700 rows: รหัสยา, โปรโตคอล, staging ฯลฯ) ให้อัตโนมัติ

แต่ถ้าต้องการนำ **ข้อมูลจริง** ที่มีอยู่ในเครื่อง dev (เช่น ข้อมูลผู้ป่วยที่ import, protocol analysis ที่ทำไปแล้ว, billing claims ฯลฯ) ไปที่ production ด้วย ให้ทำตามขั้นตอนนี้

### เลือกวิธีที่เหมาะสม

| สถานการณ์ | วิธีที่เหมาะ |
|-----------|-------------|
| Production ใหม่ ต้องการเฉพาะข้อมูลพื้นฐาน (ยา, โปรโตคอล) | ไม่ต้องทำอะไร — migration + seed ทำให้อัตโนมัติ |
| ต้องการนำข้อมูลจริงทั้งหมดจาก dev ไป production | **วิธี 1: Full dump/restore** |
| ต้องการนำเฉพาะข้อมูลบางตาราง (เช่น เฉพาะ patient data) | **วิธี 2: Selective dump** |
| ต้องการย้ายข้อมูลจาก production เก่าไป production ใหม่ | **วิธี 1: Full dump/restore** (ทำจาก production เก่า) |

### วิธี 1: Full Database Dump/Restore

#### ขั้นตอน 1: Export จากเครื่อง Dev

**กรณี PostgreSQL รันบนเครื่อง dev โดยตรง (localhost:5432):**

```bash
cd SSO_Cancer
mkdir -p backups

# Dump ทั้ง database เป็นไฟล์ custom format (มีขนาดเล็กกว่า SQL)
pg_dump -U postgres -F c -d sso_cancer -f backups/sso_cancer_export.dump

# หรือ dump เป็น plain SQL (อ่านเข้าใจได้ง่ายกว่า)
pg_dump -U postgres -d sso_cancer > backups/sso_cancer_export.sql
```

**กรณี PostgreSQL รันใน Docker (dev full-stack):**

```bash
cd SSO_Cancer
mkdir -p backups

# Dump จาก Docker container (custom format)
docker compose exec db pg_dump -U postgres -F c sso_cancer > backups/sso_cancer_export.dump

# หรือ plain SQL
docker compose exec db pg_dump -U postgres sso_cancer > backups/sso_cancer_export.sql
```

> **ขนาดไฟล์**: ประมาณ 1–5 MB สำหรับข้อมูลพื้นฐาน + ข้อมูลผู้ป่วย 1,000–5,000 visits

#### ขั้นตอน 2: โอนไฟล์ dump ไป server

```bash
# ผ่าน SCP
scp backups/sso_cancer_export.dump user@192.168.1.100:/home/user/SSO_Cancer/backups/

# หรือคัดลอกผ่าน USB drive
```

#### ขั้นตอน 3: Deploy ระบบบน server (ถ้ายังไม่ได้ deploy)

**สำคัญ**: ต้อง deploy ระบบก่อน (วิธี A หรือ B) เพื่อให้ Docker containers ทำงาน + database สร้างโดย migration แล้ว

```bash
cd SSO_Cancer

# Deploy ตามปกติ (เลือกวิธี A หรือ B)
bash deploy/import-and-run.sh v1.0.0    # วิธี A
# หรือ
bash deploy/pull-and-run.sh v1.0.0      # วิธี B
```

#### ขั้นตอน 4: Restore ข้อมูลบน server

```bash
cd SSO_Cancer
export TAG=v1.0.0

# === วิธี custom format (.dump) ===

# 4a. ล้างข้อมูลเดิม (seed data) แล้ว restore ข้อมูลจาก dev
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db pg_restore -U postgres -d sso_cancer --clean --if-exists < backups/sso_cancer_export.dump

# === วิธี plain SQL (.sql) ===

# 4a. ลบ database เดิม แล้วสร้างใหม่
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -c "DROP DATABASE IF EXISTS sso_cancer;"
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -c "CREATE DATABASE sso_cancer;"

# 4b. Restore จากไฟล์ SQL
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db psql -U postgres -d sso_cancer < backups/sso_cancer_export.sql
```

#### ขั้นตอน 5: ตรวจสอบและ Restart

```bash
# ตรวจสอบจำนวนข้อมูลในตารางหลัก
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "
    SELECT 'drugs' as table_name, count(*) from drugs
    UNION ALL SELECT 'protocols', count(*) from protocol_names
    UNION ALL SELECT 'patients', count(*) from patients
    UNION ALL SELECT 'patient_visits', count(*) from patient_visits
    UNION ALL SELECT 'visit_medications', count(*) from visit_medications
    UNION ALL SELECT 'users', count(*) from users
    ORDER BY table_name;
  "

# Restart API เพื่อ reconnect กับ database
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production restart api

# ตรวจ health check
sleep 10
curl -sk https://localhost/api/v1/health
```

### วิธี 2: Selective Dump (เฉพาะบางตาราง)

ถ้าต้องการนำเฉพาะข้อมูลบางส่วน เช่น เฉพาะข้อมูลผู้ป่วยและ protocol analysis โดยยังคงให้ migration + seed สร้างข้อมูลพื้นฐานตามปกติ

#### ตารางข้อมูลผู้ป่วย

```bash
# Export เฉพาะตารางที่เกี่ยวข้องกับข้อมูลผู้ป่วย
pg_dump -U postgres -d sso_cancer \
  -t patient_imports \
  -t patient_visits \
  -t visit_medications \
  -t ai_suggestions \
  -t patients \
  -t patient_cases \
  -t visit_billing_claims \
  --data-only > backups/patient_data_export.sql
```

> **`--data-only`**: Export เฉพาะข้อมูล (INSERT statements) ไม่รวม schema — เพราะ migration สร้าง schema ให้แล้ว

#### Restore บน server

```bash
# Deploy ตามปกติก่อน (migration + seed จะสร้าง schema + ข้อมูลพื้นฐาน)
bash deploy/import-and-run.sh v1.0.0

# จากนั้น restore ข้อมูลผู้ป่วยทับลงไป
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db psql -U postgres -d sso_cancer < backups/patient_data_export.sql
```

#### ตารางข้อมูลผู้ใช้ + Audit log

```bash
# Export ข้อมูลผู้ใช้ (ไม่รวม sessions เพราะจะหมดอายุ)
pg_dump -U postgres -d sso_cancer \
  -t users \
  -t password_history \
  -t audit_logs \
  --data-only > backups/user_data_export.sql
```

> **หมายเหตุ**: ถ้า export ตาราง `users` จะรวม admin ที่ seed สร้างด้วย → อาจเกิด duplicate key ตอน restore ถ้า seed รันก่อนแล้ว ใช้ `--on-conflict-do-nothing` หรือลบ admin row จากไฟล์ก่อน restore

### สิ่งที่ต้องระวัง

#### 1. Password Hash เข้ากันได้

Password hash ใช้ bcrypt ซึ่งไม่ผูกกับ server — hash ที่สร้างบน dev ใช้ได้บน production โดยไม่ต้องแก้ไข

#### 2. JWT Secret ที่ต่างกัน

Production ใช้ JWT secret ต่างจาก dev → **session ทั้งหมดจาก dev จะใช้ไม่ได้** บน production ซึ่งเป็นสิ่งที่ถูกต้อง — ผู้ใช้ต้องล็อกอินใหม่

ล้างตาราง sessions หลัง restore เพื่อความสะอาด:

```bash
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "DELETE FROM sessions;"
```

#### 3. Sequence Reset

หลังจาก restore ข้อมูล auto-increment sequences อาจไม่ตรงกับ ID ล่าสุด ทำให้เกิด duplicate key error ตอนสร้างข้อมูลใหม่ แก้โดย:

```bash
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "
    -- Reset sequences ของทุกตารางให้ตรงกับ max ID
    DO \$\$
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN
        SELECT c.table_name, c.column_name, pg_get_serial_sequence(c.table_name, c.column_name) AS seq
        FROM information_schema.columns c
        WHERE c.column_default LIKE 'nextval%'
          AND c.table_schema = 'public'
      LOOP
        EXECUTE format(
          'SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 0) + 1, false)',
          r.seq, r.column_name, r.table_name
        );
      END LOOP;
    END \$\$;
  "
```

#### 4. ขนาดไฟล์ dump

| ปริมาณข้อมูล | ขนาดไฟล์โดยประมาณ |
|-------------|-------------------|
| ข้อมูลพื้นฐาน (seed เท่านั้น) | ~800 KB (.dump) / ~3 MB (.sql) |
| + ผู้ป่วย 1,000 visits | ~2 MB (.dump) / ~8 MB (.sql) |
| + ผู้ป่วย 10,000 visits | ~10 MB (.dump) / ~40 MB (.sql) |
| + ผู้ป่วย 100,000 visits | ~80 MB (.dump) / ~300 MB (.sql) |

> แนะนำใช้ custom format (`.dump`) เพราะมีการบีบอัดข้อมูลและ restore ได้เร็วกว่า

### สรุปขั้นตอนแบบรวดเร็ว

```bash
# === บนเครื่อง Dev ===
cd SSO_Cancer

# 1. Dump database
pg_dump -U postgres -F c -d sso_cancer -f backups/sso_cancer_export.dump

# 2. โอนไฟล์ไป server (พร้อมกับ Docker images)
scp backups/sso_cancer_export.dump user@server:/home/user/SSO_Cancer/backups/

# === บน Server ===
cd SSO_Cancer
export TAG=v1.0.0

# 3. Deploy ระบบ (ถ้ายังไม่ได้)
bash deploy/import-and-run.sh v1.0.0

# 4. Restore ข้อมูล
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db pg_restore -U postgres -d sso_cancer --clean --if-exists < backups/sso_cancer_export.dump

# 5. Reset sequences
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "
    DO \$\$
    DECLARE r RECORD;
    BEGIN
      FOR r IN
        SELECT c.table_name, c.column_name, pg_get_serial_sequence(c.table_name, c.column_name) AS seq
        FROM information_schema.columns c
        WHERE c.column_default LIKE 'nextval%' AND c.table_schema = 'public'
      LOOP
        EXECUTE format('SELECT setval(%L, COALESCE((SELECT MAX(%I) FROM %I), 0) + 1, false)', r.seq, r.column_name, r.table_name);
      END LOOP;
    END \$\$;
  "

# 6. ล้าง sessions เก่า + Restart API
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "DELETE FROM sessions;"
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production restart api

# 7. ตรวจสอบ
sleep 10 && curl -sk https://localhost/api/v1/health
```

---

## 7. การอัปเดตเวอร์ชัน

### อัปเดตด้วยไฟล์ tar (วิธี A)

บนเครื่อง dev:

```bash
# Build เวอร์ชันใหม่
bash deploy/build-and-export.sh v1.1.0

# โอนไฟล์ tar ไป server
scp sso-cancer-images-v1.1.0.tar user@192.168.1.100:/home/user/SSO_Cancer/
```

บน server:

```bash
cd SSO_Cancer
bash deploy/import-and-run.sh v1.1.0
```

> Script จะหยุด services เดิม → load image ใหม่ → รัน migration → เริ่ม services ใหม่

### อัปเดตผ่าน Docker Hub (วิธี B)

บนเครื่อง dev:

```bash
git tag v1.1.0
git push origin v1.1.0
# รอ GitHub Actions build เสร็จ
```

บน server:

```bash
cd SSO_Cancer
bash deploy/pull-and-run.sh v1.1.0
```

### Rollback (ย้อนกลับเวอร์ชัน)

```bash
# ย้อนกลับไปเวอร์ชันก่อนหน้า
bash deploy/import-and-run.sh v1.0.0    # วิธี A
bash deploy/pull-and-run.sh v1.0.0      # วิธี B
```

> Image เก่าจะยังอยู่ใน Docker cache ไม่ต้อง build ใหม่

---

## 8. คำสั่งดูแลระบบ

คำสั่งทั้งหมดรันจาก root directory ของ project บน server:

```bash
cd SSO_Cancer

# ตัวแปรที่ต้องใช้ทุกคำสั่ง (ปรับ TAG ตามเวอร์ชันที่ใช้)
export TAG=v1.0.0
```

### ดูสถานะ services

```bash
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production ps
```

ผลลัพธ์ปกติ — ทุก service ต้องเป็น `Up (healthy)`:

```
NAME                STATUS              PORTS
sso_cancer-db-1     Up (healthy)        5432/tcp
sso_cancer-api-1    Up (healthy)        4000/tcp
sso_cancer-web-1    Up (healthy)        3000/tcp
sso_cancer-nginx-1  Up                  0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### ดู logs

```bash
# ดู log ทุก service (ตามแบบ real-time)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f

# ดู log เฉพาะ service
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f api
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f web
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f db
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f nginx

# ดู log 100 บรรทัดล่าสุด
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs --tail 100 api
```

### Restart services

```bash
# Restart ทุก service
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production restart

# Restart เฉพาะ API (เช่น หลังเปลี่ยน env)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production restart api
```

### หยุดระบบ

```bash
# หยุดทุก service (data ใน database ยังอยู่)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production down

# หยุดและลบ database volume ด้วย (ข้อมูลจะหายทั้งหมด!)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production down -v
```

### สำรองข้อมูล (Backup)

#### วิธีที่ 1: ผ่าน UI ของระบบ (แนะนำ)

ระบบมีหน้า **Backup & Restore** ในตัว เข้าถึงได้ที่ **Settings → Backup** (ต้องใช้ role ADMIN ขึ้นไป):

- **Download backup** — ดาวน์โหลดไฟล์ `.json.gz` ที่มีข้อมูลทุกตาราง
- **Restore** — อัปโหลดไฟล์ backup เพื่อดูตัวอย่าง (preview) ก่อน แล้วยืนยันการ restore

#### วิธีที่ 2: pg_dump (command line)

```bash
mkdir -p backups

# Backup database เป็นไฟล์ SQL
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db pg_dump -U postgres sso_cancer > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Restore จากไฟล์ backup
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db psql -U postgres sso_cancer < backups/backup_20260225_143000.sql
```

### ดูพื้นที่ Docker

```bash
docker system df           # ดูพื้นที่ที่ใช้ทั้งหมด
docker image ls            # ดู image ทั้งหมด
docker image prune -a      # ลบ image ที่ไม่ได้ใช้ (ประหยัดพื้นที่)
```

---

## 9. การแก้ปัญหา (Troubleshooting)

### ปัญหา: เข้าเว็บไม่ได้ (Connection refused)

```bash
# 1. ตรวจสอบว่า services ทำงานอยู่
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production ps

# 2. ตรวจสอบ port 80/443 ว่างอยู่
ss -tlnp | grep -E ':80|:443'

# 3. ตรวจ firewall
sudo ufw status              # Ubuntu
sudo firewall-cmd --list-all # CentOS

# เปิด port (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# เปิด port (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### ปัญหา: API ไม่ healthy

```bash
# ดู log ของ API
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs api

# ตรวจ health endpoint โดยตรง
docker exec $(docker ps -q -f name=api) wget -qO- http://127.0.0.1:4000/api/v1/health
```

สาเหตุที่พบบ่อย:
- `DB_PASSWORD` ใน `.env.production` ไม่ตรงกับที่ตั้งไว้ → แก้ไขแล้ว restart
- Database ยังไม่พร้อม → รอ 30 วินาที แล้วลองใหม่
- Migration ยังไม่ได้รัน → ดูหัวข้อ "Migration ล้มเหลว"

### ปัญหา: Migration ล้มเหลว

```bash
# รัน migration ด้วยตนเอง
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  run --rm api npx prisma migrate deploy --config dist/prisma/prisma.config.ts

# ถ้ายังไม่ได้ ให้ตรวจว่า database เชื่อมต่อได้
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "SELECT 1"
```

### ปัญหา: Seed ล้มเหลว (TSError: moduleResolution)

deploy script รัน seed ด้วย `ts-node` ซึ่งอาจล้มเหลวด้วย error:
```
TSError: Option 'moduleResolution' must be set to 'NodeNext' when option 'module' is set to 'NodeNext'
```

สัญญาณ: log แสดง `WARNING: Seed failed` แต่ deploy ยังเสร็จ services ทำงานปกติ
ผลกระทบ: ข้อมูลพื้นฐาน (ยา, โปรโตคอล, รพ. ฯลฯ) อาจไม่ถูก seed

**ตรวจสอบว่า seed ทำงานแล้วหรือยัง:**

```bash
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "SELECT count(*) FROM drugs;"
# ควรได้ค่ามากกว่า 0 (ประมาณ 98 rows)
```

**แก้ไข — seed ผ่าน database โดยตรง** (ไม่พึ่ง ts-node):

```bash
# เข้า psql แล้ว seed แต่ละไฟล์ด้วยตนเอง
for f in database/seeds/*.sql; do
  echo "Seeding $f..."
  IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
    exec -T db psql -U postgres -d sso_cancer < "$f"
done
```

> **หมายเหตุ**: SQL seed ใช้ `ON CONFLICT DO NOTHING` จึงรัน ซ้ำได้อย่างปลอดภัย

### ปัญหา: หน้าเว็บแสดง 502 Bad Gateway

nginx เชื่อมต่อกับ api หรือ web ไม่ได้:

```bash
# ตรวจว่าทุก service อยู่ใน network เดียวกัน
docker network inspect sso_cancer_app-network

# Restart ทุก service
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production down
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production up -d
```

### ปัญหา: พื้นที่เต็ม

```bash
# ดูพื้นที่
df -h

# ลบ image และ container เก่า
docker system prune -a

# ลบ log เก่าของ Docker
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

### ปัญหา: ลืมรหัสผ่าน admin

```bash
# เข้า database โดยตรง แล้ว reset password
# (ต้อง hash password ด้วย bcrypt ก่อน)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "
    UPDATE users SET
      password_hash = '\$2b\$12\$LJ3m4ys3Lg7Yt18G4WQJG.vGPqFnsgXOdGmCd7JnRqT1l/TCSeDV6',
      failed_login_attempts = 0,
      locked_until = NULL
    WHERE email = 'admin@sso-cancer.local';
  "
# รหัสผ่านจะถูก reset เป็น Admin@1234
```

---

## Quick Reference

| ต้องการ | คำสั่ง |
|---------|-------|
| Build + export tar | `bash deploy/build-and-export.sh v1.0.0` |
| Deploy จาก tar | `bash deploy/import-and-run.sh v1.0.0` |
| Deploy จาก Docker Hub | `bash deploy/pull-and-run.sh v1.0.0` |
| ดูสถานะ | `IMAGE_TAG=v1.0.0 docker compose -f docker-compose.deploy.yml --env-file .env.production ps` |
| ดู logs | `IMAGE_TAG=v1.0.0 docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f` |
| หยุดระบบ | `IMAGE_TAG=v1.0.0 docker compose -f docker-compose.deploy.yml --env-file .env.production down` |
| Backup DB (CLI) | `... exec db pg_dump -U postgres sso_cancer > backups/backup.sql` |
| Backup DB (UI) | เข้า Settings → Backup แล้วกด Download |
| เข้าสู่ระบบ | `admin@sso-cancer.local` / `Admin@1234` |
