## 11. HIS API Specification (เอกสารสำหรับทีม HIS)

> **เอกสารนี้จะถูกส่งให้ทีม HIS ของโรงพยาบาล** เพื่อให้พัฒนา API ตามที่ระบบเราต้องการ

### 11.1 Overview

ระบบ SSO Cancer Care ต้องเรียกใช้ API จากระบบ HIS ของโรงพยาบาล 2 endpoints:

| #   | Endpoint               | วัตถุประสงค์                                       | เรียกเมื่อ                  |
| --- | ---------------------- | -------------------------------------------------- | --------------------------- |
| 1   | **Patient Search**     | ค้นหาผู้ป่วยจาก HN/Citizen ID/ชื่อ                 | ผู้ใช้กดปุ่ม "ค้นหาจาก HIS" |
| 2   | **Patient Visit Data** | ดึงข้อมูล visits + ค่ารักษาพยาบาลทั้งหมดของผู้ป่วย | ผู้ใช้กดปุ่ม "นำเข้าข้อมูล" |

### 11.2 Authentication

| Item         | รายละเอียด                                                                         |
| ------------ | ---------------------------------------------------------------------------------- |
| Method       | **API Key** ใน Header: `Authorization: Bearer {api_key}` (หรือตามที่ทีม HIS กำหนด) |
| IP Whitelist | จำกัดเฉพาะ IP ของ server SSO Cancer Care                                           |
| Rate Limit   | ≥ 10 requests/minute ต่อ IP                                                        |

### 11.3 Endpoint 1: Patient Search

```
GET /api/patients/search?q={searchTerm}&type={searchType}
```

**Parameters:**

| Parameter | Type   | Required | Description                                                       |
| --------- | ------ | -------- | ----------------------------------------------------------------- |
| `q`       | string | ✅       | คำค้นหา (HN, Citizen ID 13 หลัก, หรือ ชื่อ-สกุล)                  |
| `type`    | string | ❌       | ประเภทการค้นหา: `hn`, `citizen_id`, `name` (default: auto-detect) |

**Auto-detect logic** (ฝั่งเราจะส่ง type ให้):

