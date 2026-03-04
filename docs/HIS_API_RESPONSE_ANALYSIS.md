# รายงานวิเคราะห์ความครบถ้วนของ HIS API Response

> **Endpoint**: `GET /api/patient?cid={citizenId}` หรือ `GET /api/patient?hn={hn}`
> **วันที่ตรวจสอบ**: 4 มีนาคม 2569 (2026-03-04)
> **ผู้จัดทำ**: ทีมพัฒนา SSO Cancer Care
> **เอกสารอ้างอิง**: HIS API Spec (`docs/HIS_API_REQUEST.md` §1.4), มาตรฐาน SSOP 0.93 (`SSOP063.txt`)

---

## 1. สรุปผลการตรวจสอบ (Executive Summary)

### สถานะ: ยังไม่พร้อมสำหรับ SSOP 0.93 Billing Export

ตรวจสอบ response จากผู้ป่วย 2 ราย (31 visits รวม) พบว่า:

| หมวด | สถานะ | รายละเอียด |
|------|--------|-----------|
| โครงสร้าง Response | ผ่าน | `{ success, data: { patient, visits[] } }` ตรงตาม spec |
| Patient Fields | ผ่าน | ข้อมูลผู้ป่วยครบถ้วน (hn, citizenId, fullName, etc.) |
| Visit Fields (พื้นฐาน) | ผ่านบางส่วน | 10/17 fields มีข้อมูล; 3 fields ส่งค่าว่าง; 3 fields ขาดหายไป; 1 field มีปัญหา data quality |
| **medications[]** | **ไม่ผ่าน** | **ขาดทั้งหมด** — ไม่มี array ใน response |
| **billingItems[]** | **ไม่ผ่าน** | **ขาดทั้งหมด** — ไม่มี array ใน response |

### ผลกระทบต่อระบบ SSO Cancer Care

| ฟังก์ชัน | สถานะ | เหตุผล |
|----------|--------|--------|
| นำเข้าข้อมูลผู้ป่วย/visits | ทำได้ | patient + visit fields พื้นฐานมีพอ |
| Protocol Analysis (drug matching) | **ทำไม่ได้** | ต้องการ `medications[]` เพื่อ resolve drug → match protocol |
| **SSOP 0.93 Billing Export** | **ทำไม่ได้เลย** | ต้องการ `billingItems[]` เพื่อ generate BILLTRAN, BILLDISP, OPServices |

---

## 2. ข้อมูลผู้ป่วยที่ตรวจสอบ

### ผู้ป่วยรายที่ 1 — มาตรา อุปสุ

| รายการ | ค่า |
|--------|-----|
| HN | 001026148 |
| CID | 3480300249269 |
| เพศ / วันเกิด | หญิง / 1970-09-17 |
| สิทธิ | ประกันสังคม (Hcode: 10711) |
| จำนวน Visits | 24 (ธ.ค. 2565 — ก.พ. 2569) |
| วินิจฉัยหลัก | **C509** (มะเร็งเต้านม, unspecified) |
| วินิจฉัยรอง | Z510 (Encounter for antineoplastic chemotherapy) |
| HPI | "Plan ให้ยา AC x 4" (AC regimen = Adriamycin + Cyclophosphamide) |
| ประเภทผู้ป่วย | **ผู้ป่วยมะเร็ง — ใช้สิทธิ์ สปส.** |

### ผู้ป่วยรายที่ 2 — จิตติมา สิงนิสัย

| รายการ | ค่า |
|--------|-----|
| HN | 001097565 |
| CID | 1470500107356 |
| เพศ / วันเกิด | หญิง / 1991-06-29 |
| สิทธิ | ประกันสังคม (Hcode: 10710) |
| จำนวน Visits | 7 (ส.ค. 2566 — ก.ย. 2568) |
| วินิจฉัยหลัก | **E282** (Polycystic ovarian syndrome) |
| ประเภทผู้ป่วย | **ไม่ใช่ผู้ป่วยมะเร็ง** (กรองออกโดยระบบอัตโนมัติ) |

---

## 3. วิเคราะห์ Visit Fields

### 3.1 ตารางเปรียบเทียบ Visit Fields

