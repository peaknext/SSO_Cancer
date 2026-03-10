# SSOP 0.93 Electronic Billing Format Reference

**Version**: 0.93 (OPD-SS 20171123)
**Issuer**: Health Information Standards Office (HISO / สำนักสารสนเทศบริการสุขภาพ, สกส.)
**Scope**: Thai Social Security Office (SSO) outpatient billing — including cancer care claims
**Cancer amendment effective**: 1 July 2025 (พ.ศ. 2568)
**Last updated**: 2026-03-03

---

## Table of Contents

1. [Overview](#1-overview)
2. [ZIP File Naming](#2-zip-file-naming)
3. [Data Type Definitions](#3-data-type-definitions)
4. [XML Wrapper Structure](#4-xml-wrapper-structure)
5. [BILLTRAN (19 fields)](#5-billtran-19-fields)
6. [BillItems (13 fields)](#6-billitems-13-fields)
7. [Dispensing (18 fields)](#7-dispensing-18-fields)
8. [DispensedItems (19 fields)](#8-dispenseditems-19-fields)
9. [OPServices (22 fields)](#9-opservices-22-fields)
10. [OPDx (6 fields)](#10-opdx-6-fields)
11. [Cross-Reference Relationships](#11-cross-reference-relationships)
12. [SSO Cancer-Specific Business Rules](#12-sso-cancer-specific-business-rules)
13. [Reference File Analysis](#13-reference-file-analysis)
14. [Implementation Compliance Notes](#14-implementation-compliance-notes)

---

## 1. Overview

SSOP 0.93 is the standard electronic billing format for Thai Social Security Office (SSO / สำนักงานประกันสังคม) outpatient claims. It was extended from the Civil Servant Medical Benefit Scheme (CSMBS) billing system to unify outpatient billing across multiple Thai health insurance funds.

### Format Summary

| Property | Value |
|---|---|
| **Structure** | 3 text files compressed into 1 ZIP |
| **Files** | `BILLTRAN<YYYYMMDD>.TXT`, `BILLDISP<YYYYMMDD>.TXT`, `OPServices<YYYYMMDD>.TXT` |
| **Encoding** | Windows-874 (ISO-8859-11 / TIS-620 compatible). **NOT UTF-8.** |
| **Field delimiter** | Pipe `\|` (ASCII 0x7C). The last field in a record must NOT be followed by a pipe. |
| **Record terminator** | CRLF (`\r\n`, ASCII 0x0D 0x0A) or LF (`\n`, ASCII 0x0A) |
| **Envelope** | XML with `<ClaimRec>` root element |
| **Record format** | Pipe-delimited flat records inside XML section tags |
| **Checksum** | MD5 hash appended as `<?EndNote Checksum="...">` processing instruction |
| **Compression** | ZIP only (`.zip`). RAR and 7z are rejected. |
| **Submission** | Email to `ssop@ss1.chi.or.th` with ZIP attachment |
| **File naming** | Case-insensitive (upper or lower case accepted) |

### Three Transaction Sets

| File | Content | Sections |
|---|---|---|
| **BILLTRAN** | Financial billing transactions | `<BILLTRAN>` (19 fields) + `<BillItems>` (13 fields) |
| **BILLDISP** | Drug dispensing records | `<Dispensing>` (18 fields) + `<DispensedItems>` (19 fields) |
| **OPServices** | Medical services and diagnoses | `<OPServices>` (22 fields) + `<OPDx>` (6 fields) |

Each file is a self-contained XML document with its own header, data sections, and MD5 checksum.

---

## 2. ZIP File Naming

### Format

```
{hcode5}_{system}_{sessno4}_{subunit2}_{YYYYMMDD-HHMMSS}.zip
```

| Part | Description | Example |
|---|---|---|
| `hcode5` | 5-digit hospital code per MoPH registry | `10710` |
| `system` | Billing system identifier, always `SSOPBIL` | `SSOPBIL` |
| `sessno4` | 4-digit session/batch number (hospital-assigned, sequential) | `0156` |
| `subunit2` | 2-digit sub-unit code (allows hospital to partition billing units) | `01` |
| `YYYYMMDD-HHMMSS` | Generation timestamp (CE year, 24-hour time) | `20260119-191131` |

### Examples

```
00001_SSOPBIL_1001_01_20180101-120000.zip
10710_SSOPBIL_0156_01_20260119-191131.zip
```

### Notes

- Some systems prepend a batch reference ID to the filename. The reference file from Sakon Nakhon Hospital has the prefix `602601181709336749_` before the standard name.
- The `<YYYYMMDD>` in individual text file names inside the ZIP indicates the date of data preparation. Transaction dates must be on or before this date.
- All sessions sharing the same batch must use the same `SESSNO` across all three files.

---

## 3. Data Type Definitions

| Code | Name | Specification | Null Representation |
|---|---|---|---|
| **HC1** | Hospital Code | Exactly 5 digits per MoPH registry (สนย.) | N/A (required) |
| **ID1** | Short ID | <= 9 characters. Allowed: `0-9`, `A-Z`, `-`, space | Empty string |
| **ID2** | Citizen ID | Exactly 13 digits (`0-9` only) | N/A (required) |
| **ID3** | Long ID | >= 9 characters. Allowed: `0-9`, `A-Z`, `-`, space | Empty string |
| **IN1** | Integer | Integer 0 to 9,999,999. No comma separators. | `0` |
| **DT1** | Date | `YYYY-MM-DD` (CE year, ISO 8601). Zero-padded months/days. | Empty string |
| **DT2** | Time | `HH:mm:ss` (24-hour, ISO 8601). Zero-padded. | Empty string |
| **DT3** | DateTime | `YYYY-MM-DDThh:mm:ss` (ISO 8601 with `T` separator). 1 second after 23:59:59 = 00:00:00 next day. | Empty string |
| **DP1** | Duration | `nnnA` where `nnn` = 1-3 digit count, `A` = unit: `D` (day), `W` (week=7D), `M` (month=4W/28D/30D). Single unit only (e.g., `10D` not `1W3D`). | Empty string |
| **CR1** | Currency | `[M]NNNNNN.NN` — always 2 decimal places, no comma separators. Negative: leading `-`. | `0.00` |
| **DR1** | Provider ID | `Annnn` where `A` = provider type prefix, `nnnn` = license number (4+ digits). `A` values: `2` = doctor (แพทย์), `ท` = dentist (ทันตแพทย์), `พ` = nurse (พยาบาล), `ภ` = pharmacist (เภสัชกร), `-` = other. Trailing spaces allowed. | Empty string |
| **ST** | String | 0-254 characters. Must NOT contain XML special characters (`<`, `>`, `"`, `'`, `&`). | Empty string |
| **DN1** | Decimal | `9999999.99` — always 2 decimal places. Max 7 digits before decimal. Negative: leading `-`. | `0.00` |
| **SC** | Standard Code | String referencing an established/international code set (e.g., ICD-10, TMT, LOINC). Size per the referenced standard. | Empty string |
| **SE** | System-specific Code | String referencing a code set defined within this spec (not yet an official standard). Format like SC but distinguished to indicate non-standard status. | Empty string |

### Required Field Codes

| Code | Meaning |
|---|---|
| `y` | Required from the start, continues to be required |
| `(y) o` | Was required, now deprecated (no longer used) |
| `(y) n` | Required initially, will be replaced by another field later |
| `(n-ni) y` | Not required initially (awaiting standard code), will become required |
| `(o-ni) y` | Optional initially (awaiting standard code), will become required |
| `(y-ni) y` | Required initially (awaiting standard code), will remain required with new code |
| `(o) n` | Optional initially, will be deprecated |
| `(o) y` | Optional initially, will become required |

---

## 4. XML Wrapper Structure

Every SSOP 0.93 file follows this exact XML structure:

```xml
<?xml version="1.0" encoding="windows-874"?>
<ClaimRec System="OP" PayPlan="SS" Version="0.93" Prgs="HX">
<Header>
<HCODE>{hcode}</HCODE>
<HNAME>{hname}</HNAME>
<DATETIME>{gen_datetime}</DATETIME>
<SESSNO>{session_no}</SESSNO>
<RECCOUNT>{record_count}</RECCOUNT>
</Header>
{data sections with pipe-delimited records}
</ClaimRec>
<?EndNote Checksum="{MD5}"?>
```

### ClaimRec Attributes

| Attribute | Value | Description |
|---|---|---|
| `System` | `OP` | Outpatient |
| `PayPlan` | `SS` | Social Security (ประกันสังคม) |
| `Version` | `0.93` | Format version |
| `Prgs` | `HX` | Program identifier |

### Header Elements

| Element | Type | Description |
|---|---|---|
| `HCODE` | HC1 (5) | Hospital code of the submitting facility |
| `HNAME` | ST | Hospital name (in Thai, windows-874 encoded) |
| `DATETIME` | DT3 (19) | Date and time of data generation |
| `SESSNO` | ID1 (4+) | Session/batch number — must be consistent across all 3 files in the same batch |
| `RECCOUNT` | IN1 (1+) | Count of main (transaction) records only — NOT sub-records/items. For BILLTRAN this counts `<BILLTRAN>` records (not `<BillItems>`); for BILLDISP this counts `<Dispensing>` records (not `<DispensedItems>`); for OPServices this counts `<OPServices>` records (not `<OPDx>` records). |

### Header Tag Formatting

- Header element tags (e.g., `<HCODE>`, `<HNAME>`) are at column 0 with NO indentation in the spec. Our implementation uses 2-space indentation inside `<Header>` which is accepted.
- The `<Header>` tag is case-sensitive (`<Header>` not `<header>`), though the spec shows both forms. The reference file uses `<Header>`.

### MD5 Checksum Computation

1. Compute on the content from `<?xml version...` through `</ClaimRec>\r\n` (inclusive of the final CRLF).
2. The content must be encoded as **Windows-874 bytes** before hashing.
3. Compute MD5 digest (16 bytes), then convert to lowercase hex string (32 characters).
4. Append as a processing instruction: `<?EndNote Checksum="{hex_md5}"?>` — note the capitalization: `CheckSum` (CamelCase) is also accepted as seen in reference files.
5. The checksum PI is written immediately after `</ClaimRec>\r\n` with NO additional CRLF before it.

### Important: The reference file uses `CheckSum` (capital S), not `Checksum`. Both forms are observed in the wild.

---

## 5. BILLTRAN (19 fields)

The BILLTRAN section contains billing transactions — one record per visit/encounter.

### Record Structure

```
<BILLTRAN>
field1|field2|...|field19\r\n
field1|field2|...|field19\r\n
</BILLTRAN>
```

### Field Definitions

| # | Element | Description (Thai) | Description (English) | Type | Len | Key | Required | SSO Cancer Override | Our Implementation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Station | จุดเก็บค่ารักษา | Billing station/point | ST | 4 | | y | | `"01"` (hardcoded) |
| 2 | AuthCode | เลขที่อนุมัติธุรกรรม | Authorization code from pre-approval system | ST | 7 | | (o) y | **`"SSOCAC"`** | `"SSOCAC"` (hardcoded for cancer) |
| 3 | DTtran | วันที่/เวลาเรียกเก็บ | Transaction date-time | DT3 | 19 | | y | | `serviceStartTime` or `visitDate` fallback |
| 4 | Hcode | รหัส รพ. | Hospital code performing the transaction | HC1 | 5 | | y | | From `AppSetting.hospital_id` → `Hospital.hcode5` |
| 5 | Invno | เลขที่เรียกเก็บ | Invoice number (unique, non-reusable) | ID3 | 9+ | PK | y | | `PatientVisit.vn` |
| 6 | Billno | เลขที่ใบเสร็จ | Receipt number | ST | 9+ | | (o) y | | Empty string |
| 7 | HN | เลขประจำตัวผู้ป่วย | Hospital number (patient registration ID) | ID1 | 5+ | | y | | `Patient.hn` |
| 8 | MemberNo | เลขสมาชิกโครงการ | Program membership number | ST | 5+ | | n | **Case Number (เลขที่เคส)** | `PatientCase.caseNumber` |
| 9 | Amount | ยอดเงินรวมเรียกเก็บ | Total billing amount (hospital charge) | CR1 | 4+ | | y | | `SUM(QTY * UP)` for all BillItems |
| 10 | Paid | ยอดเงินผู้ป่วยจ่าย | Amount paid by patient | CR1 | 4+ | | y | | `"0.00"` (SSO pays all) |
| 11 | VerCode | รหัสตรวจยืนยัน | Verification code from card/fingerprint check | ST | 5+ | | (o) y | **Protocol QR Code** (รหัส Protocol จาก QR Code) | `PatientCase.vcrCode` |
| 12 | Tflag | สัญญาณธุรกรรม | Transaction flag | SE | 1 | | (o) y | | `"A"` (new) or `"E"` (re-export) |
| 13 | Pid | เลขประจำตัวผู้ใช้สิทธิ | Patient citizen ID | ID2 | 13 | | y | | `Patient.citizenId` |
| 14 | Name | ชื่อ-สกุลผู้รับบริการ | Patient full name | ST | 10+ | | (o) n | | `Patient.fullName` |
| 15 | HMain | รหัส รพ.หลัก | Main hospital code (per insurance card/registry) | HC1 | 5 | | y | | `PatientCase.sourceHospital.hcode5` or `Patient.mainHospitalCode` |
| 16 | PayPlan | รหัสสิทธิประกันสุขภาพ | Health insurance plan code | SE | 2 | | y | **`"80"` (SSO)** | `"80"` (hardcoded) |
| 17 | ClaimAmt | ยอดเงินที่ขอเบิก | Amount claimed from insurance | CR1 | 4+ | | y | | `SUM(QTY * ClaimUP)` for all BillItems |
| 18 | OtherPayplan | สิทธิอื่นร่วมจ่าย | Other co-paying insurance plan | SE | 2 | | y | | Empty string |
| 19 | OtherPay | ยอดเงินอื่นร่วมจ่าย | Amount from other co-payers | CR1 | 4+ | | y | | `"0.00"` |

### Tflag Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `A` | ขอเบิก | New claim submission |
| `E` | แก้ไขรายการ | Edit/correct a previously submitted claim |
| `D` | ยกเลิกรายการ | Cancel a previously submitted claim |

### PayPlan Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `00` | ไม่ใช้สิทธิ | No insurance used |
| `10` | สวัสดิการข้าราชการ | Civil servant welfare (CSMBS) |
| `20` | ขรก. ส่วนท้องถิ่น | Local government officials |
| `30` | องค์กรอื่นๆ ของรัฐ | Other state organizations |
| `31` | องค์กรอื่นๆ ของรัฐ | Other state organizations (variant) |
| **`80`** | **ประกันสังคม** | **Social Security (SSO)** |
| `81` | กองทุนเงินทดแทน | Workmen's Compensation Fund |
| `85` | ประกันสังคม (ส่งต่อ) | SSO referral case |
| `86` | ทุพพลภาพ | Disability fund |

### OtherPayplan Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `RT` | พ.ร.บ. ผู้ประสบภัยจากรถ | Motor vehicle accident insurance |
| `PI` | ประกันชีวิตส่วนบุคคล | Personal life insurance |
| `EM` | นายจ้าง/บริษัทเอกชน | Employer/private company |
| `RF` | หน่วยบริการส่งต่อ | Referring facility |
| `SH` | สถานพยาบาลยกเว้นค่ารักษา | Hospital waived charges |
| `ZZ` | อื่นๆ | Other |

---

## 6. BillItems (13 fields)

BillItems are line-item charges linked to a BILLTRAN transaction. Multiple items per transaction.

### Record Structure

```
<BillItems>
field1|field2|...|field13\r\n
field1|field2|...|field13\r\n
</BillItems>
```

### Field Definitions

| # | Element | Description (Thai) | Description (English) | Type | Len | Key | Required | SSO Cancer Override | Our Implementation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Invno | อ้างอิง BILLTRAN.Invno | FK to BILLTRAN.Invno (VN) | ID3 | 9+ | FK | y | | `PatientVisit.vn` |
| 2 | SvDate | วันที่ใช้บริการ | Service date | DT1 | 8 | | y | | `PatientVisit.visitDate` |
| 3 | BillMuad | หมวดค่ารักษาพยาบาล | Billing category | SE | 1 | | y | | `VisitBillingItem.billingGroup` |
| 4 | LCCode | รหัสบริการ (สถานพยาบาล) | Local service/product code | ID3 | 9+ | | y | | `VisitBillingItem.hospitalCode` |
| 5 | STDCode | รหัสบริการ (มาตรฐาน) | Standard code (TMT for drugs, MoF code for non-drugs) | SC/SE | 5+ | | y | | `VisitBillingItem.aipnCode` |
| 6 | Desc | คำอธิบาย | Description of service/product | ST | 10+ | | (o) n | | `VisitBillingItem.description` |
| 7 | QTY | จำนวน | Quantity | IN1/DN1 | 4+ | | y | | `VisitBillingItem.quantity` |
| 8 | UP | ราคาขายต่อหน่วย | Unit price (hospital charge) | CR1 | 4+ | | y | | `VisitBillingItem.unitPrice` |
| 9 | ChargeAmt | ราคาที่เรียกเก็บ | Charge amount (QTY * UP) | CR1 | 4+ | | y | | Calculated: `quantity * unitPrice` |
| 10 | ClaimUP | ราคาเบิกต่อหน่วย | Reimbursement unit price (per fund schedule) | CR1 | 4+ | | y | | `VisitBillingItem.claimUnitPrice` |
| 11 | ClaimAmount | ยอดเงินที่ขอเบิก | Claim amount (QTY * ClaimUP) | CR1 | 4+ | | y | | Calculated: `quantity * claimUnitPrice` |
| 12 | SvRefID | รหัสอ้างอิง PK ของรายการหลัก | FK to the parent record in another file | ID3 | 9+ | FK | (o) y | | See routing rules below |
| 13 | ClaimCat | ประเภทบัญชีการเบิก | Claim category | SE | 3 | | (o) y | **`"OPR"` for cancer items SSO pays additionally** | `VisitBillingItem.claimCategory` |

### SvRefID Routing Rules

| BillMuad | Item Type | SvRefID Points To |
|---|---|---|
| `3` (drugs) | Drug items | `Dispensing.DispID` |
| `5` (medical supplies) | Non-drug supplies dispensed via pharmacy | `Dispensing.DispID` |
| `8` (radiology) | Radiology/radiation | `OPServices.SvID` |
| `B` (procedures) | Procedures/anesthesia | `OPServices.SvID` |
| `C` (nursing) | Nursing services | `OPServices.SvID` |
| `I` (professional fees) | Medical personnel fees | `OPServices.SvID` |
| `7` (lab) | Laboratory tests | Empty (no parent record yet) |
| `9` (special diagnostics) | Special diagnostic procedures | Empty (no parent record yet) |
| Other | Other categories | `OPServices.SvID` (or empty if no parent) |

### BillMuad Values (17 categories)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `1` | ค่าห้อง และค่าอาหาร | Room and board |
| `2` | ค่าอวัยวะเทียม และอุปกรณ์ | Prosthetics and therapeutic devices |
| `3` | ค่ายา และสารอาหาร | **Drugs and nutrition** |
| `5` | ค่าเวชภัณฑ์ที่มิใช่ยา | **Non-drug medical supplies** |
| `6` | ค่าบริการโลหิต | Blood services |
| `7` | ค่าตรวจวินิจฉัยทางเทคนิคการแพทย์ | Laboratory diagnostics |
| `8` | ค่าตรวจวินิจฉัย/รักษาทางรังสีวิทยา | **Radiology diagnostics/treatment** |
| `9` | ค่าตรวจวินิจฉัยโดยวิธีพิเศษอื่น | Other special diagnostic procedures |
| `A` | ค่าอุปกรณ์ของใช้ และเครื่องมือ | Equipment and instruments |
| `B` | ค่าทำหัตถการ และวิสัญญี | **Procedures and anesthesia** |
| `C` | ค่าบริการทางการพยาบาล | **Nursing services** |
| `D` | ค่าบริการทางทันตกรรม | Dental services |
| `E` | ค่าบริการทางกายภาพบำบัด | Physical therapy |
| `F` | ค่าบริการฝังเข็ม/การแพทย์ทางเลือก | Acupuncture/alternative medicine |
| `G` | ค่าบริการอื่นๆ | Other services |
| `H` | ค่าห้องผ่าตัด/ห้องคลอด | Operating room/delivery room |
| `I` | ค่าธรรมเนียมบุคลากรทางการแพทย์ | **Medical personnel fees** |

### ClaimCat Values

| Code | Meaning (Thai) | Meaning (English) | Notes |
|---|---|---|---|
| `OP1` | OPD ปกติ | Normal outpatient | Default for most items |
| `OP...` | OPD อื่นๆ | Other OPD categories | Reserved, not yet defined |
| `OPR` | เบิกเพิ่มตามอัตรา | **Additional rate-based reimbursement** | **Used for cancer drugs/services SSO pays additionally** |
| `OPF` | เบิกเพิ่มแบบเหมาจ่าย | Additional capitation payment | E.g., cancer outside protocol |
| `RRT` | ไตวายเรื้อรัง | Chronic renal failure | Hemodialysis |
| `P01` / `OCPA` | ขออนุมัติล่วงหน้า | Prior authorization | Protocol-based approval required |
| `P02` / `RDPA` | ขออนุมัติล่วงหน้า | Prior authorization (type 2) | |
| `P03` / `DDPA` | ขออนุมัติล่วงหน้า | Prior authorization (type 3) | |
| `REF` | ส่งต่อ | Referral | |
| `EM1` | ฉุกเฉิน | Emergency | |
| `EM2` | ฉุกเฉินระยะทาง | Distance emergency | |
| `XX...` | บัญชีอื่นๆ | Other accounts | Reserved |

---

## 7. Dispensing (18 fields)

Dispensing records represent drug dispensing events. One record per dispensing transaction per visit.

### Record Structure

```
<Dispensing>
field1|field2|...|field18\r\n
field1|field2|...|field18\r\n
</Dispensing>
```

### Field Definitions

| # | Element | Description (Thai) | Description (English) | Type | Len | Key | Required | SSO Cancer Default | Our Implementation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ProviderID | รหัสหน่วยให้บริการ | Facility code | HC1 | 5 | | y | | `hcode` from AppSetting |
| 2 | DispID | เลขที่ใบสั่งยา | Dispensing ID (prescription ID) | ID3 | 9+ | PK | y | | Generated: `"{vn}D01"` |
| 3 | Invno | อ้างอิง BILLTRAN.Invno | FK to BILLTRAN.Invno (VN) | ID3 | 9+ | FK | y | | `PatientVisit.vn` |
| 4 | HN | เลขประจำตัวผู้ป่วย | Patient hospital number | ID1 | 5+ | | y | | `Patient.hn` |
| 5 | PID | เลขประจำตัวประชาชน | Patient citizen ID | ID2 | 13 | | y | | `Patient.citizenId` |
| 6 | Prescdt | วันเวลาสั่งยา | Prescription date-time | DT3 | 19 | | y | | `serviceStartTime` or `visitDate` |
| 7 | Dispdt | วันเวลาจ่ายยา | Dispensing date-time | DT3 | 19 | | y | | Same as Prescdt |
| 8 | Prescb | เลขใบประกอบวิชาชีพ | Prescriber license number | DR1 | 3+ | | y | | `PatientVisit.physicianLicenseNo` |
| 9 | Itemcnt | จำนวนรายการยา | Count of drug items in this dispensing | IN1 | 1+ | | y | | Count of drug BillItems |
| 10 | ChargeAmt | รวมราคาจำหน่าย | Total charge amount for all drugs | CR1 | 4+ | | y | | `SUM(QTY * UP)` for drug items |
| 11 | ClaimAmt | รวมค่ายาเบิกได้ | Total reimbursable amount | CR1 | 4+ | | y | | `SUM(QTY * ClaimUP)` for drug items |
| 12 | Paid | ค่ายาส่วนผู้ป่วยจ่าย | Amount paid by patient for drugs | CR1 | 4+ | | y | | `"0.00"` |
| 13 | OtherPay | ค่ายาส่วนอื่นจ่าย | Amount paid by other payers | CR1 | 4+ | | y | | `"0.00"` |
| 14 | Reimburser | ผู้เบิก | Who claims reimbursement | SE | 2 | | (o) y | **`"HP"`** | `"HP"` (hospital claims) |
| 15 | BenefitPlan | สวัสดิการที่ใช้ | Benefit plan for this dispensing | SE | 2 | | (o) y | **`"SS"`** | `"SS"` (Social Security) |
| 16 | DispeStat | สถานะการจ่ายยา | Dispensing status | SE | 2 | | (o) y | **`"1"`** | `"1"` (dispensed/received) |
| 17 | SVID | อ้างอิง OPServices.SvID | FK to OPServices.SvID | ID3 | 9+ | FK | (o) y | | SvID of the visit |
| 18 | DayCover | ระยะเวลาใช้ยา | Duration the dispensed drugs should cover | DP1 | 4 | | (o) y | | Empty string |

### Dispensing is only generated for visits that have drug/supply billing items (BillMuad `3` or `5`). Visits with only non-drug items (e.g., radiation therapy) produce empty Dispensing/DispensedItems sections.

### Reimburser Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| **`HP`** | สถานพยาบาลนี้ | **This hospital claims reimbursement** |
| `PO` | ไม่ทราบสถานะการเบิก | Unknown reimbursement status |
| `P1` | ผู้ใช้บริการขอเบิกเอง | Patient claims reimbursement themselves |

### BenefitPlan Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `NB` | ไม่มีประกันสุขภาพ | No health insurance |
| `CS` | สวัสดิการข้าราชการ | Civil Servant Medical Benefit |
| `UC` | หลักประกันสุขภาพแห่งชาติ | Universal Coverage |
| **`SS`** | **ประกันสังคม** | **Social Security (SSO)** |
| `GO` | องค์กรรัฐอื่น | Other government organizations |
| `GE` | รัฐวิสาหกิจ | State enterprises |
| `RT` | พ.ร.บ. ผู้ประสบภัยจากรถ | Motor vehicle accident insurance |
| `PI` | ประกันชีวิตส่วนบุคคล | Personal life insurance |
| `EM` | บริษัท/นายจ้างเอกชน | Employer/private company |
| `RF` | หน่วยบริการส่งต่อ | Referring facility |
| `SO` | หน่วยอื่นของสถานพยาบาล | Other unit of same hospital |
| `ZZ` | อื่นๆ | Other |

### DispeStat Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `0` | ยกเลิก ไม่มีการจ่ายยา | Cancelled, no drugs dispensed |
| **`1`** | **รับยาแล้ว** | **Drugs received (normal)** |
| `2` | แก้ไข คืนยาหรือเปลี่ยนยา | Correction — drug return or exchange |
| `3` | แก้ไข เบิกผิดพลาด | Correction — billing error |

---

## 8. DispensedItems (19 fields)

DispensedItems are individual drug line items within a dispensing transaction.

### Record Structure

```
<DispensedItems>
field1|field2|...|field19\r\n
field1|field2|...|field19\r\n
</DispensedItems>
```

### Field Definitions

| # | Element | Description (Thai) | Description (English) | Type | Len | Key | Required | SSO Cancer Default | Our Implementation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | DispID | อ้างอิง Dispensing.DispID | FK to Dispensing.DispID | ID3 | 9+ | FK | y | | `"{vn}D01"` |
| 2 | PrdCat | ประเภทยา/เวชภัณฑ์ | Product category | SE | 1 | | y | **`"1"`** (modern medicine) | `"1"` |
| 3 | Hospdrgid | รหัสยา (สถานพยาบาล) | Hospital local drug code | ID1 | 5+ | | (y) o | | `VisitBillingItem.hospitalCode` |
| 4 | DrgID | รหัสยามาตรฐาน (TMT) | Standard drug code (TMT) | SC | 6+ | | y | | `tmtCode \|\| aipnCode` (fallback chain) |
| 5 | dfsCode | รหัส dose/form/strength | Dose/form/strength code | ST | 10+ | | (o) n | | Empty string |
| 6 | dfsText | ชื่อ dose/form/strength | Dose/form/strength text description | ST | 10+ | | (y) n | | `VisitBillingItem.description` |
| 7 | Packsize | ขนาดบรรจุ | Pack size | ST | 10+ | | (y) n | | Empty string |
| 8 | sigCode | รหัสวิธีใช้ยา | Sig (directions) code | ST | 10+ | | (o-ni) y | | Empty string |
| 9 | sigText | ข้อความวิธีใช้ยา | Sig (directions) text | ST | 10+ | | (y) n | | Empty string |
| 10 | Quantity | ปริมาณยาที่จ่าย | Quantity dispensed | IN1/DN1 | 1+ | | y | | `VisitBillingItem.quantity` |
| 11 | UnitPrice | ราคาขายต่อหน่วย | Unit selling price | CR1 | 4+ | | y | | `VisitBillingItem.unitPrice` |
| 12 | ChargeAmt | รวมราคาขาย (QTY * UP) | Total charge (QTY * UP) | CR1 | 4+ | | y | | Calculated |
| 13 | ReimbPrice | ราคาเบิกต่อหน่วย | Reimbursement unit price per benefit plan | CR1 | 4+ | | (y-ni) y | | `VisitBillingItem.claimUnitPrice` |
| 14 | ReimbAmt | ยอดเบิกได้ (QTY * RP) | Reimbursement amount (QTY * ReimbPrice) | CR1 | 4+ | | y | | Calculated |
| 15 | PrdSeCode | รหัสการจ่ายยา Generic แทน | Product selection / DAW code | SE | 1 | | (o) y | **`"0"`** (no substitution) | `"0"` |
| 16 | Claimcont | เงื่อนไขการเบิก | Claim control code | SE | 2 | | (o) y | **`"OD"`** (no conditions) | `"OD"` |
| 17 | ClaimCat | ประเภทบัญชีการเบิก | Claim category | SE | 3 | | (o) y | **`"OPR"` for cancer drugs** | `VisitBillingItem.claimCategory` |
| 18 | MultiDisp | การจ่ายยาหลายครั้ง | Multi-dispensing / refill info | ST | 7 | | (o) y | | Empty string |
| 19 | SupplyFor | ระยะเวลาใช้ยา | Duration this drug supply covers | DP1 | 4 | | (o) y | | Empty string |

### PrdCat Values (Product Category)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| **`1`** | **ยาแผนปัจจุบัน (ผลิตภัณฑ์ค้า)** | **Modern medicine (commercial product)** |
| `2` | ยาแผนปัจจุบัน (ผลิตใช้เอง) | Modern medicine (hospital-compounded) |
| `3` | ยาแผนไทย (ผลิตภัณฑ์ค้า) | Thai traditional medicine (commercial) |
| `4` | ยาแผนไทย (ผลิตใช้เอง) | Thai traditional medicine (hospital-produced) |
| `5` | ยาทางเลือกอื่น | Alternative medicine |
| `6` | เวชภัณฑ์ | Medical supplies (non-drug) |
| `7` | อื่นๆ | Other |

### PrdSeCode Values (Dispense As Written / Product Selection Code)

Based on NCPDP DAW codes:

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| **`0`** | **ไม่ต้องจัดยาแทน** | **No product selection indicated** |
| `1` | ผู้สั่งไม่ให้จัดยาแทน | Substitution not allowed by provider |
| `2` | ให้แทนได้ ผู้ป่วยขอยาต้นแบบ | Substitution allowed — patient requested brand |
| `3` | ให้แทนได้ เภสัชกรเลือกยาต้นแบบ | Substitution allowed — pharmacist selected brand |
| `4` | ให้แทนได้ ยา generic ขาดคราว | Substitution allowed — generic not in stock |
| `5` | ให้แทนได้ ยาต้นแบบใช้เป็นยาแทน | Substitution allowed — brand dispensed as generic |
| `6` | แทนยาถูกกำหนดจากที่อื่น | Override |
| `7` | ไม่ให้จัดแทน มีกฎข้อบังคับ | Not allowed — brand mandated by law |
| `8` | ให้แทนได้ ยา generic ขาดตลาด | Substitution allowed — generic not available in market |
| `9` | เหตุอื่น | Other |

### Claimcont Values (Claim Control)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| **`OD`** | **ไม่มีเงื่อนไข** | **No conditions — normal reimbursement** |
| `NR` | เบิกไม่ได้ | Not reimbursable |
| `PA` | ขออนุมัติก่อนเบิก | Prior authorization required |
| `AU` | ตรวจหลังการเบิก | Post-audit |
| `ST` | ใช้ได้ตามลำดับ | Step therapy |
| `IN` | มีข้อบ่งชี้กำกับ | Indication-based restriction |

### MultiDisp Format

Format: `c/t[iNNNA]` or `c/t[qNNNA]`

| Part | Meaning | Example |
|---|---|---|
| `c` | Current dispensing sequence (1-9) | `1` |
| `/` | Separator | `/` |
| `t` | Total dispensing count (1-9) | `3` |
| `[iNNNA]` | Total duration of all dispensings | `[i6M]` = 6 months total |
| `[qNNNA]` | Frequency/interval between dispensings | `[q2M]` = every 2 months |

Example: Doctor prescribes refills 3 times over 6 months. First dispensing: `1/3[i6M]` or `1/3[q2M]`.

---

## 9. OPServices (22 fields)

OPServices records describe medical service encounters including examinations, procedures, and treatments.

### Record Structure

```
<OPServices>
field1|field2|...|field22\r\n
field1|field2|...|field22\r\n
</OPServices>
```

### Field Definitions

| # | Element | Description (Thai) | Description (English) | Type | Len | Key | Required | SSO Cancer Default | Our Implementation |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Invno | อ้างอิง BILLTRAN.InvNo | FK to BILLTRAN.Invno (VN) | ID3 | 9+ | FK | y | | `PatientVisit.vn` |
| 2 | SVID | รหัสการให้บริการ | Service ID (unique per encounter) | ID3 | 9+ | PK | y | | Generated: `YYMMDD0000{seq}` |
| 3 | Class | ประเภท Service | Service class/type | SE | 2 | | y | **`"EC"`** (examination) | `"EC"` |
| 4 | Hcode | สถานพยาบาลที่ให้บริการ | Hospital providing service | HC1 | 5 | | y | | From AppSetting |
| 5 | HN | เลขประจำตัวผู้ป่วย | Patient hospital number | ID1 | 5+ | | y | | `Patient.hn` |
| 6 | Pid | เลขประจำตัวประชาชน | Patient citizen ID | ID2 | 13 | | y | | `Patient.citizenId` |
| 7 | CareAccount | แนวการบริหารจัดการ | Care management type | SE | 1 | | y | **From AppSetting** (`"1"` default, `"9"` for specialist cancer hospitals) | `AppSetting.ssop_care_account` |
| 8 | TypeServ | ลักษณะ clinic | Clinical service type | SE | 2 | | (o) y | **`"03"`** (chronic follow-up) | `"03"` |
| 9 | TypeIn | ลักษณะการเข้ารับบริการ | Type of admission/visit | SE | 1 | | (y) n | `"9"` (other) | `"9"` |
| 10 | TypeOut | ลักษณะสิ้นสุดบริการ | Type of discharge | SE | 1 | | (y) n | `"9"` (other) | `"9"` |
| 11 | DTAppoint | วันนัดครั้งต่อไป | Next appointment date | DT1 | 10 | | (o) y | | Empty string |
| 12 | SVPID | เลขใบประกอบวิชาชีพ | Physician license number | DR1 | 3+ | | y | | `PatientVisit.physicianLicenseNo` |
| 13 | Clinic | แผนกที่ให้บริการ | Department/clinic code | SE | 2 | | y | | `PatientVisit.clinicCode` or `"99"` |
| 14 | BegDT | วันเวลาเริ่มต้นบริการ | Service start date-time | DT3 | 19 | | y | | `PatientVisit.serviceStartTime` |
| 15 | EndDT | วันเวลาสิ้นสุดบริการ | Service end date-time | DT3 | 19 | | y | | `PatientVisit.serviceEndTime` |
| 16 | LcCode | รหัสบริการ (สถานพยาบาล) | Local service code | ID1 | 9+ | | (o) y | | Empty string |
| 17 | CodeSet | ชุดรหัสบริการ | Code set identifier | SE | 2 | | (o) y | | Empty string |
| 18 | STDCode | รหัสบริการมาตรฐาน | Standard service code | SC | 5+ | | (o) y | | Empty string |
| 19 | SvCharge | ค่าธรรมเนียมผู้ให้บริการ | Service charge/professional fee | CR1 | 19 | | y | **`"0.00"`** (charges in BillItems) | Sum of non-dispensing BillItem charges |
| 20 | Completion | สถานะ Service | Service completion status | SE | 1 | | (o) y | **`"Y"`** | `"Y"` |
| 21 | SvTxCode | รหัสอ้างอิงจากระบบตรวจ | Service transaction code (from approval systems) | ST | 5+ | | (o) y | | Empty string |
| 22 | ClaimCat | ประเภทบัญชีการเบิก | Claim category | SE | 2 | | y | **`"OP1"`** at service level (always) | `"OP1"` (always — item-level handles OPR) |

### Class Values (Service Type)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `OP` | หัตถการ | Operative procedure |
| **`EC`** | **การตรวจรักษา** | **Examination/Consultation** |
| `LB` | Lab | Laboratory |
| `XR` | รังสีวิทยา | Radiology |
| `IV` | วิธีพิเศษอื่นๆ | Other special diagnostic |
| `ZZ` | อื่นๆ | Other/undefined |

### CareAccount Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| **`1`** | **สถานพยาบาลหลัก** | **Main/primary hospital** |
| `2` | สถานพยาบาล Supra | Supra-contractor hospital |
| `3` | สถานพยาบาลเครือข่าย | Network/affiliated hospital |
| **`9`** | **สถานพยาบาลอื่นๆ** | **Other (specialist cancer hospitals)** |

### TypeServ Values (Clinical Service Type)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `01` | พบแพทย์วินิจฉัยครั้งแรก | First diagnosis visit |
| `02` | ติดตามรักษาโรคทั่วไป | General disease follow-up |
| **`03`** | **ติดตามรักษาโรคเรื้อรัง** | **Chronic disease follow-up** |
| `04` | ปรึกษาแพทย์ (Consultation) | Consultation |
| `05` | กรณีฉุกเฉิน | Emergency |
| `06` | ตรวจสุขภาพทั่วไป | General health checkup |
| `07` | ตรวจวินิจฉัยทางรังสีวิทยา | Radiology diagnostics |
| `08` | โรคเรื้อรัง | Chronic disease |

### TypeIn Values (Admission Type)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `1` | เข้ารับบริการเอง | Walk-in |
| `2` | ตามนัดหมาย | Scheduled appointment |
| `3` | รับส่งต่อจาก รพ. อื่น | Referral from another hospital |
| `4` | ฉุกเฉิน | Emergency |
| `9` | อื่นๆ | Other |

### TypeOut Values (Discharge Type)

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| `1` | จำหน่ายกลับบ้าน | Discharged home |
| `2` | รับเป็นผู้ป่วยใน | Admitted as inpatient |
| `3` | ส่งต่อ รพ. อื่น | Referred to another hospital |
| `4` | เสียชีวิต | Deceased |
| `5` | หนีกลับ | Left against medical advice |
| `9` | อื่นๆ | Other |

### Clinic Values (Department Code)

| Code | Department (Thai) | Department (English) |
|---|---|---|
| `01` | อายุรกรรม | Internal Medicine |
| `02` | ศัลยกรรม | Surgery |
| `03` | สูติกรรม | Obstetrics |
| `04` | นรีเวชกรรม | Gynecology |
| `05` | กุมารเวช | Pediatrics |
| `06` | โสต ศอ นาสิก | ENT (Otolaryngology) |
| `07` | จักษุ | Ophthalmology |
| `08` | ศัลยกรรมกระดูก | Orthopedics |
| `09` | จิตเวช | Psychiatry |
| `10` | รังสีวิทยา | Radiology |
| `11` | ทันตกรรม | Dentistry |
| `12` | ฉุกเฉิน | Emergency |
| `99` | อื่นๆ | Other |

### CodeSet Values (for OPServices)

| Code | Standard |
|---|---|
| `IN` | ICD-9-CM |
| `LC` | LOINC |
| `TT` | ICD-10-TM |

### Completion Values

| Code | Meaning (Thai) | Meaning (English) |
|---|---|---|
| **`Y`** | **รับบริการครบแล้ว** | **Service completed** |
| `N` | ยังไม่เสร็จ ต้องมาเพิ่ม | Service not complete, follow-up needed |

---

## 10. OPDx (6 fields)

OPDx records contain diagnosis codes linked to an OPServices record. Multiple diagnoses per service.

### Record Structure

```
<OPDx>
field1|field2|...|field6\r\n
field1|field2|...|field6\r\n
</OPDx>
```

### Field Definitions

| # | Element | Description (Thai) | Description (English) | Type | Len | Key | Required | Our Implementation |
|---|---|---|---|---|---|---|---|---|
| 1 | Class | อ้างอิง OPServices.Class | FK — must match the parent OPServices.Class | SE | 2 | FK | y | `"EC"` |
| 2 | SVID | อ้างอิง OPServices.SvID | FK to OPServices.SvID | ID3 | 9+ | FK | y | Generated SvID |
| 3 | SL | ลำดับความสำคัญวินิจฉัย | Diagnosis importance sequence (1=most, 9=least) | SE | 1 | | y | `"1"` for primary, `"4"` for secondary |
| 4 | CodeSet | ชุดรหัสวินิจฉัย | Diagnosis code set used | SE | 2 | | y | `"TT"` (ICD-10-TM) |
| 5 | Code | รหัสวินิจฉัย | Diagnosis code | SC | 7 | | y | ICD-10 code **without dots** |
| 6 | Desc | คำอธิบายเพิ่มเติม | Additional description (optional) | ST | 10+ | | (o) n | Empty string |

### CRITICAL: ICD-10 codes in OPDx must be WITHOUT dots

- Correct: `C119`, `Z510`, `C539`, `C770`
- Incorrect: `C11.9`, `Z51.0`, `C53.9`

### SL Values (Diagnosis Sequence / Importance)

| Code | Meaning |
|---|---|
| **`1`** | Primary diagnosis (most important) |
| `2` | Secondary (2nd importance) |
| `3` | Secondary (3rd importance) |
| `4` | Secondary (4th importance) |
| `5` | Secondary (5th importance) |
| `6` | Secondary (6th importance) |
| `7` | Secondary (7th importance) |
| `8` | Secondary (8th importance) |
| `9` | Least important |

Diagnoses with equal importance may share the same SL value. Primary diagnosis must always be `1`.

### CodeSet Values (for OPDx)

| Code | Standard |
|---|---|
| `IT` | ICD-10 (international) |
| `SN` | SNOMED (not yet defined) |
| **`TT`** | **ICD-10-TM (Thai modification)** |

---

## 11. Cross-Reference Relationships

The 6 record types in the 3 files are connected by foreign key relationships:

```
                    BILLTRAN<YYYYMMDD>.TXT
                    ========================

                    +------------------+
                    |   BILLTRAN       |
                    |  PK: Invno (VN)  |
                    +--------+---------+
                             |
                             | 1:N (FK: Invno)
                             |
                    +--------+---------+
                    |   BillItems      |
                    |  FK: Invno       |
                    |  FK: SvRefID ----+-----> Dispensing.DispID  (drug items: BillMuad 3,5)
                    |                  +-----> OPServices.SvID   (non-drug items)
                    +------------------+


                    BILLDISP<YYYYMMDD>.TXT
                    ========================

                    +------------------+
                    |   Dispensing      |
                    |  PK: DispID      |
                    |  FK: Invno ------+-----> BILLTRAN.Invno
                    |  FK: SvID -------+-----> OPServices.SvID
                    +--------+---------+
                             |
                             | 1:N (FK: DispID)
                             |
                    +--------+---------+
                    |  DispensedItems   |
                    |  FK: DispID      |
                    +------------------+


                    OPServices<YYYYMMDD>.TXT
                    ========================

                    +------------------+
                    |   OPServices     |
                    |  PK: SvID        |
                    |  FK: Invno ------+-----> BILLTRAN.Invno
                    +--------+---------+
                             |
                             | 1:N (FK: SvID + Class)
                             |
                    +--------+---------+
                    |   OPDx           |
                    |  FK: SvID        |
                    |  FK: Class       |
                    +------------------+
```

### Key Relationships Summary

| From | Field | To | Field | Cardinality |
|---|---|---|---|---|
| BillItems | Invno | BILLTRAN | Invno | N:1 |
| BillItems | SvRefID | Dispensing | DispID | N:1 (drug items) |
| BillItems | SvRefID | OPServices | SvID | N:1 (non-drug items) |
| Dispensing | Invno | BILLTRAN | Invno | N:1 |
| Dispensing | SvID | OPServices | SvID | N:1 |
| DispensedItems | DispID | Dispensing | DispID | N:1 |
| OPServices | Invno | BILLTRAN | Invno | N:1 |
| OPDx | SvID | OPServices | SvID | N:1 |
| OPDx | Class | OPServices | Class | Must match |

### Linking Rule

The central linking key is **Invno (VN)** — it ties together a billing transaction, its service record, and its dispensing record for the same visit. BillItems use **SvRefID** to point to either the DispID (for drug items) or the SvID (for service items), completing the cross-file linkage.

---

## 12. SSO Cancer-Specific Business Rules

The following rules are from the cancer care amendment to the SSOP 0.93 format, as specified at the end of `SSOP063.txt`. These override or supplement the standard OPD billing rules.

### Cancer Care Overrides

| Field | Standard OPD Value | Cancer Override | Notes |
|---|---|---|---|
| **BILLTRAN.AuthCode** | (varies by case) | **`"SSOCAC"`** | Fixed for all SSO cancer claims |
| **BILLTRAN.MemberNo** | (membership number) | **Case Number (เลขที่เคส)** | From SSO cancer registration |
| **BILLTRAN.VerCode** | (verification code) | **Protocol QR Code** | Downloaded from QR code on the protocol approval document |
| **BillItems.ClaimCat** | `"OP1"` | **`"OPR"`** for cancer drugs/services | Only for items where SSO pays additional reimbursement |
| **DispensedItems.ClaimCat** | `"OP1"` | **`"OPR"`** for cancer drugs | Only for cancer drug items that SSO pays additionally |
| **OPServices.CareAccount** | `"1"` (main hospital) | **`"9"`** for specialist cancer hospitals | For hospitals classified as specialist cancer treatment centers. Other hospitals use standard values (`"1"`, `"2"`, `"3"`) |

### Deceased Patient Exception

If a patient died before the cancer care registration announcement, and therefore could not be registered, the hospital may still submit claims using the Case Number format **`"CACDXXX"`** as a placeholder.

### Effective Date

Cancer care claims can be submitted from **1 July 2025 (1 ก.ค. 2568)** onward.

### Cancer Item Identification

- **Drug items**: BillMuad `3` with ClaimCat `"OPR"` — cancer drugs that SSO reimburses additionally
- **Service items**: BillMuad `8` (radiation) with ClaimCat `"OPR"` — radiation therapy items
- **Non-cancer items**: Same visit may contain non-cancer items with ClaimCat `"OP1"` (nursing fees, consultation fees, etc.)

### Combined Claims

A single visit (one BILLTRAN record) may contain both:
- Standard OPD items (ClaimCat `"OP1"`) paid through capitation
- Cancer-specific items (ClaimCat `"OPR"`) paid at additional rates

These are all under the same Invno (VN). The system routes them correctly via the ClaimCat field on individual BillItems and DispensedItems.

---

## 13. Reference File Analysis

### Source

File: `602601181709336749_10710_SSOPBIL_0156_01_20260119-191131.zip`

### Hospital

- **Hospital Code**: `10710`
- **Hospital Name**: โรงพยาบาลสกลนคร (Sakon Nakhon Hospital)
- **Session**: 0156
- **Generation Time**: 2026-01-19T19:11:31

### Contents

| File | Records | Size |
|---|---|---|
| BILLTRAN20260119.txt | 3 BILLTRAN + 6 BillItems | 1,473 bytes |
| BILLDISP20260119.txt | 0 Dispensing + 0 DispensedItems | 408 bytes |
| OPServices20260119.txt | 3 OPServices + 7 OPDx | 974 bytes |

### Observations

1. **All 3 visits are radiation therapy** (no drug dispensing) — this is why BILLDISP has `RECCOUNT=0` and empty Dispensing/DispensedItems sections. This is valid and expected for radiation-only visits.

2. **BILLTRAN records**:
   - AuthCode: `SSOCAC` (cancer-specific authorization)
   - Tflag: `E` (edit/re-submission, not `A`) — these are corrections of previously submitted claims
   - PayPlan: `80` (SSO)
   - HMain varies: `10711` (different main hospital for one patient) and `10710` (same hospital)
   - VerCode: Contains protocol codes like `C052R`, `C022R`

3. **BillItems**:
   - Each visit has 2 items:
     - BillMuad `C` (nursing): diagnostic service, 50.00 THB, ClaimCat `OP1`
     - BillMuad `8` (radiology): radiation treatment (3D-CRT or IMRT), 2,500 or 4,400 THB, ClaimCat `OPR`
   - SvRefID references OPServices.SvID (format: `681112NNNNNN`)
   - STDCode: 5-digit MoF standard codes (49304 for 3D-CRT, 49306 for IMRT, 55020/55021 for diagnostic services)
   - LCCode: Hospital local codes (7-digit)

4. **OPServices records**:
   - Class: `EC` (examination/consultation)
   - CareAccount: `1` (main hospital — Sakon Nakhon is not a specialist cancer center)
   - TypeServ: `03` (chronic follow-up) for 2 visits, `01` (first diagnosis) for 1 visit
   - TypeIn/TypeOut: `9`/`9` (other)
   - SvID format: `681112NNNNNN` (Buddhist year-based: 68=2025, 11=November, 12=day 12, then time-based sequence)
   - SVPID: Doctor license numbers in DR1 format (e.g., `ว54236`, `ว44842`)
   - Clinic: `99` (other — no specific department code)
   - SvCharge: `0.00` (charges are in BillItems, not summed here)
   - ClaimCat: `OP1` at service level — even though individual items have `OPR`

5. **OPDx records**:
   - ICD-10 codes WITHOUT dots: `C119` (nasopharyngeal carcinoma), `C539` (cervical cancer), `C770` (lymph node metastasis), `Z510` (radiotherapy session)
   - CodeSet: `TT` (ICD-10-TM)
   - SL: `1` for primary diagnosis, `4` for secondary diagnoses

6. **Checksum format**: The reference file uses `CheckSum` (capital S) while the spec uses `Checksum`. Both are accepted: `<?EndNote CheckSum="7445FA1E35029F809DA27116E231A369"?>`.

7. **Header indentation**: Header element tags are NOT indented (directly after `<Header>\n`). This differs from our implementation which uses 2-space indentation, but both are accepted.

---

## 14. Implementation Compliance Notes

### Compliance Matrix

| Requirement | Spec | Our Implementation | Status | Notes |
|---|---|---|---|---|
| **Encoding** | Windows-874 | Windows-874 via `iconv-lite` | COMPLIANT | All 3 files encoded before ZIP |
| **Delimiter** | Pipe `\|` | Pipe `\|` | COMPLIANT | Via `Object.values().join('\|')` |
| **Record terminator** | CRLF | `\r\n` | COMPLIANT | Explicit in generators |
| **XML declaration** | `<?xml version="1.0" encoding="windows-874"?>` | Exact match | COMPLIANT | |
| **ClaimRec attributes** | `System="OP" PayPlan="SS" Version="0.93"` | Adds `Prgs="HX"` | COMPLIANT | Prgs attribute matches reference file |
| **MD5 checksum** | On Windows-874 encoded bytes | Via `iconv-lite` then `crypto.createHash('md5')` | COMPLIANT | |
| **RECCOUNT** | Count of main records only | Transaction records counted | COMPLIANT | |
| **ZIP format** | ZIP only | `archiver` with zlib level 9 | COMPLIANT | |
| **ZIP filename** | `{hcode5}_SSOPBIL_{sessno4}_{subunit2}_{YYYYMMDD-HHMMSS}.zip` | Exact format | COMPLIANT | |
| **Text filenames** | `BILLTRAN<YYYYMMDD>.TXT` etc. | `.txt` (lowercase) | COMPLIANT | Case-insensitive per spec |
| **AuthCode** | `"SSOCAC"` for cancer | Hardcoded `"SSOCAC"` | COMPLIANT | |
| **MemberNo** | Case Number | `PatientCase.caseNumber` | COMPLIANT | |
| **VerCode** | Protocol QR Code | `PatientCase.vcrCode` | COMPLIANT | |
| **PayPlan** | `"80"` for SSO | Hardcoded `"80"` | COMPLIANT | |
| **Tflag** | A/E/D | `"A"` or `"E"` (checks previous exports) | COMPLIANT | |
| **Dispensing only for drugs** | Drug items only | Filters BillMuad `3` and `5` | COMPLIANT | |
| **SvRefID routing** | Drug→DispID, non-drug→SvID | Checked via `billingGroup` | COMPLIANT | |
| **CareAccount configurable** | Per hospital type | Via `AppSetting.ssop_care_account` | COMPLIANT | |
| **ICD-10 without dots** | No dots in diagnosis codes | Stored without dots | COMPLIANT | Validated at import |
| **Session number** | Sequential per hospital | Atomic transaction | COMPLIANT | |
| **DrgID** | TMT code | `tmtCode \|\| aipnCode` fallback | COMPLIANT | Falls back to AIPN if TMT unavailable |

### Data Gaps (Fields Needing Additional HIS Data)

These fields are specified in the SSOP format but we currently send empty or default values because the data is not available from the HIS integration:

| Field | File | Current Value | Ideal Source | Impact |
|---|---|---|---|---|
| `dfsCode` | DispensedItems #5 | Empty | HIS drug catalog dose/form/strength code | Low — optional field |
| `dfsText` | DispensedItems #6 | `description` (fallback) | HIS drug name with dose/form/strength | Low — using description as fallback |
| `Packsize` | DispensedItems #7 | Empty | HIS drug pack size | Low — optional field |
| `sigCode` | DispensedItems #8 | Empty | HIS prescription sig code | Low — will become required later |
| `sigText` | DispensedItems #9 | Empty | HIS prescription sig text | Low — optional for now |
| `MultiDisp` | DispensedItems #18 | Empty | HIS multi-dispensing info | Low — only for refill prescriptions |
| `SupplyFor` | DispensedItems #19 | Empty | HIS supply duration | Low — optional |
| `DayCover` | Dispensing #18 | Empty | HIS prescription duration | Low — optional |
| `Billno` | BILLTRAN #6 | Empty | HIS receipt number | Low — optional |
| `DTAppoint` | OPServices #11 | Empty | HIS next appointment date | Low — will become required later |
| `LcCode` | OPServices #16 | Empty | HIS local procedure code | Low — optional |
| `CodeSet` | OPServices #17 | Empty | Procedure code set identifier | Low — optional |
| `STDCode` | OPServices #18 | Empty | Standard procedure code (ICD-9-CM) | Low — optional |
| `SvTxCode` | OPServices #21 | Empty | OCPA/PA registration code | Low — optional |

### Implementation Differences from Reference File

| Aspect | Reference File | Our Implementation | Status |
|---|---|---|---|
| **Header indentation** | No indentation | No indentation | Fixed (2026-03-03) |
| **Checksum tag** | `CheckSum` (capital S) | `Checksum` (lowercase s) | Acceptable — both forms observed in the wild |
| **SvID format** | Buddhist calendar-based `YYMMDDHHMM` + seq | Buddhist Era `YYMMDDHHMMSS` | Fixed (2026-03-03) — uses BE year + actual service time |
| **DispID format** | (not applicable — no drug items) | `{VN}D{seq}` | Acceptable — DispID format is hospital-defined |
| **OPServices.SvCharge** | `0.00` | `0.00` | Fixed (2026-03-03) — professional fee only, charges in BillItems |
| **OPServices.ClaimCat** | `OP1` always at service level | `OP1` always at service level | Fixed (2026-03-03) — item-level handles OPR |
| **BILLTRAN.MemberNo** | Case Number | Case Number | Fixed (2026-03-03) — was incorrectly using vcrCode |
| **BILLTRAN.VerCode** | Protocol QR Code | Protocol QR Code (vcrCode) | Fixed (2026-03-03) — was incorrectly using protocolCode |
| **BillItems.STDCode** | TMT code (drugs) / standard code (non-drugs) | TMT code (drugs) / AIPN code (non-drugs) | Fixed (2026-03-03) — drug items now use tmtCode |
| **OPDx ICD-10** | Dot-free codes (e.g., C119) | Dot-free codes | Fixed (2026-03-03) — strips dots from ICD-10 |

### Key Validation Rules (from ssop-export.service.ts)

Our implementation validates the following before export:

1. Patient citizen ID must be exactly 13 digits
2. Patient full name must not be empty
3. VN must not be empty
4. Primary diagnosis must not be empty
5. At least one VisitBillingItem must exist
6. Physician license number must be present
7. Clinic code must be present
8. Service start time must be present
9. Service end time must be present
10. Case Number must be present (SSO cancer requirement)
11. VCR Code (Protocol QR Code) must be present (SSO cancer requirement)
12. Protocol code must be present (visit must have confirmed protocol)
13. Main hospital code must be present

---

*This document is an internal technical reference for the SSO Cancer Care application. It consolidates information from the official SSOP 0.93 specification (SSOP063.txt, OPD-SS 20171123), the SSO cancer care amendment (effective 1 July 2025), and analysis of real-world reference files from Thai hospitals.*