- ถ้า `q` เป็นตัวเลข 13 หลัก → `type=citizen_id`
- ถ้า `q` เป็นตัวเลข (ไม่ใช่ 13 หลัก) → `type=hn`
- อื่นๆ → `type=name`

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "hn": "0012345",
      "citizenId": "1234567890123",
      "titleName": "นาย",
      "fullName": "สมชาย ใจดี",
      "gender": "M",
      "dateOfBirth": "1980-05-15",
      "address": "123/4 ม.5 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
      "phoneNumber": "0891234567",
      "insuranceType": "ประกันสังคม",
      "mainHospitalCode": "10711",
      "totalVisitCount": 45
    }
  ]
}
```

**Response Fields:**

| Field              | Type   | Required | คำอธิบาย                      | ใช้ใน                              |
| ------------------ | ------ | -------- | ----------------------------- | ---------------------------------- |
| `hn`               | string | ✅       | เลข HN ของ รพ.                | Patient.hn, OPServices.HN          |
| `citizenId`        | string | ✅       | เลขบัตรประชาชน 13 หลัก        | Patient.citizenId, BILLTRAN.Pid    |
| `titleName`        | string | ❌       | คำนำหน้า (นาย/นาง/น.ส.)       | Patient.titleName (แสดง UI)        |
| `fullName`         | string | ✅       | คำนำหน้า+ชื่อ+สกุล            | Patient.fullName, BILLTRAN.Name    |
| `gender`           | string | ❌       | เพศ: "M" / "F"                | Patient.gender (แสดง UI)           |
| `dateOfBirth`      | string | ❌       | วันเกิด (YYYY-MM-DD)          | Patient.dateOfBirth (คำนวณอายุ UI) |
| `address`          | string | ❌       | ที่อยู่                       | Patient.address (แสดง UI)          |
| `phoneNumber`      | string | ❌       | เบอร์โทร                      | Patient.phoneNumber                |
| `insuranceType`    | string | ❌       | สิทธิ์การรักษา                | แสดง UI เท่านั้น                   |
| `mainHospitalCode` | string | ❌       | รหัส รพ.หลักตามสิทธิ (hcode5) | BILLTRAN.HMain (#15)               |
| `totalVisitCount`  | number | ❌       | จำนวน visit ทั้งหมดใน HIS     | แสดง UI เท่านั้น                   |

### 11.4 Endpoint 2: Patient Visit Data (Full Import)

```
GET /api/patients/{hn}/visits?from={startDate}&to={endDate}
```

**Parameters:**

| Parameter | Type  | Required | Description                                  |
| --------- | ----- | -------- | -------------------------------------------- |
| `hn`      | path  | ✅       | HN ของผู้ป่วย                                |
| `from`    | query | ❌       | วันเริ่มต้น (YYYY-MM-DD) — default: ไม่จำกัด |
| `to`      | query | ❌       | วันสิ้นสุด (YYYY-MM-DD) — default: วันนี้    |

**Response:**

```json
{
  "success": true,
  "data": {
    "patient": {
      "hn": "0012345",
      "citizenId": "1234567890123",
      "titleName": "นาย",
      "fullName": "สมชาย ใจดี",
      "gender": "M",
      "dateOfBirth": "1980-05-15",
      "address": "123/4 ม.5 ต.ในเมือง อ.เมือง จ.ขอนแก่น 40000",
      "phoneNumber": "0891234567",
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
| `serviceStartTime`   | string | ❌       | เวลาเริ่มบริการ (ISO 8601)                  | OPServices.BegDT (#14)                |
| `serviceEndTime`     | string | ❌       | เวลาสิ้นสุดบริการ (ISO 8601)                | OPServices.EndDT (#15)                |
| `physicianLicenseNo` | string | ❌       | เลขที่ใบประกอบวิชาชีพแพทย์                  | OPServices.SVPID (#12)                |
| `clinicCode`         | string | ❌       | รหัสแผนก (01=อายุรกรรม, 10=รังสี, 99=อื่นๆ) | OPServices.Clinic (#13)               |
| `primaryDiagnosis`   | string | ✅       | ICD-10 หลัก                                 | PatientVisit.primaryDiagnosis, OPDx   |
| `secondaryDiagnoses` | string | ❌       | ICD-10 รอง (comma-separated)                | PatientVisit.secondaryDiagnoses, OPDx |
| `hpi`                | string | ❌       | History of Present Illness                  | PatientVisit.hpi                      |
| `doctorNotes`        | string | ❌       | หมายเหตุจากแพทย์                            | PatientVisit.doctorNotes              |

**Medication Fields** (array `medications`):

| Field            | Type   | Required | คำอธิบาย                          | ใช้ใน                          |
| ---------------- | ------ | -------- | --------------------------------- | ------------------------------ |
| `hospitalCode`   | string | ✅       | รหัสยา/บริการของ รพ. (Local Code) | VisitMedication.hospitalCode   |
| `medicationName` | string | ✅       | ชื่อยา/บริการ                     | VisitMedication.medicationName |
| `quantity`       | string | ❌       | จำนวน                             | VisitMedication.quantity       |
| `unit`           | string | ❌       | หน่วย                             | VisitMedication.unit           |

> **Note**: `medications` ใช้สำหรับ protocol analysis (resolve ไปหา Drug → matching → scoring) — เป็นข้อมูลที่ import.service.ts ปัจจุบันรองรับอยู่แล้ว

**Billing Item Fields** (array `billingItems`):

| Field            | Type   | Required | คำอธิบาย                                   | ใช้ใน SSOP               |
| ---------------- | ------ | -------- | ------------------------------------------ | ------------------------ |
| `hospitalCode`   | string | ✅       | Local Code ของ รพ.                         | BillItems.LCCode (#4)    |
| `aipnCode`       | string | ✅       | รหัส AIPN มาตรฐาน (เช่น "55021")          | BillItems.STDCode (#5)   |
| `billingGroup`   | string | ✅       | หมวดค่ารักษา (3/8/B/C/G/etc.)              | BillItems.BillMuad (#3)  |
| `description`    | string | ✅       | คำอธิบาย                                   | BillItems.Desc (#6)      |
| `quantity`       | number | ✅       | จำนวน                                      | BillItems.QTY (#7)       |
| `unitPrice`      | number | ✅       | ราคาขายต่อหน่วย                            | BillItems.UP (#8)        |
| `claimUnitPrice` | number | ❌       | ราคาเบิกต่อหน่วย (default = unitPrice)     | BillItems.ClaimUP (#10)  |
| `claimCategory`  | string | ❌       | OP1 (ทั่วไป) / OPR (รังสี) — default "OP1" | BillItems.ClaimCat (#13) |

> **สำคัญ**: `aipnCode` เป็น string (alphanumeric) และต้องส่งจาก HIS ทุกรายการ — ถ้าไม่มีค่า ระบบจะแสดง validation warning ตอน SSOP export preview

### 11.5 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "ไม่พบข้อมูลผู้ป่วย HN 9999999"
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
