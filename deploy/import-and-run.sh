#!/bin/bash
# ─── Import Docker images and start services on HOSPITAL SERVER ─────────────
#
# Prerequisites:
#   1. Docker + Docker Compose installed on the server
#   2. .env.production configured (copy from .env.production.example)
#   3. SSL certificates at deploy/nginx/ssl/ (cert.pem + key.pem)
#   4. Image tar file transferred to this directory
#
# Usage:
#   bash deploy/import-and-run.sh              # loads sso-cancer-images-latest.tar
#   bash deploy/import-and-run.sh v1.2.0       # loads sso-cancer-images-v1.2.0.tar
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

TAG="${1:-latest}"
TAR_FILE="sso-cancer-images-${TAG}.tar"
# Also try without tag suffix for 'latest'
if [ ! -f "${TAR_FILE}" ] && [ -f "sso-cancer-images.tar" ]; then
  TAR_FILE="sso-cancer-images.tar"
fi

COMPOSE_FILE="docker-compose.deploy.yml"
ENV_FILE=".env.production"

echo "=== SSO Cancer Care — Hospital Server Deployment ==="
echo "Image tag: ${TAG}"
echo "Tar file:  ${TAR_FILE}"
echo ""

# ── Pre-flight checks ───────────────────────────────────────────────────────

if [ ! -f "${ENV_FILE}" ]; then
  echo "ERROR: ${ENV_FILE} not found."
  echo "Copy .env.production.example to .env.production and configure:"
  echo "  - DATABASE_URL (or DB_PASSWORD for embedded PostgreSQL)"
  echo "  - JWT_SECRET, JWT_REFRESH_SECRET"
  echo "  - CORS_ORIGIN"
  exit 1
fi

if [ ! -f "${TAR_FILE}" ]; then
  echo "ERROR: ${TAR_FILE} not found."
  echo "Transfer the file from your dev machine first."
  echo "On dev machine: bash deploy/build-and-export.sh ${TAG}"
  exit 1
fi

if [ ! -f deploy/nginx/ssl/cert.pem ] || [ ! -f deploy/nginx/ssl/key.pem ]; then
  echo "WARNING: SSL certificates not found in deploy/nginx/ssl/"
  echo ""
  echo "Generate self-signed cert:"
  echo "  mkdir -p deploy/nginx/ssl"
  echo "  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\"
  echo "    -keyout deploy/nginx/ssl/key.pem \\"
  echo "    -out deploy/nginx/ssl/cert.pem \\"
  echo "    -subj '/CN=sso-cancer.hospital.local'"
  echo ""
  read -p "Generate self-signed cert now? (Y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    mkdir -p deploy/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout deploy/nginx/ssl/key.pem \
      -out deploy/nginx/ssl/cert.pem \
      -subj '/CN=sso-cancer.hospital.local' 2>/dev/null
    echo "SSL certificates generated."
  fi
fi

# ── Step 1: Load images ─────────────────────────────────────────────────────
echo ""
echo "1/4 — Loading Docker images from ${TAR_FILE}..."
docker load -i "${TAR_FILE}"

# Verify images exist
echo ""
echo "Loaded images:"
docker images --format "  {{.Repository}}:{{.Tag}} ({{.Size}})" | grep sso-cancer || true

# ── Step 2: Stop existing services (if running) ─────────────────────────────
echo ""
echo "2/4 — Stopping existing services (if any)..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" down 2>/dev/null || true

# ── Step 3: Run database migrations ─────────────────────────────────────────
echo ""
echo "3/4 — Starting database and running migrations..."

# Start only the database first
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d db
echo "Waiting for database to be ready..."
sleep 10

# Run Prisma migrations using the API container
# In the runner image, prisma files are at /app/dist/prisma/
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" \
  run --rm api npx prisma migrate deploy --config dist/prisma/prisma.config.ts || {
    echo ""
    echo "WARNING: Migration failed. If this is the first deploy, you may need to"
    echo "initialize the database schema manually. Check logs above for details."
  }

# ── Step 4: Start all services ──────────────────────────────────────────────
echo ""
echo "4/4 — Starting all services..."
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d

# ── Health check ─────────────────────────────────────────────────────────────
echo ""
echo "Waiting for services to start (30s)..."
sleep 30

echo ""
echo "Service status:"
IMAGE_TAG="${TAG}" docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" ps

echo ""
if curl -sf -k https://localhost/api/v1/health > /dev/null 2>&1; then
  echo "=== Deployment successful! ==="
  echo ""
  echo "Access the application:"
  echo "  https://$(hostname -f 2>/dev/null || echo 'your-server-ip')"
  echo ""
  echo "Default admin login:"
  echo "  Email:    admin@sso-cancer.local"
  echo "  Password: Admin@1234"
elif curl -sf http://localhost/api/v1/health > /dev/null 2>&1; then
  echo "=== Deployment successful (HTTP only) ==="
else
  echo "=== WARNING: Health check failed ==="
  echo "Check logs:"
  echo "  IMAGE_TAG=${TAG} docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE} logs"
fi
