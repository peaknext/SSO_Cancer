# SSOP 0.93 Export Fix — Implementation Record

## Context

ทบทวนระบบ SSOP export ที่มีอยู่ พบ 5 ประเด็นที่ต้องแก้ไขตามแนวปฏิบัติการเบิกค่ารักษา SSO Cancer:
1. BillTran field mapping ผิด 3 fields (#7 HN, #8 MemberNo, #12 Tflag)
2. BILLDISP ส่งว่างทั้งไฟล์ — ต้อง generate ข้อมูลยามะเร็ง
3. OPServices.CareAccount hardcoded "1" — ต้อง configurable ("9" สำหรับ รพ.เฉพาะทาง)
4. HIS API ขาด TMT drug code — เพิ่ม field ใน spec + schema (optional, ใช้ aipnCode เป็น fallback)
5. BillItems.SvRefID ไม่แยก drug/non-drug routing (จาก review)

**Status: COMPLETED** — All 4 phases implemented, API build passes.

---

## Changes Made

### Phase A: BillTran Field Fixes
- `billtran.generator.ts`: HN→patientHn, MemberNo→caseNumber, Tflag→"A"
- `ssop.types.ts`: Updated comments for hn, memberNo, tflag

### Phase B: CareAccount Configurable
- `017_hospital_settings.sql`: Added `ssop_care_account` setting (group: ssop, default: "1")
- `ssop-export.service.ts`: Added `getCareAccountSetting()` method
- `opservices.generator.ts`: Added `careAccount` parameter (replaces hardcoded "1")

### Phase C: BILLDISP Generator + SvRefID Routing
- `ssop.types.ts`: Added DispensingRecord (18 fields) + DispensedItemRecord (19 fields)
- `billdisp.generator.ts`: Full rewrite — generates Dispensing + DispensedItems from drug items (billingGroup=3), returns dispIdMap
- `billtran.generator.ts`: Accepts dispIdMap, drug BillItems reference DispID instead of SvID
- `ssop-export.service.ts`: Reordered — billdisp generated before billtran to get dispIdMap

### Phase D: TMT Code Support
- `prisma/schema.prisma`: Added `tmtCode` column to VisitBillingItem
- Migration: `20260227025901_add_tmt_code_to_billing_items`
- `his-api.types.ts`: Added `tmtCode?: string` to HisBillingItem
- `his-integration.service.ts`: Stores tmtCode on import
- `ssop.types.ts`: Added tmtCode to SsopVisitData.billingItems
- `billdisp.generator.ts`: Uses `tmtCode || aipnCode` for DispensedItems.DrgID
- `docs/HIS_API_REQUEST.md`: Added tmtCode field spec

---

## HIS API Data Sufficiency Review

| SSOP File | มีข้อมูลเพียงพอ? | หมายเหตุ |
|-----------|------------------|----------|
| **BILLTRAN** (19 fields) | ✅ เพียงพอ | ทุก field มีจาก HIS + Patient/Case data |
| **BillItems** (13 fields) | ✅ เพียงพอ | ทุก field มีจาก VisitBillingItem |
| **OPServices** (22 fields) | ✅ เพียงพอ | ทุก field มีจาก Visit + Patient data |
| **OPDX** (6 fields) | ✅ เพียงพอ | ICD-10 codes มีครบ |
| **Dispensing** (18 fields) | ✅ เพียงพอ | ใช้ข้อมูลจาก Visit + Patient + VisitBillingItem |
| **DispensedItems** (19 fields) | ⚠️ ใช้ได้แต่ไม่สมบูรณ์ | ขาด TMT code (ใช้ aipnCode แทน), ขาด DFS/sig/packsize |

**ข้อมูลที่ขาดจาก HIS (optional fields):**
- `tmtCode` — schema พร้อมแล้ว, รอ HIS ส่งค่ามา
- dfsCode/dfsText — ใช้ description เป็น fallback
- sigCode/sigText, packsize, multiDisp, supplyFor — optional ทั้งหมด
