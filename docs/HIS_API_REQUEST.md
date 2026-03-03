## 1. HIS API Specification (เอกสารสำหรับทีม HIS)

> **เอกสารนี้จะถูกส่งให้ทีม HIS ของโรงพยาบาล** เพื่อให้พัฒนา API ตามที่ระบบเราต้องการ

### 1.1 Overview

**สำคัญ**: Endpoint นี้ใช้สำหรับระบบ SSO Cancer Care โดยเฉพาะ — ต้องกรอง **เฉพาะผู้ป่วยสิทธิ์ประกันสังคม** เท่านั้น ไม่รวมผู้ป่วยสิทธิ์อื่น (บัตรทอง, ข้าราชการ, ฯลฯ)

ระบบ SSO Cancer Care ต้องเรียกใช้ API จากระบบ HIS ของโรงพยาบาล 3 endpoints:

| #   | Endpoint                    | วัตถุประสงค์                                          | เรียกเมื่อ                         | สถานะ             |
| --- | --------------------------- | ----------------------------------------------------- | ---------------------------------- | ----------------- |
| 1   | **Patient Search**          | ค้นหาผู้ป่วยจาก HN / Citizen ID                       | ผู้ใช้กดปุ่ม "ค้นหาจาก HIS"        | ✅ ส่งมอบแล้ว     |
| 2   | **Patient Visit Data**      | ดึงข้อมูล visits + ค่ารักษาพยาบาลทั้งหมดของผู้ป่วย    | ผู้ใช้กดปุ่ม "นำเข้าข้อมูล"        | ⏳ รอทีม HIS      |
| 3   | **Advanced Patient Search** | ค้นหาผู้ป่วยจากเงื่อนไขทางคลินิก (วันที่/วินิจฉัย/ยา) | ผู้ใช้กดปุ่ม "ค้นหาขั้นสูงจาก HIS" | ⏳ รอทีม HIS      |

### 1.2 Authentication

| Item         | รายละเอียด                                                                         |
| ------------ | ---------------------------------------------------------------------------------- |
| Method       | **API Key** ใน Header: `Authorization: Bearer {api_key}` (หรือตามที่ทีม HIS กำหนด) |
| IP Whitelist | จำกัดเฉพาะ IP ของ server SSO Cancer Care                                           |
| Rate Limit   | ≥ 10 requests/minute ต่อ IP                                                        |

### 1.3 Endpoint 1: Patient Search ✅

> **หมายเหตุ**: ทีม HIS ส่งมอบ endpoint นี้แล้ว โดยรูปแบบแตกต่างจาก spec เดิมที่ร้องขอ — ฝั่ง SSO Cancer Care ได้ปรับ code รองรับแล้ว

**เดิม (spec ที่ร้องขอ):**
```
GET /api/patients/search?q={searchTerm}&type={searchType}
```

**จริง (ที่ทีม HIS ส่งมอบ):**
```
GET /api/patient?hn={hn}
GET /api/patient?cid={citizenId}
```

**Parameters:**

| Parameter | Type   | Required      | Description                       |
| --------- | ------ | ------------- | --------------------------------- |
| `hn`      | string | ✅ (เลือก 1) | HN ของผู้ป่วย (9 หลัก เติม 0 ข้างหน้า) |
| `cid`     | string | ✅ (เลือก 1) | เลขบัตรประชาชน 13 หลัก             |

> **หมายเหตุ**: ส่ง `hn` หรือ `cid` อย่างใดอย่างหนึ่ง ไม่รองรับค้นหาด้วยชื่อ-สกุล

