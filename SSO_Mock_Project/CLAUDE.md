# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mock HIS (Hospital Information System) API server for testing the SSO Cancer Care application's HIS integration pipeline. Simulates a hospital's HIS API with 10 cancer patients and ~289 visits containing realistic Thai demographics, ICD-10 codes, chemotherapy regimens, medications, and SSOP billing data.

Built with plain Express.js (no framework). Runs standalone in Docker on port 4001.

## Commands

```bash
npm start             # Run server (port 4001)
npm run dev           # Run with --watch (auto-restart on file changes)
docker compose up -d --build   # Build and run in Docker
```

## API Endpoints

All `/api/*` endpoints require `Authorization: Bearer {HIS_API_KEY}` header.

- `GET /health` — Health check (no auth)
- `GET /api/patients/search?q={term}&type={hn|citizen_id|name}` — Patient search
- `GET /api/patients/{hn}/visits?from={YYYY-MM-DD}&to={YYYY-MM-DD}` — Visit data with medications and billing

Full API spec: `HIS_API_REQUEST.md`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4001` | Server port |
| `HIS_API_KEY` | `mock-his-api-key-2024` | Bearer token for auth |

## Architecture

**Data flow**: `data/patients.js` (templates) → `data/generate-visits.js` (generator) → `server.js` (in-memory Map at startup)

- **`data/patients.js`** — 10 patient definitions with demographics, cancer type, and treatment phase templates. Each phase specifies drugs, supportive meds, cycle count, and interval. Drug `medicationName` values are designed to resolve correctly against the SSO Cancer Care seed data's 3-tier drug matching (exact → startsWith → contains).
- **`data/generate-visits.js`** — `generateAllVisits()` iterates patient phases to produce ~289 visits deterministically. Each visit gets a sequential VN, calculated dates, medications array, and billingItems array. Returns `Map<hn, { patient, visits[] }>`.
- **`server.js`** — Express server. Calls `generateAllVisits()` once at startup, stores in memory. Three routes + Bearer auth middleware.

## Mock Data Design

10 patients cover: Lung (C349), Breast (C509/C504), Colorectal (C189), Cervix (C539), Cholangiocarcinoma (C221), DLBCL (C833), ALL (C910), Prostate (C619), Ovarian (C569). Treatment phases include multi-line chemo (AC→Paclitaxel, mFOLFOX6→Capecitabine), concurrent chemoradiation, targeted therapy (Trastuzumab, Rituximab), hormone therapy (Tamoxifen, Leuprorelin), and maintenance regimens.

To add a patient: define entry in `data/patients.js` with `phases[]` array, each phase having `drugs[]`, `supportive[]`, `cycleCount`, `intervalDays`, and `doctorNotes` function. The generator handles VN sequencing, date calculation, billing item creation, and follow-up visits automatically.

## Connecting to SSO Cancer Care

Set these in the SSO Cancer Care app settings (Settings > Hospital):
- `his_api_base_url`: `http://localhost:4001/api` (local dev) or `http://mock-his:4001/api` (Docker network)
- `his_api_key`: `mock-his-api-key-2024`