| # | Field | Spec Req. | ค่าที่ได้จริง | SSOP 0.93 Mapping | สถานะ |
|---|-------|-----------|--------------|-------------------|-------|
| 1 | `vn` | Required | มีค่า (เช่น "6606583") | BILLTRAN.Invno (#5), BillItems.Invno (#1) | ผ่าน |
| 2 | `visitDate` | Required | มีค่า (เช่น "2022-12-01") | BillItems.SvDate (#2), OPDx date reference | ผ่าน |
| 3 | `serviceStartTime` | Required | มีค่า (เช่น "2022-12-01T09:10:00") | OPServices.BegDT (#14), BILLTRAN.DTTran (#3) | ผ่าน |
| 4 | `serviceEndTime` | Required | มีค่า (เช่น "2022-12-01T12:10:00") | OPServices.EndDT (#15) | ผ่าน |
| 5 | `physicianLicenseNo` | Required | มีค่า (เช่น "ว.45879") | OPServices.SVPID (#12), Dispensing.Prescb (#8) | ผ่าน |
| 6 | `clinicCode` | Required | มีค่า (เช่น "01") | OPServices.Clinic (#13) | ผ่าน |
| 7 | `primaryDiagnosis` | Required | มีค่า* (เช่น "C509") | OPDx.Code (#5) — ICD-10 strip dots | ผ่าน* |
| 8 | `secondaryDiagnoses` | Required | มีค่า (เช่น "Z510") | OPDx.Code (#5) — sl=4 | ผ่าน |
| 9 | `hpi` | Required | มีค่า (เช่น "Plan ให้ยา AC x 4") | PatientVisit.hpi (internal) | ผ่าน |
| 10 | `doctorNotes` | Required | มีค่า (เช่น "F/U สูตินรีเวช") | PatientVisit.doctorNotes (internal) | ผ่าน |
| 11 | `serviceClass` | Required | **ส่งมาเป็น `""`** | OPServices.Class (#3) | ไม่ผ่าน |
| 12 | `serviceType` | Optional | **ส่งมาเป็น `""`** | OPServices.TypeServ (#8) | ไม่ผ่าน |
| 13 | `billNo` | Optional | **ส่งมาเป็น `null`** | BILLTRAN.Billno (#6) | ยอมรับได้ |
| 14 | `visitType` | Required | **ไม่มี field นี้ใน response** | OPServices.TypeIn (#9) | ไม่ผ่าน |
| 15 | `dischargeType` | Required | **ไม่มี field นี้ใน response** | OPServices.TypeOut (#10) | ไม่ผ่าน |
| 16 | `nextAppointmentDate` | Optional | ส่งมาเป็น `""` (บาง visits) | OPServices.DTAppoint (#11) | ปัญหา data quality |
| 17 | `prescriptionTime` | Optional | ส่งมาเป็น `""` (บาง visits) | Dispensing.Prescdt (#6) | ปัญหา data quality |

> \* `primaryDiagnosis` มีค่า `null` ใน visits บางรายการ (ดูหัวข้อ 6)

### 3.2 Fields ที่ส่งมาแต่ค่าว่าง — รายละเอียด

#### `serviceClass` — ส่งมาเป็น `""` ทุก visit

**ความหมาย**: ประเภทของการบริการ ใช้ระบุว่า visit ครั้งนี้เป็นการตรวจรักษา, หัตถการ, Lab, รังสี, หรืออื่น ๆ

**อ้างอิง SSOP 0.93**: SSOP063.txt §8.1 field #3 "Class" — format SE, len 2, required
- รหัสที่กำหนด: `EC`=ตรวจรักษา, `OP`=หัตถการ, `LB`=Lab, `XR`=รังสีวิทยา, `IV`=ตรวจวินิจฉัยพิเศษ, `ZZ`=อื่น ๆ

**ใช้ใน SSOP file**: OPServices record field #3 (Class) — เป็น **required field**

**ผลกระทบ**: ระบบใช้ค่า fallback `"EC"` (ตรวจรักษา) แทน ซึ่งอาจไม่ถูกต้องสำหรับ visits ที่เป็น Lab หรือรังสี

**ตัวอย่างค่าที่ควรส่ง**:
| กรณี | ค่าที่ควรส่ง |
|------|------------|
| ตรวจรักษาทั่วไป, รับเคมีบำบัด | `EC` |
| ผ่าตัด biopsy, หัตถการ | `OP` |
| เจาะเลือด, Lab | `LB` |
| ฉายรังสี, X-ray, CT scan | `XR` |

---

#### `serviceType` — ส่งมาเป็น `""` ทุก visit

**ความหมาย**: ลักษณะทางคลินิกของการให้บริการ (พบแพทย์ครั้งแรก, ติดตาม, ปรึกษา, ฉุกเฉิน, ฯลฯ)

**อ้างอิง SSOP 0.93**: SSOP063.txt §8.1 field #8 "TypeServ" — format SE, len 2, optional (แต่แนะนำให้ส่ง)
- รหัสที่กำหนด:

| รหัส | ความหมาย |
|------|----------|
| `01` | พบแพทย์เพื่อวินิจฉัยโรคครั้งแรก |
| `02` | พบแพทย์ตามนัดเพื่อติดตามการรักษาโรคทั่วไป |
| `03` | พบแพทย์ตามนัดเพื่อติดตามการรักษาโรคเรื้อรัง |
| `04` | ปรึกษาแพทย์ (Consultation) |
| `05` | รับบริการกรณีฉุกเฉิน |
| `06` | ตรวจสุขภาพทั่วไป |
| `07` | ตรวจวินิจฉัยทางรังสีวิทยา |
| `08` | โรคเรื้อรัง |

**ใช้ใน SSOP file**: OPServices record field #8 (TypeServ)

**ผลกระทบ**: ระบบใช้ค่า fallback `"03"` (ติดตามโรคเรื้อรัง) ซึ่งเหมาะกับผู้ป่วยมะเร็งส่วนใหญ่ แต่ไม่ถูกต้องสำหรับ visit ครั้งแรกที่ควรเป็น `"01"`

---

### 3.3 Fields ที่ขาดหายไปจาก Response

#### `visitType` — ไม่มี field นี้ใน response เลย

**ความหมาย**: ประเภทการเข้ารับบริการ (walk-in, นัดหมาย, ส่งต่อ, ฉุกเฉิน)

**อ้างอิง SSOP 0.93**: SSOP063.txt §8.1 field #9 "TypeIn" — format SE, len 1, **required** (ระบุ "y")
- รหัสที่กำหนด: `1`=walk-in, `2`=นัดหมาย, `3`=ส่งต่อ, `4`=ฉุกเฉิน, `9`=อื่น ๆ

**อ้างอิง Spec**: `docs/HIS_API_REQUEST.md` §1.4.3 — Priority **สูง** (ป้ายแดง)

**ใช้ใน SSOP file**: OPServices record field #9 (TypeIn) — **required field**

**ผลกระทบ**: ระบบใช้ค่า fallback `"9"` (อื่น ๆ) ซึ่ง **ไม่ถูกต้อง** — ผู้ป่วยมะเร็งส่วนใหญ่มาตามนัด (ควรเป็น `"2"`)

---

#### `dischargeType` — ไม่มี field นี้ใน response เลย

**ความหมาย**: ประเภทการจำหน่ายผู้ป่วย (กลับบ้าน, admit, ส่งต่อ, เสียชีวิต)

**อ้างอิง SSOP 0.93**: SSOP063.txt §8.1 field #10 "TypeOut" — format SE, len 1, **required** (ระบุ "y")
- รหัสที่กำหนด: `1`=กลับบ้าน, `2`=admit, `3`=ส่งต่อ, `4`=เสียชีวิต, `5`=หนีกลับ, `9`=อื่น ๆ

**อ้างอิง Spec**: `docs/HIS_API_REQUEST.md` §1.4.3 — Priority **สูง** (ป้ายแดง)

**ใช้ใน SSOP file**: OPServices record field #10 (TypeOut) — **required field**

**ผลกระทบ**: ระบบใช้ค่า fallback `"9"` (อื่น ๆ) ซึ่ง **ไม่ถูกต้อง** — ผู้ป่วยนอกส่วนใหญ่กลับบ้าน (ควรเป็น `"1"`)

---

#### `dayCover` — ไม่มี field นี้ใน response เลย

**ความหมาย**: ระยะเวลาที่ตั้งใจให้ผู้ป่วยใช้ยาที่สั่งทั้งใบ (เช่น "30D" = 30 วัน)

**อ้างอิง SSOP 0.93**: SSOP063.txt §7.1 field #18 "DayCover" — format DP1, len 4, optional
- หน่วย: `D`=วัน, `W`=สัปดาห์ (7D), `M`=เดือน (28-30D)

**ใช้ใน SSOP file**: Dispensing record field #18 (DayCover)

**ผลกระทบ**: ต่ำ — field เป็น optional ใน SSOP 0.93 ระบบส่งค่าว่าง ไม่มีผลต่อการ reject

---

## 4. วิเคราะห์ medications[] — ขาดทั้งหมด

### สถานะ: ไม่มี `medications` array ใน response เลย

**ตาม Spec ที่ตกลงกัน** (`docs/HIS_API_REQUEST.md` §1.4.4) — ทุก visit ควรมี `medications[]` array:

```json
"medications": [
  {
    "hospitalCode": "1502262",
    "medicationName": "PACLITAXEL 300MG/50ML INJ (INTAXEL)",
    "quantity": "1",
    "unit": "vial"
  }
]
```

### medications ใช้ทำอะไรในระบบ

1. **Drug Resolution**: ระบบใช้ `medicationName` เพื่อ resolve (จับคู่) กับ Drug ในฐานข้อมูล ผ่าน 3 ขั้นตอน:
   - Exact match → `startsWith` match → `contains` match

2. **Protocol Matching & Scoring**: ยาที่ resolve ได้จะถูกนำไปคำนวณ score:
   - Drug match score: สูงสุด 40 คะแนน (สัดส่วนยาที่ตรง × 40)
   - Drug count bonus: สูงสุด 10 คะแนน
   - Formulary compliance: สูงสุด 20 คะแนน (เทียบกับ SSO Protocol Drug formulary)

3. **AI Suggestion**: ส่งรายชื่อยาเป็น context ให้ AI provider แนะนำ protocol

### ผลกระทบเมื่อไม่มี medications

| ฟังก์ชัน | ผลกระทบ |
|----------|---------|
| Drug Resolution | ไม่มีข้อมูลยา → resolved drugs = 0 |
| Protocol Matching | Drug match score = 0/40, drug bonus = 0/10, formulary = 0/20 → **ขาด 70 คะแนน** |
| AI Suggestion | AI ไม่มีข้อมูลยา → แนะนำจาก ICD-10 + stage เท่านั้น (ความแม่นยำลดลง) |
| Non-protocol detection | ไม่สามารถตรวจจับยาเคมีบำบัดนอก protocol ได้ |

---

## 5. วิเคราะห์ billingItems[] — ขาดทั้งหมด

### สถานะ: ไม่มี `billingItems` array ใน response เลย

**ตาม Spec ที่ตกลงกัน** (`docs/HIS_API_REQUEST.md` §1.4.5) — ทุก visit ควรมี `billingItems[]` array:

```json
"billingItems": [
  {
    "hospitalCode": "1502262",
    "aipnCode": "3119967",
    "tmtCode": "1052756000040901",
    "stdCode": "49304",
    "billingGroup": "3",
    "description": "PACLITAXEL 300MG/50ML INJ",
    "dfsText": "Paclitaxel 300mg/50ml injection",
    "packsize": "50 ml",
    "sigCode": "",
    "sigText": "IV drip in D5W 500ml over 3hr",
    "supplyDuration": "1D",
    "quantity": 1,
    "unitPrice": 2500.00,
    "claimUnitPrice": 2500.00,
    "claimCategory": "OPR"
  }
]
```

### billingItems ใช้สร้าง SSOP 0.93 Billing Files อย่างไร

`billingItems[]` เป็น **แหล่งข้อมูลหลัก** สำหรับสร้าง SSOP 0.93 electronic billing files ทั้ง 3 ไฟล์:

#### 5.1 BILLTRAN — ธุรกรรมเบิก (SSOP063.txt §5-6)

**billingItems → `<BillItems>` records** (13 pipe-delimited fields ต่อ record):

| # | SSOP Field | มาจาก billingItems field | คำอธิบาย |
|---|-----------|-------------------------|----------|
| 1 | Invno | (parent visit.vn) | FK → BILLTRAN transaction |
| 2 | SvDate | (parent visit.visitDate) | วันที่ให้บริการ |
| 3 | **BillMuad** | **`billingGroup`** | **หมวดค่ารักษา** (3=ยา, 5=เวชภัณฑ์, 8=ค่าตรวจ, B=ค่ารังสี, C=ค่าบริการ, G=ค่าห้อง) |
| 4 | **LCCode** | **`hospitalCode`** | **รหัสรายการของ รพ. (Local Code)** |
| 5 | **STDCode** | **`stdCode`** (fallback: `tmtCode`/`aipnCode`) | **รหัสมาตรฐานแห่งชาติ** |
| 6 | **Desc** | **`description`** | **คำอธิบายรายการ** |
| 7 | **QTY** | **`quantity`** | **จำนวน** |
| 8 | **UP** | **`unitPrice`** | **ราคาขายต่อหน่วย** |
| 9 | ChargeAmt | quantity × unitPrice | รวมราคาขาย |
| 10 | **ClaimUP** | **`claimUnitPrice`** | **ราคาเบิกต่อหน่วย** |
| 11 | ClaimAmount | quantity × claimUnitPrice | รวมยอดเบิก |
| 12 | SvRefID | (computed) | อ้างอิง Dispensing/OPServices |
| 13 | **ClaimCat** | **`claimCategory`** | **ประเภทบัญชีเบิก** (OP1/OPR) |

> **BILLTRAN.Amount (#9)** = ผลรวมของ `quantity × unitPrice` ของ billingItems ทั้งหมดใน visit
> **BILLTRAN.ClaimAmt (#17)** = ผลรวมของ `quantity × claimUnitPrice` ของ billingItems ทั้งหมดใน visit
> → ถ้าไม่มี billingItems **ยอดเงินทั้งธุรกรรมจะเป็น 0.00**

#### 5.2 BILLDISP — การจ่ายยา (SSOP063.txt §7)

billingItems ที่มี `billingGroup = "3"` (ค่ายา) หรือ `"5"` (เวชภัณฑ์) จะถูกใช้สร้าง:

**`<Dispensing>` records** (18 fields) — 1 record ต่อ visit:

| # | SSOP Field | มาจาก | คำอธิบาย |
|---|-----------|-------|----------|
| 6 | **Prescdt** | `prescriptionTime` (fallback: serviceStartTime → visitDate) | วัน-เวลาสั่งยา |
| 9 | **Itemcnt** | count of drug billingItems | จำนวนรายการยา |
| 10 | **ChargeAmt** | sum(qty × unitPrice) of drug items | รวมราคาจำหน่ายยา |
| 11 | **ClaimAmt** | sum(qty × claimUnitPrice) of drug items | รวมค่ายาเบิกได้ |
| 18 | DayCover | `dayCover` | ระยะเวลาครอบคลุม |

**`<DispensedItems>` records** (19 fields) — 1 record ต่อ drug item:

| # | SSOP Field | มาจาก billingItems field | คำอธิบาย |
|---|-----------|-------------------------|----------|
| 3 | **Hospdrgid** | **`hospitalCode`** | **รหัสยาของ รพ.** |
| 4 | **DrgID** | **`tmtCode`** (fallback: `aipnCode`) | **รหัสยามาตรฐาน TMT** |
| 6 | **dfsText** | **`dfsText`** (fallback: `description`) | **ชื่อยา/dose/form/strength** |
| 7 | Packsize | `packsize` | ขนาดบรรจุ |
| 8 | sigCode | `sigCode` | รหัสวิธีใช้ยา |
| 9 | sigText | `sigText` | ข้อความวิธีใช้ยา |
| 10 | **Quantity** | **`quantity`** | **ปริมาณยาที่จ่าย** |
| 11 | **UnitPrice** | **`unitPrice`** | **ราคาขายต่อหน่วย** |
| 12 | ChargeAmt | quantity × unitPrice | รวมราคาขาย |
| 13 | **ReimbPrice** | **`claimUnitPrice`** | **ราคาเบิกต่อหน่วย** |
| 14 | ReimbAmt | quantity × claimUnitPrice | ยอดเบิกได้ |
| 17 | **ClaimCat** | **`claimCategory`** | **ประเภทบัญชีเบิก** |
| 19 | SupplyFor | `supplyDuration` | ระยะเวลาจ่ายยา |

#### 5.3 OPServices — ธุรกรรมตรวจรักษา (SSOP063.txt §8)

ไม่ได้ใช้ billingItems โดยตรง แต่ **BillItems.SvRefID** เชื่อมโยง billingItems กับ OPServices.SvID — ถ้าไม่มี billingItems ก็ไม่มี SvRefID reference

### ผลกระทบเมื่อไม่มี billingItems

| SSOP File | ผลกระทบ |
|-----------|---------|
| **BILLTRAN** | `<BillItems>` ว่างเปล่า — **ไม่มีรายการค่ารักษาเลย** ยอดเงิน = 0.00 |
| **BILLDISP** | `<Dispensing>` และ `<DispensedItems>` ว่างเปล่า — **ไม่มีรายการจ่ายยาเลย** |
| **OPServices** | SvRefID ไม่มี reference — **ไม่สมบูรณ์ตามมาตรฐาน** |

> **สรุป: ถ้าไม่มี billingItems[] → SSOP 0.93 billing export ไม่สามารถทำได้ ส่งเบิก สปส. ไม่ได้**

---

## 6. ปัญหา Data Quality

### 6.1 Empty String `""` vs `null`

**ปัญหา**: หลาย fields ส่งมาเป็น `""` (empty string) แทนที่จะเป็น `null` สำหรับค่าที่ไม่มีข้อมูล

| Field | ค่าที่ได้ | ค่าที่ควรส่ง | ปัญหา |
|-------|----------|-------------|-------|
| `nextAppointmentDate` | `""` | `null` | `new Date("")` → Invalid Date → อาจ crash |
| `prescriptionTime` | `""` | `null` | `new Date("")` → Invalid Date → format ผิด |
| `serviceClass` | `""` | `null` หรือค่าจริง | `"" \|\| "EC"` = `"EC"` (fallback ทำงาน แต่ไม่ชัดเจนว่าไม่มีข้อมูลหรือเจตนาส่งว่าง) |
| `serviceType` | `""` | `null` หรือค่าจริง | เหมือนกัน |

**คำแนะนำ**: ใช้ `null` สำหรับค่าที่ไม่มีข้อมูล — อย่าใช้ `""` (empty string) สำหรับ fields ที่เป็น date/time หรือ code values

### 6.2 `primaryDiagnosis: null`

**พบใน**: visits บางรายการ (จากตัวอย่าง sample ก่อนหน้า มี 6 visits ที่ `primaryDiagnosis` เป็น `null`)

**ผลกระทบ**: ระบบกรองออกเพราะไม่สามารถจับคู่ ICD-10 ได้ — visits เหล่านี้จะไม่ถูก import

**คำแนะนำ**: ทุก visit ควรมี `primaryDiagnosis` — ถ้าแพทย์ยังไม่ได้ลงรหัส ให้ส่ง `null` (ไม่ใช่ `""`) และระบบจะข้ามไป

### 6.3 Visit ย้อนหลังหลายปี

**พบ**: ผู้ป่วยรายที่ 1 มี visits ตั้งแต่ ธ.ค. 2565 ถึง ก.พ. 2569 (กว่า 3 ปี, 24 visits)

**ผลกระทบ**: ระบบต้องทำ client-side date filtering เพราะ HIS ส่ง visits ทั้งหมดมา ไม่รองรับ `from`/`to` parameter

**คำแนะนำ**: พิจารณาเพิ่ม `from`/`to` query parameters ในอนาคต เพื่อลด payload size

---

## 7. Roadmap เรียงตามลำดับความสำคัญ

> อ้างอิง Priority Matrix จาก `docs/HIS_API_REQUEST.md` §1.4.1

### Phase 1: Critical — ต้องมีก่อนใช้งานจริง

| ข้อมูล | เหตุผล | SSOP Reference |
|--------|--------|----------------|
| **`billingItems[]`** | **ขาดทั้ง array** — ไม่มีรายการค่ารักษา ไม่สามารถ generate SSOP files ได้เลย | SSOP063.txt §6 (BillItems), §7.2 (DispensedItems) |
| **`medications[]`** | **ขาดทั้ง array** — ไม่สามารถ resolve drugs → match protocol → calculate scoring ได้ | ใช้ internal (protocol analysis) |

> **ผลลัพธ์ Phase 1**: ระบบสามารถ generate SSOP 0.93 billing files ได้ + protocol matching ทำงาน

### Phase 2: High Priority — SSOP required fields

| ข้อมูล | ค่าที่ต้องการ | SSOP Reference | Fallback ปัจจุบัน |
|--------|-------------|----------------|-------------------|
| `visitType` | `1`/`2`/`3`/`4`/`9` | SSOP063.txt §8.1 #9 (TypeIn) — **required** | `"9"` (อื่น ๆ — ไม่ถูกต้อง) |
| `dischargeType` | `1`/`2`/`3`/`4`/`5`/`9` | SSOP063.txt §8.1 #10 (TypeOut) — **required** | `"9"` (อื่น ๆ — ไม่ถูกต้อง) |
| `stdCode` (ใน billingItems) | TMT code (ยา) / MoF code (บริการ) | SSOP063.txt §6 BillItems #5 — **required** | `tmtCode` fallback `aipnCode` |

> **ผลลัพธ์ Phase 2**: SSOP 0.93 files มีค่า TypeIn, TypeOut ที่ถูกต้อง + STDCode ตรงมาตรฐาน

### Phase 3: Medium Priority — ปรับปรุงความถูกต้อง

| ข้อมูล | ค่าที่ต้องการ | SSOP Reference | Fallback ปัจจุบัน |
|--------|-------------|----------------|-------------------|
| `serviceClass` | `EC`/`OP`/`LB`/`XR`/`IV`/`ZZ` | SSOP063.txt §8.1 #3 (Class) — required | `"EC"` (ตรวจรักษา) |
| `dfsText` (ใน billingItems) | ชื่อยา/dose/form/strength | SSOP063.txt §7.2 #6 — required | ใช้ `description` |
| `sigText` (ใน billingItems) | ข้อความวิธีใช้ยา | SSOP063.txt §7.2 #9 — optional | เว้นว่าง |

> **ผลลัพธ์ Phase 3**: SSOP 0.93 files มี Class ถูกต้องตามประเภทบริการ + ข้อมูลยาละเอียดขึ้น

### Phase 4: Low Priority — ข้อมูลเสริม

| ข้อมูล | SSOP Reference | Fallback ปัจจุบัน |
|--------|----------------|-------------------|
| `billNo` | SSOP063.txt §5 BILLTRAN #6 — optional | เว้นว่าง |
| `packsize` (ใน billingItems) | SSOP063.txt §7.2 #7 — optional | เว้นว่าง |
| `sigCode` (ใน billingItems) | SSOP063.txt §7.2 #8 — optional | เว้นว่าง |
| `dayCover` | SSOP063.txt §7.1 #18 — optional | เว้นว่าง |
| `supplyDuration` (ใน billingItems) | SSOP063.txt §7.2 #19 — optional | เว้นว่าง |
| `nextAppointmentDate` | SSOP063.txt §8.1 #11 (DTAppoint) — optional | เว้นว่าง |

> **ผลลัพธ์ Phase 4**: SSOP 0.93 files สมบูรณ์ 100%

---

## 8. อ้างอิงมาตรฐาน SSOP 0.93

### 8.1 โครงสร้าง SSOP 0.93 Files

ระบบ SSO Cancer Care generate 3 XML files สำหรับเบิกค่ารักษาพยาบาลจาก สปส.:

| ไฟล์ | เนื้อหา | SSOP063.txt Section |
|------|---------|-------------------|
| **BILLTRAN** | ธุรกรรมเบิก (`<BILLTRAN>` 19 fields) + รายการค่ารักษา (`<BillItems>` 13 fields) | §5 (BILLTRAN), §6 (BillItems) |
| **BILLDISP** | การจ่ายยา (`<Dispensing>` 18 fields) + รายการยาที่จ่าย (`<DispensedItems>` 19 fields) | §7.1 (Dispensing), §7.2 (DispensedItems) |
| **OPServices** | ธุรกรรมตรวจรักษา (`<OPServices>` 22 fields) + วินิจฉัย (`<OPDx>` 6 fields) | §8.1 (OPServices), §8.2 (OPDx) |

### 8.2 Code Set References จาก SSOP063.txt

**Class** (SSOP063.txt p.19 — OPServices field #3):

| รหัส | ความหมาย |
|------|----------|
| `EC` | การตรวจรักษา |
| `OP` | หัตถการ |
| `LB` | Lab |
| `XR` | การตรวจวินิจฉัยและรักษาทางรังสีวิทยา |
| `IV` | การตรวจวินิจฉัยด้วยวิธีพิเศษอื่น ๆ |
| `ZZ` | อื่น ๆ ที่ยังไม่กำหนด |

**TypeServ** (SSOP063.txt p.19 — OPServices field #8):

| รหัส | ความหมาย |
|------|----------|
| `01` | พบแพทย์เพื่อวินิจฉัยโรคครั้งแรก |
| `02` | พบแพทย์ตามนัดเพื่อติดตามการรักษาโรคทั่วไป |
| `03` | พบแพทย์ตามนัดเพื่อติดตามการรักษาโรคเรื้อรัง |
| `04` | ปรึกษาแพทย์ (Consultation) |
| `05` | รับบริการกรณีฉุกเฉิน |
| `06` | ตรวจสุขภาพทั่วไป |
| `07` | ตรวจวินิจฉัยทางรังสีวิทยา |
| `08` | โรคเรื้อรัง |

**TypeIn** (SSOP063.txt p.20 — OPServices field #9):

| รหัส | ความหมาย |
|------|----------|
| `1` | ผู้ป่วยใหม่ (walk-in) |
| `2` | นัดหมาย |
| `3` | ส่งต่อจาก รพ. อื่น |
| `4` | ฉุกเฉิน |
| `9` | อื่น ๆ |

**TypeOut** (SSOP063.txt p.20 — OPServices field #10):

| รหัส | ความหมาย |
|------|----------|
| `1` | กลับบ้าน |
| `2` | Admit เป็นผู้ป่วยใน |
| `3` | ส่งต่อ |
| `4` | เสียชีวิต |
| `5` | หนีกลับ |
| `9` | อื่น ๆ |

**BillingGroup / BillMuad** (SSOP063.txt §6 BillItems field #3):

| รหัส | ความหมาย | ใน SSOP |
|------|----------|---------|
| `3` | ค่ายา | → สร้าง BILLDISP ด้วย |
| `5` | ค่าเวชภัณฑ์ที่มิใช่ยา | → สร้าง BILLDISP ด้วย |
| `8` | ค่าตรวจวินิจฉัย | BillItems only |
| `B` | ค่ารังสีรักษา | BillItems only |
| `C` | ค่าบริการผู้ป่วยนอก | BillItems only |
| `G` | ค่าห้อง/ค่าอาหาร | BillItems only |

### 8.3 ความเชื่อมโยงระหว่าง SSOP Files

```
BILLTRAN ─────────────────── BillItems
  │  Invno (VN)                │  SvRefID ──→ Dispensing.DispID (drug items)
  │                            │  SvRefID ──→ OPServices.SvID (non-drug items)
  │                            │
  ├── Dispensing ──────── DispensedItems
  │     DispID                   DispID (FK)
  │     SvID ──→ OPServices     DrgID = tmtCode
  │                              Hospdrgid = hospitalCode
  │
  └── OPServices ─────── OPDx
        SvID (PK)             SvID (FK)
        Class, TypeServ       ICD-10 codes
        TypeIn, TypeOut
```

---

## 9. สรุปและข้อเสนอแนะ

### สิ่งที่ต้องดำเนินการเร่งด่วน

1. **เพิ่ม `billingItems[]`** — เป็นข้อมูลสำคัญที่สุด ใช้สร้าง SSOP 0.93 billing files ทั้ง 3 ไฟล์
2. **เพิ่ม `medications[]`** — ใช้สำหรับ protocol matching และ drug resolution
3. **เพิ่ม `visitType`** — TypeIn เป็น required ใน SSOP 0.93 (ส่วนใหญ่เป็น `"2"` = นัดหมาย)
4. **เพิ่ม `dischargeType`** — TypeOut เป็น required ใน SSOP 0.93 (ส่วนใหญ่เป็น `"1"` = กลับบ้าน)

### สิ่งที่ควรปรับปรุง

5. **`serviceClass`** — ส่งค่าจริงแทน `""` (ส่วนใหญ่เป็น `"EC"`)
6. **Data quality**: ใช้ `null` แทน `""` สำหรับค่าที่ไม่มีข้อมูล (โดยเฉพาะ date/time fields)

### Timeline ที่เสนอ

| Phase | ขอบเขต | ผลลัพธ์ |
|-------|--------|---------|
| **Phase 1** | `billingItems[]` + `medications[]` | ระบบทำงานได้ — generate SSOP 0.93 + protocol matching |
| **Phase 2** | `visitType` + `dischargeType` + `stdCode` | SSOP files ถูกต้องตาม required fields |
| **Phase 3** | `serviceClass` + `dfsText` + `sigText` | ความถูกต้องดีขึ้น |
| **Phase 4** | optional fields ที่เหลือ | สมบูรณ์ 100% |

---

> **หมายเหตุ**: รายงานนี้จัดทำจากการวิเคราะห์ response จริงจาก HIS API 2 ราย (31 visits) เปรียบเทียบกับ spec ที่ตกลงกัน (`docs/HIS_API_REQUEST.md` §1.4) และมาตรฐาน SSOP 0.93 (`SSOP063.txt` Version 0.93, สำนักสารสนเทศบริการสุขภาพ สกส.)