**HN Format**: ระบบ HIS ใช้ HN 9 หลัก — ถ้า HN น้อยกว่า 9 หลัก ให้เติม `0` ข้างหน้าจนครบ (เช่น `1002104` → `001002104`)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "hn": "001002104",
      "citizenId": "3480100319816",
      "titleName": "น.ส.",
      "fullName": "พิศมัย หาญมูล",
      "gender": "F",
      "dateOfBirth": "1968-12-28",
      "address": "3 หมู่ที่ 3   ต.ท่าค้อ อ.เมืองนครพนม จ.นครพนม 48000",
      "phoneNumber": "0651192511",
      "insuranceType": "ประกันสังคมนอกเครือข่าย OP,IP",
      "mainHospitalCode": "10711",
      "totalVisitCount": 3
    }
  ]
}
```

**Response Fields:**

| Field              | Type   | Required | คำอธิบาย                      | ใช้ใน                              |
| ------------------ | ------ | -------- | ----------------------------- | ---------------------------------- |
| `hn`               | string | ✅       | เลข HN ของ รพ. (9 หลัก)       | Patient.hn, OPServices.HN          |
| `citizenId`        | string | ✅       | เลขบัตรประชาชน 13 หลัก        | Patient.citizenId, BILLTRAN.Pid    |
| `titleName`        | string | ✅       | คำนำหน้า (นาย/นาง/น.ส.)       | Patient.titleName (แสดง UI)        |
| `fullName`         | string | ✅       | คำนำหน้า+ชื่อ+สกุล            | Patient.fullName, BILLTRAN.Name    |
| `gender`           | string | ✅       | เพศ: "M" / "F"                | Patient.gender (แสดง UI)           |
| `dateOfBirth`      | string | ✅       | วันเกิด (YYYY-MM-DD)          | Patient.dateOfBirth (คำนวณอายุ UI) |
| `address`          | string | ✅       | ที่อยู่                       | Patient.address (แสดง UI)          |
| `phoneNumber`      | string | ✅       | เบอร์โทร                      | Patient.phoneNumber                |
| `insuranceType`    | string | ✅       | สิทธิ์การรักษา                | แสดง UI เท่านั้น                   |
| `mainHospitalCode` | string | ✅       | รหัส รพ.หลักตามสิทธิ (hcode5) | BILLTRAN.HMain (#15)               |
| `totalVisitCount`  | number | ✅       | จำนวน visit ทั้งหมดใน HIS     | แสดง UI เท่านั้น                   |

**Error Response (ไม่พบผู้ป่วย):**

```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "ไม่พบข้อมูลผู้ป่วย HN 001002104"
  }
}
```

### 1.4 Endpoint 2: Patient Visit Data (Full Import) ⏳

> **สถานะ**: รอทีม HIS พัฒนา

```
GET /api/patients/{hn}/visits?from={startDate}&to={endDate}
```

**Parameters:**

| Parameter | Type  | Required | Description                                  |
| --------- | ----- | -------- | -------------------------------------------- |
| `hn`      | path  | ✅       | HN ของผู้ป่วย (9 หลัก)                       |
| `from`    | query | ❌       | วันเริ่มต้น (YYYY-MM-DD) — default: ไม่จำกัด |
| `to`      | query | ❌       | วันสิ้นสุด (YYYY-MM-DD) — default: วันนี้    |

**Response:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "hn": "001002104",
      "citizenId": "3480100319816",
      "titleName": "น.ส.",
      "fullName": "พิศมัย หาญมูล",
      "gender": "F",
      "dateOfBirth": "1968-12-28",
      "address": "3 หมู่ที่ 3   ต.ท่าค้อ อ.เมืองนครพนม จ.นครพนม 48000",
      "phoneNumber": "0651192511",
      "mainHospitalCode": "10711"
    },
    "visits": [
      {
        "vn": "7085907",
        "visitDate": "2025-11-12",
        "serviceStartTime": "2025-11-12T08:30:00",
        "serviceEndTime": "2025-11-12T10:30:00",
        "physicianLicenseNo": "ก54236",
        "clinicCode": "01",
        "primaryDiagnosis": "C509",
        "secondaryDiagnoses": "Z511,E119",
        "hpi": "มาตามนัดรับเคมีบำบัด cycle 3",
        "doctorNotes": "ให้ AC regimen ตามแผน",
        "medications": [
          {
            "hospitalCode": "1502262",
            "medicationName": "PACLITAXEL 300MG/50ML INJ (INTAXEL)",
            "quantity": "1",
            "unit": "vial"
          },
          {
            "hospitalCode": "3100453",
            "medicationName": "ค่าบริการผสมยานอก นอกเวลาราชการ",
            "quantity": "1",
            "unit": "ครั้ง"
          }
        ],
        "billingItems": [
          {
            "hospitalCode": "1502262",
            "aipnCode": "55021",
            "billingGroup": "3",
            "description": "PACLITAXEL 300MG/50ML INJ",
            "quantity": 1,
            "unitPrice": 2500.0,
            "claimUnitPrice": 2500.0,
            "claimCategory": "OP1"
          },
          {
            "hospitalCode": "3100453",
            "aipnCode": "55021",
            "billingGroup": "C",
            "description": "ค่าบริการผสมยานอก นอกเวลาราชการ",
            "quantity": 1,
            "unitPrice": 50.0,
            "claimUnitPrice": 50.0,
            "claimCategory": "OP1"
          }
        ]
      }
    ]
  }
}
```

