#!/bin/bash
# ─── Build Docker images and export to a tar file ───────────────────────────
# Run this on your DEV machine, then transfer the tar to the hospital server.
#
# Usage:
#   bash deploy/build-and-export.sh              # → sso-cancer-images.tar
#   bash deploy/build-and-export.sh v1.2.0       # → sso-cancer-images-v1.2.0.tar
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

TAG="${1:-latest}"
API_IMAGE="sso-cancer-api:${TAG}"
WEB_IMAGE="sso-cancer-web:${TAG}"
OUTPUT_FILE="sso-cancer-images${TAG:+-$TAG}.tar"

echo "=== SSO Cancer Care — Build & Export Images ==="
echo "Tag:    ${TAG}"
echo "Output: ${OUTPUT_FILE}"
echo ""

# ── Step 1: Build API image ─────────────────────────────────────────────────
echo "1/3 — Building API image (${API_IMAGE})..."
docker build \
  -t "${API_IMAGE}" \
  -f apps/api/Dockerfile \
  .

# ── Step 2: Build Web image ─────────────────────────────────────────────────
echo "2/3 — Building Web image (${WEB_IMAGE})..."
docker build \
  -t "${WEB_IMAGE}" \
  -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL="" \
  --build-arg API_INTERNAL_URL="http://api:4000" \
  .

# ── Step 3: Export to tar ────────────────────────────────────────────────────
echo "3/3 — Exporting images to ${OUTPUT_FILE}..."
docker save -o "${OUTPUT_FILE}" "${API_IMAGE}" "${WEB_IMAGE}"

FILE_SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)
echo ""
echo "=== Done! ==="
echo "File: ${OUTPUT_FILE} (${FILE_SIZE})"
echo ""
echo "Transfer to hospital server and run:"
echo "  bash deploy/import-and-run.sh ${TAG}"
