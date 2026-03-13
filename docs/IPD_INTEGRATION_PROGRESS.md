# IPD Integration Progress — Protocol Analysis Workflow

**Date**: 2026-03-13 (updated)
**Status**: Backend + Frontend implementation complete, pending HIS Endpoint 4 availability

## Architecture Decision

**Option A: Per-Admission Matching** — 1 admission = 1 PatientVisit record = 1 match result

## Completed Phases

### Phase 1: Schema Migration ✅
- Migration: `20260312120000_add_ipd_fields`
- Added `an` (admission number) — `String? @unique @db.VarChar(30)`
- Added `dischargeDate` — `DateTime? @db.Date`
- Added index on `visitType` for OPD/IPD filtering
- Backfilled all existing visits to `visitType = '1'` (OPD)

### Phase 2: HIS API Types + Client ✅
- **File**: `apps/api/src/modules/his-integration/types/his-api.types.ts`
  - `HisProcedure`, `HisAdmission`, `HisAdmissionData` interfaces
  - `isCancerRelatedAdmission()` — checks any diagnosis for cancer ICD-10
  - `extractProcedureModality()` — detects 9925 (chemo) / 9224 (radiation)
  - `proceduresToSecondaryDiagCodes()` — maps 9925→Z5111, 9224→9224
- **File**: `apps/api/src/modules/his-integration/his-api.client.ts`
  - `fetchPatientWithAdmissions()` — calls `GET /patients/{hn}/admissions`
  - `normalizeHisAdmission()` — ensures arrays exist, trims fields

### Phase 3: IPD Import Logic ✅
- **File**: `apps/api/src/modules/his-integration/his-integration.service.ts`
  - `previewAdmissions()` — preview before import (checks already-imported ANs)
  - `importAdmissions()` — batch import with 60s transaction
  - `importAdmission()` — core transformation:
    - Primary diagnosis from `diagnoses[].diagType='1'`
    - Secondary diagnoses = all other codes + procedure-derived Z-codes
    - Synthetic VN = `IPD-{an}` (avoids collision with OPD VNs)
    - Sets `visitType='2'`, `an`, `dischargeDate`
    - Creates VisitBillingItem + VisitMedication from billing items

### Phase 4: Controller Endpoints ✅
- **File**: `apps/api/src/modules/his-integration/his-integration.controller.ts`
  - `GET /his-integration/ipd/preview/:hn` — preview admission import
  - `POST /his-integration/ipd/import/:hn` — execute admission import

### Phase 5: Protocol Analysis visitType Filter ✅
- **Files**: `query-patients.dto.ts`, `query-visits.dto.ts` — added `visitType` field
- **File**: `protocol-analysis.controller.ts` — filter WHERE clause in `listPatients()` + `listVisits()`
- Backward compatible: no visitType = returns both OPD + IPD

### Phase 7: Frontend OPD/IPD Tabs ✅
- **File**: `apps/web/src/app/(dashboard)/protocol-analysis/page.tsx`
  - OPD/IPD tab switcher with persisted state
  - Passes `visitType` param to all API calls
  - Conditional VN/AN labels
  - Clear selection on tab switch

### Phase 8: OPD visitType Defaults ✅
- HIS import: `visitType: visit.visitType || '1'` (was `|| null`)
- Excel import: added `visitType: '1'` to create data

### Phase 9: CIPN Schema + HIS Import Enhancement ✅ (2026-03-13)
- Migration: `20260312174203_add_cipn_fields`
- **Schema** (`prisma/schema.prisma`):
  - New `VisitDiagnosis` model — structured diagnosis records (diagCode, diagType, codeSys, diagTerm, doctorLicense, diagDate)
  - New `VisitProcedure` model — structured procedure records (procedureCode, codeSys, procedureTerm, startDate/Time, endDate/Time, location)
  - 16 IPD fields on PatientVisit: admitTime, dischargeTime, admissionType, admissionSource, dischargeStatus, ward, department, lengthOfStay, leaveDay, birthWeight, drg, drgVersion, rw, adjRw, authCode, authDate
  - 5 demographic fields on Patient: idType, maritalStatus, nationality, province, district
  - 2 billing fields on VisitBillingItem: serviceDate, discount
  - `exportType` on BillingExportBatch (SSOP vs CIPN discriminator)
- **HIS Import** (`his-integration.service.ts`):
  - `importAdmission()` persists all 16 CIPN admission fields
  - `createVisitDiagnoses()` — bulk creates structured diagnosis records with sequence numbers
  - `createVisitProcedures()` — bulk creates structured procedure records
  - `normalizeBillingItem()` includes serviceDate + discount
  - `upsertPatient()` stores CIPN demographics (idType, maritalStatus, nationality, province, district)