**Visit Fields:**

| Field                | Type   | Required | คำอธิบาย                                    | ใช้ใน                                 |
| -------------------- | ------ | -------- | ------------------------------------------- | ------------------------------------- |
| `vn`                 | string | ✅       | Visit Number (unique)                       | PatientVisit.vn, BILLTRAN.Invno       |
| `visitDate`          | string | ✅       | วันที่รับบริการ (YYYY-MM-DD)                | PatientVisit.visitDate                |
| `serviceStartTime`   | string | ✅       | เวลาเริ่มบริการ (ISO 8601)                  | OPServices.BegDT (#14)                |
| `serviceEndTime`     | string | ✅       | เวลาสิ้นสุดบริการ (ISO 8601)                | OPServices.EndDT (#15)                |
| `physicianLicenseNo` | string | ✅       | เลขที่ใบประกอบวิชาชีพแพทย์                  | OPServices.SVPID (#12)                |
| `clinicCode`         | string | ✅       | รหัสแผนก (01=อายุรกรรม, 10=รังสี, 99=อื่นๆ) | OPServices.Clinic (#13)               |
| `primaryDiagnosis`   | string | ✅       | ICD-10 หลัก                                 | PatientVisit.primaryDiagnosis, OPDx   |
| `secondaryDiagnoses` | string | ✅       | ICD-10 รอง (comma-separated)                | PatientVisit.secondaryDiagnoses, OPDx |
| `hpi`                | string | ✅       | History of Present Illness                  | PatientVisit.hpi                      |
| `doctorNotes`        | string | ✅       | หมายเหตุจากแพทย์                            | PatientVisit.doctorNotes              |

**Medication Fields** (array `medications`):

| Field            | Type   | Required | คำอธิบาย                          | ใช้ใน                          |
| ---------------- | ------ | -------- | --------------------------------- | ------------------------------ |
| `hospitalCode`   | string | ✅       | รหัสยา/บริการของ รพ. (Local Code) | VisitMedication.hospitalCode   |
| `medicationName` | string | ✅       | ชื่อยา/บริการ                     | VisitMedication.medicationName |
| `quantity`       | string | ✅       | จำนวน                             | VisitMedication.quantity       |
| `unit`           | string | ✅       | หน่วย                             | VisitMedication.unit           |

> **Note**: `medications` ใช้สำหรับ protocol analysis (resolve ไปหา Drug → matching → scoring) — เป็นข้อมูลที่ import.service.ts ปัจจุบันรองรับอยู่แล้ว

**Billing Item Fields** (array `billingItems`):

| Field            | Type   | Required | คำอธิบาย                                   | ใช้ใน SSOP                |
| ---------------- | ------ | -------- | ------------------------------------------ | ------------------------- |
| `hospitalCode`   | string | ✅       | Local Code ของ รพ.                         | BillItems.LCCode (#4)     |
| `aipnCode`       | string | ✅       | รหัส AIPN มาตรฐาน (เช่น "55021")           | BillItems.STDCode (#5)    |
| `tmtCode`        | string | ✅       | รหัสยา TMT (Thai Medicines Terminology)    | DispensedItems.DrgID (#4) |
| `billingGroup`   | string | ✅       | หมวดค่ารักษา (3/8/B/C/G/etc.)              | BillItems.BillMuad (#3)   |
| `description`    | string | ✅       | คำอธิบาย                                   | BillItems.Desc (#6)       |
| `quantity`       | number | ✅       | จำนวน                                      | BillItems.QTY (#7)        |
| `unitPrice`      | number | ✅       | ราคาขายต่อหน่วย                            | BillItems.UP (#8)         |
| `claimUnitPrice` | number | ✅       | ราคาเบิกต่อหน่วย (default = unitPrice)     | BillItems.ClaimUP (#10)   |
| `claimCategory`  | string | ✅       | OP1 (ทั่วไป) / OPR (รังสี) — default "OP1" | BillItems.ClaimCat (#13)  |

> **สำคัญ**: `aipnCode` เป็น string (alphanumeric) และต้องส่งจาก HIS ทุกรายการ — ถ้าไม่มีค่า ระบบจะแสดง validation warning ตอน SSOP export preview

### 1.5 Endpoint 3: Advanced Patient Search (Clinical Criteria) ⏳

> **สถานะ**: รอทีม HIS พัฒนา

```
POST /api/patients/search/advanced
```

> ใช้ POST เพราะ request body มี arrays (icdPrefixes, drugKeywords) ที่ไม่เหมาะกับ GET query string

**Request Body (JSON):**

```json
{
  "from": "2026-02-01",
  "to": "2026-02-27",
  "icdPrefixes": ["C50", "C509"],
  "secondaryDiagnosisCodes": ["Z510"],
  "drugKeywords": ["paclitaxel", "cisplatin"]
}
```

**Request Fields:**

| Field                     | Type     | Required | คำอธิบาย                                                                                                          |
| ------------------------- | -------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `from`                    | string   | ✅       | วันเริ่มต้น (YYYY-MM-DD)                                                                                          |
| `to`                      | string   | ✅       | วันสิ้นสุด (YYYY-MM-DD) — ห่างจาก `from` ไม่เกิน 30 วัน                                                           |
| `icdPrefixes`             | string[] | ✅       | ICD-10 prefixes สำหรับ primaryDiagnosis (เช่น `["C50"]` → match C500-C509). ถ้าไม่ส่ง = ค้นหาทุกการวินิจฉัยมะเร็ง |
| `secondaryDiagnosisCodes` | string[] | ✅       | ICD-10 codes ที่ต้องพบใน secondaryDiagnoses (เช่น `["Z510", "Z511"]`). ถ้าไม่ส่ง = ไม่กรองวินิจฉัยรอง             |
| `drugKeywords`            | string[] | ✅       | ชื่อยา generic สำหรับ substring match (case-insensitive). ถ้าไม่ส่ง = ไม่กรองยา                                   |

**Matching logic (ฝั่ง HIS):**

1. **กรองเฉพาะผู้ป่วยสิทธิ์ประกันสังคมเท่านั้น** (`insuranceType` = ประกันสังคม / SSO)
2. กรอง visits ที่ `visitDate BETWEEN from AND to`
3. ถ้า `icdPrefixes` มีค่า → `primaryDiagnosis` STARTS WITH อย่างน้อย 1 prefix
4. ถ้า `secondaryDiagnosisCodes` มีค่า → `secondaryDiagnoses` มีอย่างน้อย 1 code ที่ starts with อย่างน้อย 1 prefix ที่ส่งมา
5. ถ้า `drugKeywords` มีค่า → มีอย่างน้อย 1 medication ที่ `medicationName` CONTAINS (case-insensitive) อย่างน้อย 1 keyword
6. ค้นหา **distinct patients** ที่มี ≥1 matching visit
7. เรียงตาม matching visit ล่าสุด, **จำกัดไม่เกิน 200 ผลลัพธ์**

> **สำคัญ**: Endpoint นี้ใช้สำหรับระบบ SSO Cancer Care โดยเฉพาะ — ต้องกรอง **เฉพาะผู้ป่วยสิทธิ์ประกันสังคม** เท่านั้น ไม่รวมผู้ป่วยสิทธิ์อื่น (บัตรทอง, ข้าราชการ, ฯลฯ)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "hn": "001002104",
      "citizenId": "3480100319816",
      "titleName": "น.ส.",
      "fullName": "พิศมัย หาญมูล",
      "gender": "F",
      "dateOfBirth": "1968-12-28",
      "address": "3 หมู่ที่ 3   ต.ท่าค้อ อ.เมืองนครพนม จ.นครพนม 48000",
      "phoneNumber": "0651192511",
      "insuranceType": "ประกันสังคมนอกเครือข่าย OP,IP",
      "mainHospitalCode": "10711",
      "matchingVisitCount": 3
    }
  ]
}
```

**Response Fields:**

เหมือน Endpoint 1 (§1.3) ยกเว้น:

| Field                | Type   | Required | คำอธิบาย                               |
| -------------------- | ------ | -------- | -------------------------------------- |
| `matchingVisitCount` | number | ✅       | จำนวน visits ที่ตรงตามเงื่อนไขที่กำหนด |

> **Note**: `totalVisitCount` (Endpoint 1) นับ visits ทั้งหมดใน HIS, ส่วน `matchingVisitCount` (Endpoint 3) นับเฉพาะ visits ที่ตรงกับเกณฑ์ค้นหา

**Error codes เพิ่มเติม:**

| Code                  | HTTP Status | Description                   |
| --------------------- | ----------- | ----------------------------- |
| `DATE_RANGE_EXCEEDED` | 400         | ช่วงวันที่เกิน 30 วัน         |
| `DATE_RANGE_INVALID`  | 400         | วันเริ่มต้นอยู่หลังวันสิ้นสุด |

---

### 1.6 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "ไม่พบข้อมูลผู้ป่วย HN 001002104"
  }
}
```

Error codes ที่คาดหวัง:

| Code                | HTTP Status | Description          |
| ------------------- | ----------- | -------------------- |
| `PATIENT_NOT_FOUND` | 404         | ไม่พบผู้ป่วย         |
| `INVALID_PARAMETER` | 400         | Parameter ไม่ถูกต้อง |
| `UNAUTHORIZED`      | 401         | API Key ไม่ถูกต้อง   |
| `RATE_LIMITED`      | 429         | เรียก API บ่อยเกินไป |
| `INTERNAL_ERROR`    | 500         | ข้อผิดพลาดภายใน HIS  |

---

### 1.7 SSL/TLS Notes

- HIS API ใช้ SSL certificate ที่ไม่ผ่าน standard CA verification (self-signed / intermediate CA ไม่ครบ)
- ฝั่ง SSO Cancer Care ได้ปรับ code ให้ skip SSL verification สำหรับ HIS connections โดยเฉพาะ (ใช้ undici Agent กับ `rejectUnauthorized: false`)
- ไม่กระทบ HTTPS connections อื่นของระบบ

---

### 1.8 Implementation Notes (สำหรับทีม SSO Cancer Care)

**การปรับ code จาก spec เดิม:**

| หัวข้อ | Spec เดิม | จริง (ที่ทีม HIS ส่งมอบ) | การปรับฝั่งเรา |
| ------ | --------- | ----------------------- | ------------- |
| Path | `GET /api/patients/search` | `GET /api/patient` (singular) | `his-api.client.ts` เปลี่ยน path |
| Params | `?q={query}&type={type}` | `?hn={hn}` หรือ `?cid={cid}` | `his-api.client.ts` สร้าง params ตาม type |
| HN format | ไม่จำกัดหลัก | 9 หลัก (เติม 0 ข้างหน้า) | `his-integration.service.ts` ใช้ `padStart(9, '0')` |
| Name search | รองรับ | ไม่รองรับ | `his-integration.service.ts` throw BadRequestException |
| SSL | Standard CA | Self-signed cert | `his-api.client.ts` ใช้ undici Agent skip verify |
| 404 response | - | `{ success: false, error: { code: "PATIENT_NOT_FOUND" } }` | `his-api.client.ts` catch 404 → return `[]` |

**Files ที่เกี่ยวข้อง:**

- `apps/api/src/modules/his-integration/his-api.client.ts` — HTTP client เรียก HIS API
- `apps/api/src/modules/his-integration/his-integration.service.ts` — business logic + auto-detect type
- `apps/api/src/modules/his-integration/dto/search-patient.dto.ts` — DTO validation
- `apps/web/src/app/(dashboard)/cancer-patients/new/page.tsx` — frontend search UI

---

### 1.9 Additional Data Requirements for SSOP 0.93 Export ⏳

> **สถานะ**: ต้องแจ้งทีม HIS เพิ่มเติม — ข้อมูลเหล่านี้จำเป็นสำหรับ SSOP 0.93 electronic billing file ที่ถูกต้องสมบูรณ์ตาม guideline สปส.

จากการตรวจสอบ SSOP 0.93 specification (SSOP063.txt, SSOP093Manual.pdf) พบว่าข้อมูลจาก HIS ที่ส่งมาปัจจุบันยังไม่ครบสำหรับ SSOP export — ต้องเพิ่มข้อมูลดังต่อไปนี้

#### 1.9.1 Visit-Level Fields (เพิ่มใน Endpoint 2 response `visits[]`)

| Field                 | Type   | Required | คำอธิบาย                                        | ใช้ใน SSOP                      | ค่าที่รับ                                                                     |
| --------------------- | ------ | -------- | ----------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `billNo`              | string | ❌       | เลขที่ใบเสร็จ (ถ้ามี)                           | BILLTRAN.Billno (#6)            | เลขที่ใบเสร็จของ รพ.                                                          |
| `visitType`           | string | ✅       | ประเภทการมา visit                               | OPServices.TypeIn (#9)          | `1`=walk-in, `2`=นัด, `3`=ส่งต่อ, `4`=ฉุกเฉิน, `9`=อื่นๆ                    |
| `dischargeType`       | string | ✅       | ประเภทการจำหน่าย                                | OPServices.TypeOut (#10)        | `1`=กลับบ้าน, `2`=admit, `3`=ส่งต่อ, `4`=เสียชีวิต, `5`=หนี, `9`=อื่นๆ      |
| `nextAppointmentDate` | string | ❌       | วันนัดครั้งถัดไป (YYYY-MM-DD)                   | OPServices.DTAppoint (#11)      | ISO 8601 date, null ถ้าไม่มีนัด                                               |
| `serviceClass`        | string | ✅       | ประเภทบริการ                                    | OPServices.Class (#3)           | `EC`=ตรวจรักษา, `OP`=หัตถการ, `LB`=Lab, `XR`=รังสี, `IV`=ตรวจพิเศษ, `ZZ`=อื่น |
| `serviceType`         | string | ❌       | ลักษณะบริการ                                    | OPServices.TypeServ (#8)        | `01`=ใหม่, `02`=F/U, `03`=เรื้อรัง, `04`=ปรึกษา, `05`=ฉุกเฉิน               |
| `prescriptionTime`    | string | ❌       | เวลาสั่งยา (ISO 8601) ถ้าต่างจาก serviceStartTime | Dispensing.Prescdt (#6)         | ใช้แยกเวลาสั่งยาออกจากเวลาเริ่มบริการ                                         |

> **หมายเหตุ**: ปัจจุบันระบบใช้ค่า default (`visitType="9"`, `dischargeType="9"`, `serviceClass="EC"`, `serviceType="03"`) — หากทีม HIS ส่งค่าจริงมา จะช่วยให้ SSOP export ถูกต้องมากขึ้น

#### 1.9.2 Billing Item Fields (เพิ่มใน `billingItems[]`)

| Field     | Type   | Required | คำอธิบาย                                          | ใช้ใน SSOP                | ค่าที่รับ                                                    |
| --------- | ------ | -------- | ------------------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `stdCode` | string | ✅       | รหัสมาตรฐานแห่งชาติ (TMT สำหรับยา, MoF สำหรับอื่น) | BillItems.STDCode (#5)    | รหัส TMT (ยา), รหัสมาตรฐานราคากลาง (บริการ/เวชภัณฑ์)         |

> **สำคัญ — แก้ไขจาก spec เดิม**: ใน spec ก่อนหน้า `aipnCode` ถูกระบุว่าใช้สำหรับ `BillItems.STDCode (#5)` ซึ่ง**ไม่ถูกต้อง** ตาม SSOP 0.93 guideline:
> - **`hospitalCode`** → `BillItems.LCCode` (#4) — รหัสภายในของ รพ.
> - **`aipnCode`** → สำรองใช้ mapping กับฐานข้อมูล AIPN ภายในระบบ
> - **`stdCode`** (ใหม่) → `BillItems.STDCode` (#5) — รหัสมาตรฐานแห่งชาติ
> - **`tmtCode`** → `DispensedItems.DrgID` (#4) — รหัสยา TMT (เฉพาะรายการยา)
>
> ในกรณีที่ทีม HIS ยังไม่สามารถส่ง `stdCode` แยกได้ — ระบบจะใช้ `tmtCode` (สำหรับยา) หรือ `aipnCode` (สำหรับบริการ) เป็นค่า fallback

#### 1.9.3 Drug/Dispensing Fields (เพิ่มใน `billingItems[]` สำหรับรายการยา billingGroup="3")

| Field            | Type   | Required | คำอธิบาย                                | ใช้ใน SSOP                          | ค่าที่รับ                        |
| ---------------- | ------ | -------- | --------------------------------------- | ----------------------------------- | -------------------------------- |
| `dfsText`        | string | ✅       | ชื่อยา / dose / form / strength         | DispensedItems.dfsText (#6)         | เช่น "Paclitaxel 300mg/50ml inj" |
| `packsize`       | string | ❌       | ขนาดบรรจุ                               | DispensedItems.Packsize (#7)        | เช่น "50 ml", "10 tab"          |
| `sigCode`        | string | ❌       | รหัสวิธีใช้ยา                           | DispensedItems.sigCode (#8)         | รหัสมาตรฐาน sig code (ถ้ามี)     |
| `sigText`        | string | ❌       | ข้อความวิธีใช้ยา                        | DispensedItems.sigText (#9)         | เช่น "IV drip in D5W 500ml"     |
| `supplyDuration` | string | ❌       | ระยะเวลาจ่ายยา (format: nnnA)          | DispensedItems.SupplyFor (#19)      | เช่น "1D", "7D", "30D"          |
| `dayCover`       | string | ❌       | ระยะเวลาครอบคลุมรวมทั้งใบสั่งยา         | Dispensing.DayCover (#18)           | เช่น "30D"                       |

> **หมายเหตุ**: ข้อมูลยาเหล่านี้มีประโยชน์สำหรับ BILLDISP file — ปัจจุบันระบบใช้ `description` จาก billing item เป็นค่า fallback สำหรับ `dfsText` และเว้นว่างสำหรับฟิลด์อื่น

#### 1.9.4 Updated Billing Item Response Schema (Revised)

```json
{
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
    },
    {
      "hospitalCode": "3100453",
      "aipnCode": "3100453",
      "tmtCode": null,
      "stdCode": "55021",
      "billingGroup": "C",
      "description": "ค่าบริการผู้ป่วยนอก นอกเวลาราชการ",
      "dfsText": null,
      "packsize": null,
      "sigCode": null,
      "sigText": null,
      "supplyDuration": null,
      "quantity": 1,
      "unitPrice": 50.00,
      "claimUnitPrice": 50.00,
      "claimCategory": "OP1"
    }
  ]
}
```

> **Code mappings** ที่ถูกต้องตาม SSOP 0.93:
> | HIS Field      | SSOP File    | SSOP Field           | Description                        |
> | -------------- | ------------ | -------------------- | ---------------------------------- |
> | `hospitalCode` | BILLTRAN     | BillItems.LCCode #4  | Local code ของ รพ.                 |
> | `stdCode`      | BILLTRAN     | BillItems.STDCode #5 | รหัสมาตรฐานแห่งชาติ                |
> | `aipnCode`     | (internal)   | — mapping only —     | รหัส AIPN สำหรับ lookup ภายในระบบ   |
> | `tmtCode`      | BILLDISP     | DispensedItems.DrgID #4 | รหัสยา TMT (เฉพาะยา)            |
> | `description`  | BILLTRAN     | BillItems.Desc #6    | คำอธิบายรายการ                     |
> | `dfsText`      | BILLDISP     | DispensedItems.dfsText #6 | ชื่อยา/dose/form/strength     |

#### 1.9.5 Priority Matrix

| Priority | ข้อมูล | เหตุผล | Fallback ปัจจุบัน |
| -------- | ------ | ------ | ----------------- |
| 🔴 สูง   | `stdCode` | STDCode เป็น required field ใน SSOP | ใช้ `tmtCode` (ยา) หรือ `aipnCode` (บริการ) |
| 🔴 สูง   | `visitType` | TypeIn เป็น required field ใน SSOP | ใช้ `"9"` (อื่นๆ) |
| 🔴 สูง   | `dischargeType` | TypeOut เป็น required field ใน SSOP | ใช้ `"9"` (อื่นๆ) |
| 🟡 กลาง  | `dfsText`, `sigText` | required ใน SSOP phase 1 | ใช้ `description` จาก billing item |
| 🟡 กลาง  | `serviceClass` | Class field ใน OPServices | ใช้ `"EC"` (ตรวจรักษา) |
| 🟢 ต่ำ   | `billNo`, `packsize`, `sigCode` | optional ใน SSOP phase 1 | เว้นว่าง |
| 🟢 ต่ำ   | `nextAppointmentDate`, `supplyDuration`, `dayCover` | optional | เว้นว่าง |
