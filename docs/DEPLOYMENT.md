# คู่มือการ Deploy — SSO Cancer Care v2

คู่มือนี้อธิบายขั้นตอนการ deploy ระบบ SSO Cancer Care ไปยัง server ของโรงพยาบาลอย่างละเอียด รองรับ 3 วิธี:

- **วิธี A**: บันทึก Docker image เป็นไฟล์ `.tar` → โอนไฟล์ไป server → deploy (สำหรับ server ที่ไม่มี internet)
- **วิธี B**: Push image ขึ้น Docker Hub → Pull จาก server → deploy (สำหรับ server ที่มี internet)
- **วิธี C**: Build image จาก source code บน server โดยตรง (สำหรับ dev/CI ที่มี source code — ใช้ `docker-compose.prod.yml`)

> **หมายเหตุ**: รองรับทั้ง **Linux Server** และ **Windows Server 2022** — ดูหัวข้อที่ 3 สำหรับ Windows

---

## สารบัญ

1. [สถาปัตยกรรมระบบ](#1-สถาปัตยกรรมระบบ)
2. [ข้อกำหนดเบื้องต้น](#2-ข้อกำหนดเบื้องต้น)
3. [ติดตั้ง Docker บน Windows Server 2022](#3-ติดตั้ง-docker-บน-windows-server-2022)
4. [เตรียม server โรงพยาบาล (ทำครั้งเดียว)](#4-เตรียม-server-โรงพยาบาล-ทำครั้งเดียว)
5. [วิธี A: Deploy ด้วยไฟล์ tar (Offline)](#5-วิธี-a-deploy-ด้วยไฟล์-tar-offline)
6. [วิธี B: Deploy ผ่าน Docker Hub (Online)](#6-วิธี-b-deploy-ผ่าน-docker-hub-online)
7. [ความปลอดภัย (Security)](#7-ความปลอดภัย-security)
8. [การนำข้อมูลจากเครื่อง Dev ไป Production](#8-การนำข้อมูลจากเครื่อง-dev-ไป-production)
9. [การอัปเดตเวอร์ชัน](#9-การอัปเดตเวอร์ชัน)
10. [คำสั่งดูแลระบบ](#10-คำสั่งดูแลระบบ)
11. [การแก้ปัญหา (Troubleshooting)](#11-การแก้ปัญหา-troubleshooting)
12. [Quick Reference](#12-quick-reference)

---

## 1. สถาปัตยกรรมระบบ

ระบบประกอบด้วย 4 Docker containers ที่ทำงานร่วมกันผ่าน internal network:

```
┌─── Server โรงพยาบาล ──────────────────────────────────────────┐
│                                                                │
│   ┌─ nginx (reverse proxy) ────────────────────────────────┐   │
│   │  port 80  → redirect ไป 443                           │   │
│   │  port 443 → SSL/TLS + HTTP/2                          │   │
│   │  /api/*   → proxy ไป api:4000                         │   │
│   │  /*       → proxy ไป web:3000                         │   │
│   │                                                        │   │
│   │  Security Headers:                                     │   │
│   │    X-Frame-Options: DENY                               │   │
│   │    HSTS: max-age=31536000                              │   │
│   │    X-Content-Type-Options: nosniff                     │   │
│   │    Referrer-Policy: strict-origin-when-cross-origin    │   │
│   │    Permissions-Policy: camera=(), microphone=()        │   │
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

### Docker Compose files

โปรเจกต์มี 4 compose files สำหรับใช้งานต่างกัน:

| ไฟล์ | ใช้เมื่อ | มี db? | มี nginx? |
|------|---------|--------|-----------|
| `docker-compose.yml` | พัฒนาบนเครื่อง dev (ใช้ `.env.docker`) | มี | ไม่มี |
| `docker-compose.prod.yml` | วิธี C: build จาก source บน server | ไม่มี (ใช้ DB ภายนอก) | มี |
| `docker-compose.deploy.yml` | วิธี A & B: deploy จาก pre-built image | มี | มี |
| `docker-compose.local.yml` | Override ports สำหรับทดสอบ Docker local | (override) | ไม่มี |

---

## 2. ข้อกำหนดเบื้องต้น

### 2.1 Server โรงพยาบาล — Linux

| รายการ | ข้อกำหนด |
|--------|---------|
| OS | Ubuntu 22.04+ / Debian 12+ / CentOS 8+ |
| Docker | 24.0+ |
| Docker Compose | v2.20+ (มากับ Docker หรือ plugin) |
| RAM | 2 GB ขึ้นไป (แนะนำ 4 GB) |
| พื้นที่ว่าง | 3 GB ขึ้นไป |
| Port ว่าง | 80, 443 (หรือกำหนดเอง) |

### 2.2 Server โรงพยาบาล — Windows Server 2022

| รายการ | ข้อกำหนด |
|--------|---------|
| OS | Windows Server 2022 (build 20348+) |
| CPU | 64-bit with virtualization (VT-x / AMD-V) เปิดใน BIOS |
| RAM | 4 GB ขึ้นไป (แนะนำ 8 GB เพราะ WSL2 ใช้ RAM เพิ่ม) |
| พื้นที่ว่าง | 5 GB ขึ้นไป |
| Software | WSL2 + Docker Desktop หรือ Docker Engine |
| Port ว่าง | 80, 443 (ต้องเปิดใน Windows Firewall) |

> **สำคัญ**: Docker containers ทั้งหมดในระบบนี้เป็น **Linux-based** (node:20-alpine, postgres:16-alpine, nginx:alpine) จึงต้องใช้ **WSL2 backend** เพื่อรัน Linux containers บน Windows Server

### 2.3 เครื่อง Dev (สำหรับ build image)

| รายการ | ข้อกำหนด |
|--------|---------|
| Docker | 24.0+ |
| Docker Compose | v2.20+ |
| Git | 2.39+ |
| Node.js | 20+ (สำหรับ dev เท่านั้น) |
| RAM ว่าง | 4 GB (ขณะ build) |
| พื้นที่ว่าง | 5 GB (สำหรับ image + tar) |

### ตรวจสอบ Docker

```bash
docker --version          # Docker version 24.x+
docker compose version    # Docker Compose version v2.x+
```

ถ้ายังไม่ได้ติดตั้ง Docker:
- **Linux**: https://docs.docker.com/engine/install/
- **Windows Server 2022**: ดูหัวข้อที่ 3

---

## 3. ติดตั้ง Docker บน Windows Server 2022

> **หมายเหตุ**: Docker Desktop ไม่ได้ support Windows Server อย่างเป็นทางการ (รองรับเฉพาะ Windows 10/11 Pro/Enterprise) แต่สามารถติดตั้งและใช้งานได้ผ่าน WSL2 backend ซึ่งใช้งานจริงในหลายองค์กร

### 3.1 วิธีที่ 1: WSL2 + Docker Desktop (แนะนำ)

เหมาะสำหรับ server ที่ต้องการ GUI สำหรับจัดการ containers และมี internet access

#### ขั้นตอนที่ 1: ติดตั้ง WSL2

เปิด **PowerShell** ด้วยสิทธิ์ **Administrator**:

```powershell
# ติดตั้ง WSL2 + Ubuntu (default distro)
wsl --install
```

**Restart server** เมื่อคำสั่งเสร็จ

หลัง restart จะมี terminal เปิดขึ้นมาอัตโนมัติ ให้ตั้ง username และ password สำหรับ Linux:

```
Enter new UNIX username: sso-admin
New password: ********
```

#### ขั้นตอนที่ 2: ติดตั้ง Docker Desktop

1. ดาวน์โหลด **Docker Desktop for Windows** จาก https://www.docker.com/products/docker-desktop
2. รันตัวติดตั้ง — **เลือก "Use WSL 2 instead of Hyper-V"**
3. Restart เมื่อเสร็จ
4. เปิด Docker Desktop → ลงทะเบียน Docker Hub account (ฟรี) ถ้ายังไม่มี
5. รอจนเห็นสถานะ "Docker Desktop is running" (ไอคอนสีเขียวที่ system tray)

#### ขั้นตอนที่ 3: ตรวจสอบ

เปิด **PowerShell** หรือ **Command Prompt**:

```powershell
docker --version
# Docker version 27.x.x

docker compose version
# Docker Compose version v2.x.x

docker run --rm hello-world
# Hello from Docker!
```

> **Docker Desktop License**: Docker Desktop ฟรีสำหรับองค์กรขนาดเล็ก (< 250 พนักงาน, < $10M revenue) สำหรับองค์กรขนาดใหญ่ต้องซื้อ subscription — ดูวิธีที่ 2 เป็นทางเลือก

### 3.2 วิธีที่ 2: Docker Engine ใน WSL2 โดยตรง (ไม่ต้อง Docker Desktop)

เหมาะสำหรับ production ที่ไม่ต้องการ GUI หรือไม่ต้องการ Docker Desktop license

#### ขั้นตอนที่ 1: ติดตั้ง WSL2

```powershell
# เปิด PowerShell ด้วยสิทธิ์ Administrator
wsl --install
```

**Restart server** → ตั้ง username/password

#### ขั้นตอนที่ 2: ติดตั้ง Docker Engine ใน WSL

เปิด **WSL terminal** (พิมพ์ `wsl` ใน PowerShell):

```bash
# อัปเดต packages
sudo apt update && sudo apt upgrade -y

# ติดตั้ง Docker Engine ด้วย convenience script
curl -fsSL https://get.docker.com | sudo sh

# เพิ่ม user ปัจจุบันเข้า docker group (ไม่ต้อง sudo ทุกครั้ง)
sudo usermod -aG docker $USER

# ติดตั้ง Docker Compose plugin
sudo apt install -y docker-compose-plugin

# เริ่ม Docker service
sudo service docker start

# ออกแล้วเข้าใหม่เพื่อให้ group มีผล
exit
```

เปิด WSL ใหม่แล้วตรวจสอบ:

```bash
wsl

docker --version
docker compose version
docker run --rm hello-world
```

#### ขั้นตอนที่ 3: ตั้ง Docker auto-start

Docker service ไม่ได้ start อัตโนมัติใน WSL2 ต้องตั้งค่าเพิ่ม:

```bash
# สร้างไฟล์ /etc/wsl.conf
sudo tee /etc/wsl.conf > /dev/null << 'EOF'
[boot]
command = service docker start
EOF
```

จากนั้นใน **PowerShell** (ฝั่ง Windows):

```powershell
# Restart WSL เพื่อให้ config มีผล
wsl --shutdown
wsl
```

### 3.3 ตรวจสอบการติดตั้ง

ไม่ว่าจะใช้วิธีที่ 1 หรือ 2 ต้องตรวจสอบว่า:

```bash
# ตรวจ Docker
docker --version          # ต้องได้ 24.x+
docker compose version    # ต้องได้ v2.x+

# ตรวจว่ารัน Linux containers ได้
docker run --rm alpine cat /etc/os-release
# NAME="Alpine Linux"

# ตรวจ disk space
docker system df
```

### 3.4 ข้อจำกัดและข้อควรระวังบน Windows Server

#### Path mapping

ใน WSL2 ไฟล์ใน Windows drive จะถูก mount ที่ `/mnt/c/`, `/mnt/d/` ฯลฯ:

```bash
# Windows path:  C:\Users\admin\SSO_Cancer
# WSL path:      /mnt/c/Users/admin/SSO_Cancer
cd /mnt/c/Users/admin/SSO_Cancer
```

> **แนะนำ**: Clone repo ไว้ใน WSL filesystem (`~/SSO_Cancer`) แทน `/mnt/c/...` จะได้ performance ดีกว่ามาก (I/O เร็วกว่า 3-5 เท่า)

#### Windows Firewall

ต้องเปิด port 80 และ 443 ใน Windows Firewall:

```powershell
# เปิด PowerShell ด้วยสิทธิ์ Administrator
New-NetFirewallRule -DisplayName "SSO Cancer HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "SSO Cancer HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
```

#### Line endings

Windows ใช้ CRLF แต่ Docker containers ใช้ LF — ต้องตั้ง git ก่อน clone:

```bash
# ใน WSL terminal
git config --global core.autocrlf input
```

#### WSL2 Memory

WSL2 จะใช้ RAM สูงสุด 50% ของ host ถ้าต้องการจำกัด:

```powershell
# สร้างไฟล์ C:\Users\<username>\.wslconfig
notepad $env:USERPROFILE\.wslconfig
```

ใส่เนื้อหา:

```ini
[wsl2]
memory=4GB
swap=2GB
```

จากนั้น restart WSL: `wsl --shutdown`

---

## 4. เตรียม server โรงพยาบาล (ทำครั้งเดียว)

### 4.1 โอนไฟล์ project ไป server

โครงสร้างไฟล์ที่ต้องมีบน server:

```
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
└── database/seeds/              # SQL seed files (ใช้ fallback ถ้า seed.js fail)
```

วิธีง่ายที่สุดคือ `git clone` ทั้ง repo แล้วทำงานจาก root directory:

```bash
git clone https://github.com/peaknext/SSO_Cancer.git
cd SSO_Cancer
```

> **Windows Server**: ให้ clone ใน WSL terminal (`wsl`) ไม่ใช่ PowerShell — เพื่อป้องกันปัญหา line endings

### 4.2 สร้างไฟล์ `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production    # หรือใช้ vi / notepad
```

#### ค่าที่ต้องแก้ไข (ทุกรายการ)

| กลุ่ม | ตัวแปร | คำอธิบาย | ตัวอย่าง |
|-------|--------|----------|---------|
| **Database** | `DB_PASSWORD` | รหัสผ่าน PostgreSQL (ตั้งให้ซับซ้อน) | `Str0ng!P@ssw0rd#2026` |
| | `POSTGRES_DB` | ชื่อ database | `sso_cancer` |
| | `POSTGRES_USER` | ชื่อ user | `postgres` |
| **JWT** | `JWT_SECRET` | Secret สำหรับ access token | สร้างด้วยคำสั่งด้านล่าง |
| | `JWT_REFRESH_SECRET` | Secret สำหรับ refresh token | สร้างด้วยคำสั่งด้านล่าง |
| **App** | `CORS_ORIGIN` | URL ของระบบ (ตรงกับ hostname) | `https://192.168.1.100` |
| **Encryption** | `SETTINGS_ENCRYPTION_KEY` | คีย์เข้ารหัส API keys, HIS credentials | สร้างด้วยคำสั่งด้านล่าง |
| | `BACKUP_ENCRYPTION_KEY` | คีย์เข้ารหัสไฟล์ backup | สร้างด้วยคำสั่งด้านล่าง |

#### สร้าง secrets

```bash
# รันบน server หรือเครื่อง dev แล้วคัดลอกค่าไปใส่ใน .env.production
openssl rand -hex 32    # ← JWT_SECRET
openssl rand -hex 32    # ← JWT_REFRESH_SECRET
openssl rand -hex 32    # ← SETTINGS_ENCRYPTION_KEY
openssl rand -hex 32    # ← BACKUP_ENCRYPTION_KEY
```

> **สำคัญ**: ค่าทุกตัวต้องเป็น hex string 64 ตัวอักษร (256 bits) — ห้ามใช้ค่าเดิมจากตัวอย่าง

#### ค่าเสริม (optional)

| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|--------|------------|---------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | `5` | ล็อก account หลังใส่ผิด N ครั้ง |
| `LOCKOUT_DURATION_SECONDS` | `900` | ล็อกนาน N วินาที (900 = 15 นาที) |
| `MAX_CONCURRENT_SESSIONS` | `5` | จำนวน session พร้อมกันสูงสุดต่อ user |
| `JWT_ACCESS_TTL` | `15m` | อายุ access token |
| `JWT_REFRESH_TTL` | `7d` | อายุ refresh token |
| `PASSWORD_HISTORY_COUNT` | `5` | ห้ามใช้ N รหัสผ่านล่าสุดซ้ำ |
| `SESSION_INACTIVITY_TIMEOUT` | `1800` | Session หมดอายุหลังไม่ใช้งาน N วินาที (1800 = 30 นาที) |
| `NGINX_HTTP_PORT` | `80` | port HTTP (เปลี่ยนถ้า 80 ไม่ว่าง) |
| `NGINX_HTTPS_PORT` | `443` | port HTTPS |
| `IMAGE_TAG` | `latest` | เวอร์ชัน image (วิธี B) |
| `IMAGE_REGISTRY` | `peaknext/` | Docker Hub username ตามด้วย `/` (วิธี B) |

#### ตัวอย่าง `.env.production` ที่พร้อมใช้งาน

```ini
# ─── Database ────────────────────────────────────────────
DB_PASSWORD=Str0ng!P@ssw0rd#2026
POSTGRES_DB=sso_cancer
POSTGRES_USER=postgres

# ─── JWT Secrets (สร้างด้วย: openssl rand -hex 32) ──────
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
SESSION_INACTIVITY_TIMEOUT=1800

# ─── Encryption (สร้างด้วย: openssl rand -hex 32) ───────
SETTINGS_ENCRYPTION_KEY=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
BACKUP_ENCRYPTION_KEY=f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5

# ─── Docker Image (วิธี B เท่านั้น) ──────────────────────
IMAGE_TAG=latest
IMAGE_REGISTRY=peaknext/
```

> **คำเตือน**: ค่า JWT_SECRET, encryption keys ด้านบนเป็น **ตัวอย่างเท่านั้น** — ต้องสร้างค่าใหม่ด้วย `openssl rand -hex 32`

> **CORS_ORIGIN**: ห้ามใช้ `*` (wildcard) — API จะ **ปิดตัวเองทันที** ตอน startup ถ้าพบ `CORS_ORIGIN=*` ใน production

### 4.3 สร้าง SSL Certificate

#### กรณีมี certificate จริงจากโรงพยาบาล (แนะนำ)

```bash
mkdir -p deploy/nginx/ssl
cp /path/to/hospital-cert.pem deploy/nginx/ssl/cert.pem
cp /path/to/hospital-key.pem  deploy/nginx/ssl/key.pem
```

#### กรณีใช้ self-signed certificate (สำหรับทดสอบ)

```bash
mkdir -p deploy/nginx/ssl

openssl req -x509 -nodes -days 365 -newkey rsa:4096 \
  -keyout deploy/nginx/ssl/key.pem \
  -out deploy/nginx/ssl/cert.pem \
  -subj '/CN=sso-cancer.hospital.local'
```

> **หมายเหตุ**: Self-signed cert จะทำให้ browser แสดงคำเตือน "Your connection is not private" — ผู้ใช้ต้องกด **Advanced** → **Proceed** เพื่อเข้าใช้งาน

> **Windows Server**: รันคำสั่งนี้ใน WSL terminal (OpenSSL มีอยู่แล้วใน Ubuntu) ไม่ใช่ PowerShell

---

## 5. วิธี A: Deploy ด้วยไฟล์ tar (Offline)

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

```bash
cd SSO_Cancer

# Build แบบไม่ระบุ tag (ใช้ latest)
bash deploy/build-and-export.sh

# หรือ Build แบบระบุ version tag
bash deploy/build-and-export.sh v2.0.0e
```

สิ่งที่เกิดขึ้น:

| Step | สิ่งที่เกิดขึ้น |
|------|---------------|
| 1/3 | Build image `sso-cancer-api:v2.0.0e` จาก `apps/api/Dockerfile` |
| 2/3 | Build image `sso-cancer-web:v2.0.0e` จาก `apps/web/Dockerfile` (build-arg: `NEXT_PUBLIC_API_URL=""`, `API_INTERNAL_URL=http://api:4000`) |
| 3/3 | บันทึกทั้ง 2 image เป็นไฟล์ `sso-cancer-images-v2.0.0e.tar` |

ผลลัพธ์:

```
=== Done! ===
File: sso-cancer-images-v2.0.0e.tar (850M)
```

> ขนาดไฟล์ประมาณ 800 MB – 1 GB

### ขั้นตอนที่ 2: โอนไฟล์ไป server

#### ผ่าน SCP (ถ้ามี SSH)

```bash
scp sso-cancer-images-v2.0.0e.tar user@192.168.1.100:/home/user/SSO_Cancer/
```

#### ผ่าน USB drive

1. คัดลอก `sso-cancer-images-v2.0.0e.tar` ลง USB
2. เสียบ USB ที่ server
3. คัดลอกไฟล์ไปที่ `/home/user/SSO_Cancer/` (หรือ directory ที่ clone repo ไว้)

> **Windows Server**: คัดลอกไฟล์ไปที่ WSL filesystem เช่น `\\wsl$\Ubuntu\home\sso-admin\SSO_Cancer\` หรือใช้ `cp /mnt/d/sso-cancer-images-v2.0.0e.tar ~/SSO_Cancer/` ใน WSL

### ขั้นตอนที่ 3: Deploy บน server

SSH เข้า server (หรือเปิด WSL terminal บน Windows Server):

```bash
cd SSO_Cancer

# ตรวจสอบว่าไฟล์ tar อยู่ใน directory
ls -lh sso-cancer-images-v2.0.0e.tar

# Deploy!
bash deploy/import-and-run.sh v2.0.0e
```

script จะทำสิ่งต่อไปนี้โดยอัตโนมัติ:

| ขั้นตอน | สิ่งที่เกิดขึ้น |
|---------|---------------|
| Pre-flight | ตรวจ `.env.production`, ไฟล์ tar, SSL cert (auto-gen ถ้าไม่มี) |
| 1/4 | `docker load` — import image จากไฟล์ tar |
| 2/4 | หยุด services เดิม (ถ้ามี) |
| 3/4 | เริ่ม database → รอ `pg_isready` (สูงสุด 60 วินาที) → Prisma migration → database seed |
| 4/4 | เริ่ม services ทั้งหมด (db → api → web → nginx) |
| Health check | รอ 30 วินาที แล้วตรวจ `https://localhost/api/v1/health` |

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
4. **เปลี่ยนรหัสผ่านทันที** — ระบบมี `mustChangePassword` flag บังคับให้เปลี่ยนรหัสผ่านตอนเข้าใช้งานครั้งแรก

---

## 6. วิธี B: Deploy ผ่าน Docker Hub (Online)

เหมาะสำหรับ server ที่ **มีอินเทอร์เน็ต** และต้องการ deploy/อัปเดตได้สะดวก

### ภาพรวมขั้นตอน

```
เครื่อง Dev                  Docker Hub                Server โรงพยาบาล
──────────                  ──────────                ──────────────────
1. git tag + push    ──►    2. GitHub Actions
                            build & push image  ──►   3. docker pull
                                                      4. docker compose up
```

### เตรียมการ (ทำครั้งเดียว)

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

ใน `.env.production` ตรวจสอบให้ตรงกับ Docker Hub username:

```ini
# ใส่ Docker Hub username ตามด้วย / (trailing slash)
IMAGE_REGISTRY=peaknext/
```

### Deploy

#### วิธี 1: Push tag อัตโนมัติ (แนะนำ)

บนเครื่อง dev:

```bash
cd SSO_Cancer

# สร้าง git tag
git tag v2.0.0e

# Push tag ไป GitHub → trigger GitHub Actions อัตโนมัติ
git push origin v2.0.0e
```

**GitHub Actions จะทำงานอัตโนมัติ** (~8-10 นาที):
1. Build image `peaknext/sso-cancer-api:v2.0.0e` + `:latest`
2. Build image `peaknext/sso-cancer-web:v2.0.0e` + `:latest`
3. Push ทั้ง 2 image ขึ้น Docker Hub

ตรวจสอบสถานะ: ไปที่ GitHub repo → **Actions** tab → ดู workflow run

เมื่อ build เสร็จแล้ว SSH เข้า server (หรือเปิด WSL terminal บน Windows Server):

```bash
cd SSO_Cancer

bash deploy/pull-and-run.sh v2.0.0e
```

#### วิธี 2: Trigger manual จาก GitHub UI

1. ไปที่ GitHub repo → **Actions** → **Build & Push Docker Images**
2. กด **Run workflow**
3. ใส่ tag เช่น `v2.0.0e` → กด **Run workflow**
4. รอ build เสร็จ → SSH เข้า server → `bash deploy/pull-and-run.sh v2.0.0e`

### สิ่งที่ `pull-and-run.sh` ทำ

| ขั้นตอน | สิ่งที่เกิดขึ้น |
|---------|---------------|
| Pre-flight | ตรวจ `.env.production`, `IMAGE_REGISTRY`, SSL cert (auto-gen ถ้าไม่มี) |
| 1/4 | `docker compose pull api web` — ดึง image จาก Docker Hub |
| 2/4 | หยุด services เดิม (ถ้ามี) |
| 3/4 | เริ่ม database → รอ `pg_isready` (สูงสุด 60 วินาที) → Prisma migration → database seed |
| 4/4 | เริ่ม services ทั้งหมด |
| Health check | ตรวจ `https://localhost/api/v1/health` |

---

## 7. ความปลอดภัย (Security)

ระบบมีการ hardening ตาม security audit ครอบคลุมหลายด้าน:

### 7.1 Encryption Keys

| ตัวแปร | ใช้เข้ารหัส | ผลถ้าไม่ตั้ง |
|--------|------------|-------------|
| `SETTINGS_ENCRYPTION_KEY` | API keys, HIS credentials ใน app_settings (AES-256-GCM) | เก็บเป็น plain text |
| `BACKUP_ENCRYPTION_KEY` | ไฟล์ backup `.json.gz` (AES-256-GCM with SSOENC header) | backup ไม่ถูกเข้ารหัส |

- ทั้งสองต้องเป็น **256-bit hex** (64 ตัวอักษร)
- สร้างด้วย: `openssl rand -hex 32`
- ถ้าย้ายข้อมูลไป server ใหม่ **ต้องใช้ key เดิม** ในการ decrypt ข้อมูลที่เข้ารหัสไว้

### 7.2 CORS Configuration

```ini
# ถูกต้อง — ระบุ origin ที่ชัดเจน
CORS_ORIGIN=https://192.168.1.100

# ผิด — API จะปิดตัวเองทันทีตอน startup
CORS_ORIGIN=*
```

> **สำคัญ**: ใน production ถ้าตั้ง `CORS_ORIGIN=*` API จะ exit ทันทีพร้อม error message

### 7.3 Session & Authentication

| ตัวแปร | ค่าเริ่มต้น | พฤติกรรม |
|--------|------------|---------|
| `MAX_FAILED_LOGIN_ATTEMPTS` | 5 | ใส่รหัสผ่านผิด 5 ครั้ง → ล็อก account |
| `LOCKOUT_DURATION_SECONDS` | 900 | ล็อกนาน 15 นาที |
| `MAX_CONCURRENT_SESSIONS` | 5 | เกิน 5 sessions → ลบ session เก่าสุด |
| `SESSION_INACTIVITY_TIMEOUT` | 1800 | ไม่ใช้งาน 30 นาที → session หมดอายุ |
| `PASSWORD_HISTORY_COUNT` | 5 | ห้ามใช้ 5 รหัสผ่านล่าสุดซ้ำ |
| `JWT_ACCESS_TTL` | 15m | อายุ access token |
| `JWT_REFRESH_TTL` | 7d | อายุ refresh token |

### 7.4 nginx Security Headers

nginx ถูกตั้งค่า security headers ดังนี้ (อยู่ใน `deploy/nginx/nginx.conf`):

```nginx
# ป้องกัน clickjacking
add_header X-Frame-Options "DENY" always;

# ป้องกัน MIME sniffing
add_header X-Content-Type-Options "nosniff" always;

# บังคับ HTTPS 1 ปี
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# ปิด XSS filter (deprecated, อาจเป็น attack vector)
add_header X-XSS-Protection "0" always;

# จำกัด Referrer
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# ปิด camera, microphone, geolocation
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

**HTTP/2** เปิดใช้งาน: `listen 443 ssl http2;`

### 7.5 SSL/TLS

| รายการ | ค่า |
|--------|-----|
| Protocols | TLSv1.2 + TLSv1.3 เท่านั้น |
| Ciphers | `HIGH:!aNULL:!MD5` |
| Self-signed | RSA 4096 bit, 365 วัน |
| Max upload | `client_max_body_size 50M` |

### 7.6 First Login

- Default admin: `admin@sso-cancer.local` / `Admin@1234`
- ระบบมี `mustChangePassword` flag — **ต้องเปลี่ยนรหัสผ่านทันที** หลังเข้าสู่ระบบครั้งแรก
- รหัสผ่านใหม่ต้องไม่ซ้ำกับ 5 รหัสผ่านล่าสุด

---

## 8. การนำข้อมูลจากเครื่อง Dev ไป Production

เมื่อ deploy ปกติ (วิธี A หรือ B) ระบบจะรัน Prisma migration เพื่อสร้าง schema + seed ข้อมูลพื้นฐาน (~1,700 rows: รหัสยา, โปรโตคอล, staging ฯลฯ) ให้อัตโนมัติ

แต่ถ้าต้องการนำ **ข้อมูลจริง** ที่มีอยู่ในเครื่อง dev (เช่น ข้อมูลผู้ป่วยที่ import, protocol analysis ที่ทำไปแล้ว, billing claims ฯลฯ) ไปที่ production ด้วย ให้ทำตามขั้นตอนนี้

### เลือกวิธีที่เหมาะสม

| สถานการณ์ | วิธีที่เหมาะ |
|-----------|------------|
| Production ใหม่ ต้องการเฉพาะข้อมูลพื้นฐาน | ไม่ต้องทำอะไร — migration + seed ทำให้อัตโนมัติ |
| ต้องการนำข้อมูลจริงทั้งหมดจาก dev ไป production | **วิธี 1: Full dump/restore** |
| ต้องการนำเฉพาะข้อมูลบางตาราง | **วิธี 2: Selective dump** |
| ย้ายข้อมูลจาก production เก่าไป production ใหม่ | **วิธี 1: Full dump/restore** |
| ใช้ Backup/Restore ในระบบ (UI) | **วิธี 3: Backup via UI** (แนะนำ) |

### วิธี 1: Full Database Dump/Restore

#### Export จากเครื่อง Dev

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

# Dump จาก Docker container
docker compose exec db pg_dump -U postgres -F c sso_cancer > backups/sso_cancer_export.dump
```

#### Restore บน server

```bash
cd SSO_Cancer
export TAG=v2.0.0e

# Deploy ระบบก่อน (ถ้ายังไม่ได้)
bash deploy/import-and-run.sh v2.0.0e    # วิธี A
# หรือ
bash deploy/pull-and-run.sh v2.0.0e      # วิธี B

# Restore (custom format)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db pg_restore -U postgres -d sso_cancer --clean --if-exists < backups/sso_cancer_export.dump

# Reset sequences
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

# ล้าง sessions เก่า (JWT secret ต่างกัน — sessions จาก dev ใช้ไม่ได้)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "DELETE FROM sessions;"

# Restart API
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production restart api

# ตรวจ health
sleep 10 && curl -sk https://localhost/api/v1/health
```

### วิธี 2: Selective Dump (เฉพาะบางตาราง)

```bash
# Export เฉพาะตารางข้อมูลผู้ป่วย
pg_dump -U postgres -d sso_cancer \
  -t patient_imports -t patient_visits -t visit_medications \
  -t ai_suggestions -t patients -t patient_cases \
  -t visit_billing_claims -t visit_billing_items \
  --data-only > backups/patient_data_export.sql
```

> **`--data-only`**: Export เฉพาะข้อมูล (INSERT statements) ไม่รวม schema — เพราะ migration สร้าง schema ให้แล้ว

Restore:

```bash
# Deploy ตามปกติก่อน (migration + seed สร้าง schema + ข้อมูลพื้นฐาน)
bash deploy/import-and-run.sh v2.0.0e

# จากนั้น restore ข้อมูลผู้ป่วยทับลงไป
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db psql -U postgres -d sso_cancer < backups/patient_data_export.sql
```

### วิธี 3: Backup via UI (แนะนำ)

ระบบมีหน้า **Settings → Backup** ในตัว (ต้อง role SUPER_ADMIN):

1. **เครื่อง Dev**: เข้า Settings → Backup → กด **Download** ได้ไฟล์ `.json.gz`
2. **โอนไฟล์** ไป server ผ่าน SCP/USB
3. **Server**: เข้า Settings → Backup → **Upload** ไฟล์ → **Preview** ตรวจสอบ → **Confirm**

> **Backup encryption**: ถ้าเครื่อง Dev มี `BACKUP_ENCRYPTION_KEY` ตั้งไว้ backup จะถูกเข้ารหัส — server ต้องใช้ **key เดียวกัน** ในการ restore
>
> **ขนาดไฟล์สูงสุด**: 50 MB

### สิ่งที่ต้องระวัง

1. **Password hash**: ใช้ bcrypt ไม่ผูกกับ server — hash จาก dev ใช้ได้บน production
2. **JWT Secret ต่างกัน**: Sessions จาก dev ใช้ไม่ได้บน production (ถูกต้อง) — ล้าง sessions หลัง restore
3. **Encryption key ต่างกัน**: ถ้า encryption key ของ dev กับ production ไม่ตรงกัน → ข้อมูลที่เข้ารหัสใน `app_settings` จะอ่านไม่ได้
4. **Sequence reset**: หลัง restore ต้อง reset sequences ทุกครั้ง (ดูคำสั่งด้านบน)

### ขนาดไฟล์ dump

| ปริมาณข้อมูล | ขนาดไฟล์โดยประมาณ |
|-------------|------------------|
| ข้อมูลพื้นฐาน (seed เท่านั้น) | ~800 KB (.dump) / ~3 MB (.sql) |
| + ผู้ป่วย 1,000 visits | ~2 MB (.dump) / ~8 MB (.sql) |
| + ผู้ป่วย 10,000 visits | ~10 MB (.dump) / ~40 MB (.sql) |
| + ผู้ป่วย 100,000 visits | ~80 MB (.dump) / ~300 MB (.sql) |

---

## 9. การอัปเดตเวอร์ชัน

### อัปเดตด้วยไฟล์ tar (วิธี A)

บนเครื่อง dev:

```bash
bash deploy/build-and-export.sh v2.1.0
scp sso-cancer-images-v2.1.0.tar user@192.168.1.100:/home/user/SSO_Cancer/
```

บน server:

```bash
cd SSO_Cancer
bash deploy/import-and-run.sh v2.1.0
```

> Script จะหยุด services เดิม → load image ใหม่ → รัน migration → seed → เริ่ม services ใหม่

### อัปเดตผ่าน Docker Hub (วิธี B)

บนเครื่อง dev:

```bash
git tag v2.1.0
git push origin v2.1.0
# รอ GitHub Actions build เสร็จ (~8-10 นาที)
```

บน server:

```bash
cd SSO_Cancer
bash deploy/pull-and-run.sh v2.1.0
```

### Rollback (ย้อนกลับเวอร์ชัน)

```bash
# ย้อนกลับไปเวอร์ชันก่อนหน้า
bash deploy/import-and-run.sh v2.0.0e    # วิธี A
bash deploy/pull-and-run.sh v2.0.0e      # วิธี B
```

> Image เก่าจะยังอยู่ใน Docker cache ไม่ต้อง build ใหม่

> **คำเตือน**: Rollback จะ **ไม่** revert database migrations ที่รันไปแล้ว — ถ้า migration เพิ่ม column ใหม่ ข้อมูลจะยังอยู่

---

## 10. คำสั่งดูแลระบบ

คำสั่งทั้งหมดรันจาก root directory ของ project บน server:

```bash
cd SSO_Cancer

# ตั้งตัวแปร TAG (ปรับตามเวอร์ชันที่ใช้)
export TAG=v2.0.0e
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
# ดู log ทุก service (real-time)
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

# Restart เฉพาะ API (เช่น หลังเปลี่ยน .env.production)
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

เข้าระบบด้วย role SUPER_ADMIN → **Settings → Backup**:

- **Download backup** — ได้ไฟล์ `.json.gz` (เข้ารหัสด้วย `BACKUP_ENCRYPTION_KEY` ถ้าตั้งไว้)
- **Restore** — อัปโหลดไฟล์ backup → Preview → Confirm

> **ขนาดไฟล์สูงสุด**: 50 MB

#### วิธีที่ 2: pg_dump (command line)

```bash
mkdir -p backups

# Backup database
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db pg_dump -U postgres -F c sso_cancer > backups/backup_$(date +%Y%m%d_%H%M%S).dump

# Restore จาก backup
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec -T db pg_restore -U postgres -d sso_cancer --clean --if-exists < backups/backup_20260303_143000.dump
```

### รัน migration ด้วยมือ

```bash
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  run --rm api npx prisma migrate deploy --config dist/prisma/prisma.config.ts
```

### รัน seed ด้วยมือ

```bash
# วิธี 1: ผ่าน seed.js (pre-compiled ใน image)
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  run --rm api node prisma/seed.js

# วิธี 2: รัน SQL seed ตรงๆ (fallback ถ้า seed.js ล้มเหลว)
for f in database/seeds/*.sql; do
  echo "Seeding $f..."
  IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
    exec -T db psql -U postgres -d sso_cancer < "$f"
done
```

> SQL seed ใช้ `ON CONFLICT DO NOTHING` จึงรันซ้ำได้อย่างปลอดภัย

### ดูพื้นที่ Docker

```bash
docker system df           # ดูพื้นที่ที่ใช้ทั้งหมด
docker image ls            # ดู image ทั้งหมด
docker image prune -a      # ลบ image ที่ไม่ได้ใช้ (ประหยัดพื้นที่)
```

---

## 11. การแก้ปัญหา (Troubleshooting)

### เข้าเว็บไม่ได้ (Connection refused)

```bash
# 1. ตรวจสอบว่า services ทำงานอยู่
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production ps

# 2. ตรวจสอบ port 80/443 ว่างอยู่
ss -tlnp | grep -E ':80|:443'    # Linux
netstat -an | findstr ":80 :443"  # Windows (PowerShell)

# 3. ตรวจ firewall
sudo ufw status              # Ubuntu
sudo firewall-cmd --list-all # CentOS
```

เปิด port (Ubuntu):

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

เปิด port (Windows Server — PowerShell Administrator):

```powershell
New-NetFirewallRule -DisplayName "SSO Cancer HTTP" -Direction Inbound -Port 80 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "SSO Cancer HTTPS" -Direction Inbound -Port 443 -Protocol TCP -Action Allow
```

### API ไม่ healthy

```bash
# ดู log ของ API
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production logs api

# ตรวจ health endpoint โดยตรง
docker exec $(docker ps -q -f name=api) wget -qO- http://127.0.0.1:4000/api/v1/health
```

สาเหตุที่พบบ่อย:
- `DB_PASSWORD` ใน `.env.production` ไม่ตรง → แก้ไขแล้ว restart
- `CORS_ORIGIN=*` → API จะ exit ทันที — ดู log จะเห็น error message
- Database ยังไม่พร้อม → รอสักครู่แล้วตรวจใหม่
- Migration ยังไม่ได้รัน → ดูหัวข้อ "Migration ล้มเหลว"

### Migration ล้มเหลว

```bash
# รัน migration ด้วยตนเอง
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  run --rm api npx prisma migrate deploy --config dist/prisma/prisma.config.ts

# ถ้ายังไม่ได้ ให้ตรวจว่า database เชื่อมต่อได้
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "SELECT 1"
```

### Seed ล้มเหลว

สัญญาณ: log แสดง `ERROR: Seed failed!` แต่ deploy ยังเสร็จ services ทำงานปกติ
ผลกระทบ: ข้อมูลพื้นฐาน (ยา, โปรโตคอล, รพ. ฯลฯ) อาจไม่ถูก seed

```bash
# ตรวจสอบว่า seed ทำงานแล้วหรือยัง
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "SELECT count(*) FROM drugs;"
# ควรได้ค่ามากกว่า 0 (ประมาณ 98 rows)

# แก้ไข — seed ผ่าน database โดยตรง (ไม่พึ่ง Node.js)
for f in database/seeds/*.sql; do
  echo "Seeding $f..."
  IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
    exec -T db psql -U postgres -d sso_cancer < "$f"
done
```

### หน้าเว็บแสดง 502 Bad Gateway

nginx เชื่อมต่อกับ api หรือ web ไม่ได้:

```bash
# ตรวจว่าทุก service อยู่ใน network เดียวกัน
docker network inspect sso_cancer_app-network

# Restart ทุก service
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production down
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production up -d
```

### พื้นที่เต็ม

```bash
# ดูพื้นที่
df -h

# ลบ image และ container เก่า
docker system prune -a

# ลบ log เก่าของ Docker (Linux)
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

### ลืมรหัสผ่าน admin

```bash
# Reset password เป็น Admin@1234
IMAGE_TAG=$TAG docker compose -f docker-compose.deploy.yml --env-file .env.production \
  exec db psql -U postgres -d sso_cancer -c "
    UPDATE users SET
      password_hash = '\$2b\$12\$LJ3m4ys3Lg7Yt18G4WQJG.vGPqFnsgXOdGmCd7JnRqT1l/TCSeDV6',
      failed_login_attempts = 0,
      locked_until = NULL,
      must_change_password = true
    WHERE email = 'admin@sso-cancer.local';
  "
# รหัสผ่านจะถูก reset เป็น Admin@1234 (ต้องเปลี่ยนทันทีหลังเข้าสู่ระบบ)
```

### ปัญหาเฉพาะ Windows Server

#### WSL2 ไม่ forward port ให้เครื่องอื่นเข้าถึง

WSL2 ใช้ NAT network — port ที่เปิดใน WSL อาจไม่ถูก forward ไป host โดยอัตโนมัติ

**วิธีแก้ (Docker Desktop)**: Docker Desktop จัดการ port forwarding ให้อัตโนมัติ — ปกติไม่มีปัญหา

**วิธีแก้ (Docker Engine ใน WSL2)**: ต้องทำ port proxy ด้วยมือ:

```powershell
# เปิด PowerShell ด้วยสิทธิ์ Administrator
# หา IP ของ WSL2
wsl hostname -I
# ได้เช่น 172.21.80.1

# ตั้ง port proxy
netsh interface portproxy add v4tov4 listenport=80 listenaddress=0.0.0.0 connectport=80 connectaddress=172.21.80.1
netsh interface portproxy add v4tov4 listenport=443 listenaddress=0.0.0.0 connectport=443 connectaddress=172.21.80.1

# ตรวจสอบ
netsh interface portproxy show all
```

> **หมายเหตุ**: IP ของ WSL2 อาจเปลี่ยนหลัง restart — ต้องรัน script ใหม่หรือตั้ง Task Scheduler

#### Docker service ไม่ auto-start ใน WSL2

```bash
# ตรวจว่า /etc/wsl.conf มี boot command
cat /etc/wsl.conf
# ต้องมี:
# [boot]
# command = service docker start

# ถ้าไม่มี ให้เพิ่ม:
sudo tee /etc/wsl.conf > /dev/null << 'EOF'
[boot]
command = service docker start
EOF

# Restart WSL (ฝั่ง PowerShell)
wsl --shutdown
wsl
```

#### Line ending issues

ถ้า script รันแล้วเจอ error เช่น `/bin/bash^M: bad interpreter`:

```bash
# แก้ line endings ของ deploy scripts
sudo apt install -y dos2unix
dos2unix deploy/*.sh
```

#### Permission denied ใน WSL

```bash
# ให้สิทธิ์ execute กับ deploy scripts
chmod +x deploy/*.sh
```

---

## 12. Quick Reference

| ต้องการ | คำสั่ง |
|---------|-------|
| Build + export tar | `bash deploy/build-and-export.sh v2.0.0e` |
| Deploy จาก tar | `bash deploy/import-and-run.sh v2.0.0e` |
| Deploy จาก Docker Hub | `bash deploy/pull-and-run.sh v2.0.0e` |
| ดูสถานะ | `IMAGE_TAG=v2.0.0e docker compose -f docker-compose.deploy.yml --env-file .env.production ps` |
| ดู logs | `IMAGE_TAG=v2.0.0e docker compose -f docker-compose.deploy.yml --env-file .env.production logs -f` |
| ดู logs เฉพาะ API | `... logs -f api` |
| Restart API | `... restart api` |
| หยุดระบบ | `... down` |
| หยุด + ลบข้อมูล | `... down -v` |
| Backup DB (UI) | Settings → Backup → Download |
| Backup DB (CLI) | `... exec db pg_dump -U postgres -F c sso_cancer > backup.dump` |
| รัน migration | `... run --rm api npx prisma migrate deploy --config dist/prisma/prisma.config.ts` |
| รัน seed | `... run --rm api node prisma/seed.js` |
| Reset admin password | ดูหัวข้อ 11 "ลืมรหัสผ่าน admin" |
| เข้าสู่ระบบ | `admin@sso-cancer.local` / `Admin@1234` (ต้องเปลี่ยนรหัสผ่านทันที) |

### สร้าง secrets ทั้งหมด

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -hex 32)"
echo "SETTINGS_ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "BACKUP_ENCRYPTION_KEY=$(openssl rand -hex 32)"
```