- **HIS Types** (`his-api.types.ts`):
  - Added `doctorLicense`, `diagDate` to `HisDiagnosis`
  - Added `serviceDate`, `discount` to `HisBillingItem`
  - Added CIPN demographic fields to `HisPatientSearchResult`

### Phase 10: Frontend IPD Data Display ✅ (2026-03-13)
- **Protocol Analysis visit detail** (`protocol-analysis/page.tsx`):
  - IPD info card: AN, admit/discharge dates+times, ward, department, LOS
  - DRG section: code, RW, AdjRW (conditional)
  - Structured diagnoses table with diagType badges (หลัก/ร่วม/แทรก/อื่น/สาเหตุ)
  - Structured procedures table with code system badge and dates
  - Conditional render: `viewMode === 'ipd' && visitDetail.an`
- **API endpoint** (`protocol-analysis.controller.ts`):
  - Visit detail includes `diagnoses` and `procedures` relations
  - All IPD fields auto-returned via `include` (no explicit select needed)
- **Cancer Patients timeline** (`cancer-patients/[id]/components/`):
  - `types.ts`: Added 9 IPD fields to `Visit` interface (visitType, an, admitDate, dischargeDate, admitTime, dischargeTime, ward, dischargeStatus, lengthOfStay)
  - `visit-timeline-entry.tsx`: Blue "IPD" badge with bed icon, AN display for IPD visits, admission info row (AN, admit/discharge, ward, LOS badge)
- **Sidebar** (`components/layout/sidebar.tsx`):
  - Added "CIPN Export / ส่งออก CIPN" nav item with `BedDouble` icon (EDITOR+ roles)

## Matching Service — Zero Changes Required

`MatchingService.matchVisit(vn)` works for IPD without modification because:
1. Loads PatientVisit by VN → works with synthetic `IPD-{an}`
2. `inferStage()` recognizes Z5111 and 9224 (injected during import)
3. ±7 day radiation scan auto-skips when both signals are in same admission
4. Drug matching uses same VisitMedication records

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Shared `PatientVisit` table | Avoids duplicating all downstream queries (matching, AI, export) |
| Synthetic VN `IPD-{an}` | Satisfies unique constraint, prevents OPD/IPD collision |
| Procedure → Z-code mapping | Reuses `inferStage()` without modification |
| `source: 'HIS_API_IPD'` | Distinguishes IPD imports in PatientImport records |
| Drug extraction by `sksDrugCode` | IPD has no medications array, drugs identified from billing items |

## Pending / Future Work

- [ ] HIS Endpoint 4 go-live (awaiting HIS team)
- [ ] IPD nightly scan in `his-nightly-scan.service.ts`
- [ ] CIPN export API module (`apps/api/src/modules/cipn-export/`) — XML generators for IPADT, IPDx, IPOp, Invoices
- [ ] CIPN export frontend page (`apps/web/src/app/(dashboard)/cipn-export/page.tsx`)
- [ ] Dashboard OPD/IPD split counts

## Files Modified

| File | Lines Changed |
|------|--------------|
| `prisma/schema.prisma` | +90 (2 new models, 16 IPD fields, 5 demographics, 3 billing fields) |
| `prisma/migrations/20260312120000_add_ipd_fields/migration.sql` | New file |
| `prisma/migrations/20260312174203_add_cipn_fields/migration.sql` | New file |
| `apps/api/src/modules/his-integration/types/his-api.types.ts` | +85 |
| `apps/api/src/modules/his-integration/his-api.client.ts` | +85 |
| `apps/api/src/modules/his-integration/his-integration.service.ts` | +280 |
| `apps/api/src/modules/his-integration/his-integration.controller.ts` | +18 |
| `apps/api/src/modules/protocol-analysis/dto/query-patients.dto.ts` | +5 |
| `apps/api/src/modules/protocol-analysis/dto/query-visits.dto.ts` | +5 |
| `apps/api/src/modules/protocol-analysis/protocol-analysis.controller.ts` | +20 |
| `apps/api/src/modules/protocol-analysis/services/import.service.ts` | +1 |
| `apps/web/src/app/(dashboard)/protocol-analysis/page.tsx` | +120 (IPD types + info card) |
| `apps/web/src/app/(dashboard)/cancer-patients/[id]/components/types.ts` | +9 (IPD fields) |
| `apps/web/src/app/(dashboard)/cancer-patients/[id]/components/visit-timeline-entry.tsx` | +25 (IPD badge + admission info) |
| `apps/web/src/components/layout/sidebar.tsx` | +8 (CIPN nav item) |
