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

---

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

#### 1.4.1 Priority Matrix

> ข้อมูลที่ระบบต้องการเรียงตามลำดับความสำคัญ — ใช้สำหรับ SSOP 0.93 electronic billing file ตาม guideline สปส.
> ข้อมูลที่ระบุ Fallback หมายถึงระบบสามารถทำงานได้โดยใช้ค่า default แต่หากทีม HIS ส่งค่าจริงมาจะช่วยให้ SSOP export ถูกต้องสมบูรณ์มากขึ้น
> **Source HOSxP** = ตาราง/field ใน HOSxP ที่เป็นแหล่งข้อมูล — ระบุเพื่อช่วยทีม HIS ค้นหาข้อมูลได้ง่ายขึ้น

| Priority  | ข้อมูล                                                | เหตุผล                             | Source HOSxP                                               | Fallback ปัจจุบัน                                    |
| --------- | ----------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------- |
| 🔴 สูง   | `physicianLicenseNo`                                  | SVPID เป็น required ใน SSOP        | `doctor.licenseno` (join `ovst.doctor`)                    | ❌ ไม่มี — export ล้มเหลว                            |
| 🔴 สูง   | `clinicCode`                                          | Clinic เป็น required ใน SSOP       | `ovst.spclty` หรือ `ovst.cur_dep`                          | ❌ ไม่มี — export ล้มเหลว                            |
| 🔴 สูง   | `visitType`                                           | TypeIn เป็น required ใน SSOP       | `ovst.visit_type`                                          | ใช้ `"9"` (อื่นๆ)                                    |
| 🔴 สูง   | `dischargeType`                                       | TypeOut เป็น required ใน SSOP      | `vn_stat` หรือ `ovst` discharge field                      | ใช้ `"9"` (อื่นๆ)                                    |
| 🔴 สูง   | `diagnoses[]` (structured)                            | OPDx ต้องการ diagtype              | `ovstdiag` (icd10 + diagtype)                              | parse จาก string (ไม่มี diagtype)                    |
| 🟠 สูง-กลาง | `sksDrugCode`                                      | DrgID ใน SSOP BILLDISP             | `drugitems.sks_drug_code` (join `opitemrece.icode`)        | ใช้ `tmtCode` หรือ `aipnCode`                        |
| 🟠 สูง-กลาง | `sksDfsText`                                       | dfsText ใน SSOP BILLDISP           | `drugitems.sks_dfs_text` (join `opitemrece.icode`)         | ใช้ `description` จาก billing item                   |
| 🟠 สูง-กลาง | `sksReimbPrice`                                    | ClaimUP ใน SSOP BILLTRAN           | `drugitems.sks_reimb_price` (join `opitemrece.icode`)      | ใช้ `unitPrice` ของ รพ.                              |
| 🟠 สูง-กลาง | `stdGroup`                                         | BillMuad ใน SSOP BILLTRAN          | `income.std_group` (join `opitemrece.income`)              | ใช้ `billingGroup` ของ รพ.                           |
| 🟡 กลาง  | `dfsText`, `sigText`                                  | required ใน SSOP BILLDISP          | `drugitems.sks_dfs_text`, `drugusage.name1+name2+name3`    | ใช้ `description` จาก billing item                   |
| 🟡 กลาง  | `serviceClass`                                        | Class field ใน OPServices          | mapping จาก `ovst.spclty` หรือ visit type                  | ใช้ `"EC"` (ตรวจรักษา)                               |
| 🟡 กลาง  | `receiptNo`                                           | Billno ใน SSOP BILLTRAN            | `rcpt_print.rcpno` (join `rcpt_print.vn`)                  | เว้นว่าง                                             |
| 🟢 ต่ำ   | `billNo`, `packsize`, `sigCode`                       | optional ใน SSOP                   | `drugitems.packqty`, `drugusage.drugusage` code            | เว้นว่าง                                             |
| 🟢 ต่ำ   | `nextAppointmentDate`, `supplyDuration`, `dayCover`   | optional                           | `oapp.nextdate`, `opi_dispense`                            | เว้นว่าง                                             |

#### 1.4.2 Response

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
        "physicianLicenseNo": "ว54236",
        "clinicCode": "01",
        "primaryDiagnosis": "C509",
        "secondaryDiagnoses": "Z511,E119",
        "diagnoses": [
          { "icd10": "C509", "diagType": "1", "diagTerm": "Breast cancer, unspecified" },
          { "icd10": "Z511", "diagType": "2", "diagTerm": "เคมีบำบัด" },
          { "icd10": "E119", "diagType": "2", "diagTerm": "DM type 2" }
        ],
        "hpi": "มาตามนัดรับเคมีบำบัด cycle 3",
        "doctorNotes": "ให้ AC regimen ตามแผน",
        "receiptNo": "R2568-012345",
        "billNo": "OPD-2568-012345",
        "visitType": "2",
        "dischargeType": "1",
        "nextAppointmentDate": "2025-12-10",
        "serviceClass": "EC",
        "serviceType": "03",
        "prescriptionTime": "2025-11-12T08:45:00",
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
            "aipnCode": "3119967",
            "tmtCode": "1052756000040901",
            "sksDrugCode": "49304",
            "stdCode": "49304",
            "billingGroup": "3",
            "stdGroup": "2",
            "description": "PACLITAXEL 300MG/50ML INJ",
            "sksDfsText": "PACLITAXEL 300 MG/50 ML INJECTION",
            "dfsText": "Paclitaxel 300mg/50ml injection",
            "packsize": "50 ml",
            "sigCode": "",
            "sigText": "ฉีดเข้าหลอดเลือดดำ ผสมใน 5%DW 500 ml drip นาน 3 ชม.",
            "supplyDuration": "1D",
            "quantity": 1,
            "unitPrice": 2500.00,
            "sksReimbPrice": 2500.00,
            "claimUnitPrice": 2500.00,
            "claimCategory": "OPR"
          },
          {
            "hospitalCode": "3100453",
            "aipnCode": "3100453",
            "tmtCode": null,
            "sksDrugCode": null,
            "stdCode": "55021",
            "billingGroup": "C",
            "stdGroup": "9",
            "description": "ค่าบริการผู้ป่วยนอก นอกเวลาราชการ",
            "sksDfsText": null,
            "dfsText": null,
            "packsize": null,
            "sigCode": null,
            "sigText": null,
            "supplyDuration": null,
            "quantity": 1,
            "unitPrice": 50.00,
            "sksReimbPrice": null,
            "claimUnitPrice": 50.00,
            "claimCategory": "OP1"
          }
        ]
      }
    ]
  }
}
```

#### 1.4.3 Visit Fields (array `visits[]`)

| Field                 | Type   | Required | คำอธิบาย                                         | ใช้ใน SSOP                    | Source HOSxP                                        | ค่าที่รับ                                                                      |
| --------------------- | ------ | -------- | ------------------------------------------------ | ----------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| `vn`                  | string | ✅       | Visit Number (unique)                            | BILLTRAN.Invno                | `ovst.vn`                                           |                                                                                |
| `visitDate`           | string | ✅       | วันที่รับบริการ (YYYY-MM-DD)                      | PatientVisit.visitDate        | `ovst.vstdate`                                      |                                                                                |
| `serviceStartTime`    | string | ✅       | เวลาเริ่มบริการ (ISO 8601)                        | OPServices.BegDT (#14)        | `ovst.vstdate` + `ovst.vsttime`                     |                                                                                |
| `serviceEndTime`      | string | ✅       | เวลาสิ้นสุดบริการ (ISO 8601)                      | OPServices.EndDT (#15)        | คำนวณจากเวลาเริ่ม + ระยะเวลา หรือเวลาจ่ายยา          |                                                                                |
| `physicianLicenseNo` 🔴 | string | ✅    | เลขที่ใบประกอบวิชาชีพแพทย์                        | OPServices.SVPID (#12)        | `doctor.licenseno` (join `ovst.doctor` → `doctor.code`) |                                                                            |
| `clinicCode` 🔴       | string | ✅       | รหัสแผนก                                          | OPServices.Clinic (#13)       | `ovst.spclty` หรือ `ovst.cur_dep`                   | `01`=อายุรกรรม, `10`=รังสี, `99`=อื่นๆ                                         |
| `primaryDiagnosis`    | string | ✅       | ICD-10 หลัก (ไม่ต้องมีจุด)                        | OPDx                          | `vn_stat.pdx` หรือ `ovstdiag.icd10` (diagtype=1)    | เช่น `C509`, `Z511`                                                            |
| `secondaryDiagnoses`  | string | ✅       | ICD-10 รอง (comma-separated)                      | OPDx                          | `vn_stat.dx0`-`dx5` หรือ `ovstdiag` (diagtype≠1)    | เช่น `"Z511,E119"`                                                             |
| `diagnoses` 🔴        | array  | ✅       | รายการวินิจฉัย structured (ดู §1.4.3.1)           | OPDx (ทุก record)             | `ovstdiag` (icd10, diagtype)                        | ดูตาราง §1.4.3.1                                                               |
| `hpi`                 | string | ✅       | History of Present Illness                        | PatientVisit.hpi              | `opdscreen` หรือ `ovst_doctor_diag.diag_text`       |                                                                                |
| `doctorNotes`         | string | ✅       | หมายเหตุจากแพทย์                                  | PatientVisit.doctorNotes      | `ovst_doctor_diag.diag_text`                        |                                                                                |
| `receiptNo` 🟡        | string | ❌       | เลขที่ใบเสร็จ                                     | BILLTRAN.Billno (#6)          | `rcpt_print.rcpno` (join `rcpt_print.vn`)           | เลขที่ใบเสร็จรับเงิน                                                           |
| `billNo`              | string | ❌       | เลขที่ใบแจ้งหนี้ (ถ้ามี)                          | BILLTRAN.Billno (#6)          | `rcpt_print.finance_number`                         | เลขที่ใบแจ้งหนี้ของ รพ.                                                        |
| `visitType` 🔴        | string | ✅       | ประเภทการมา visit                                 | OPServices.TypeIn (#9)        | `ovst.visit_type`                                   | `1`=walk-in, `2`=นัด, `3`=ส่งต่อ, `4`=ฉุกเฉิน, `9`=อื่นๆ                     |
| `dischargeType` 🔴    | string | ✅       | ประเภทการจำหน่าย                                  | OPServices.TypeOut (#10)      | `vn_stat` discharge field                           | `1`=กลับบ้าน, `2`=admit, `3`=ส่งต่อ, `4`=เสียชีวิต, `5`=หนี, `9`=อื่นๆ       |
| `nextAppointmentDate` | string | ❌       | วันนัดครั้งถัดไป (YYYY-MM-DD)                     | OPServices.DTAppoint (#11)    | `oapp.nextdate` (join `oapp.vn`)                    | null ถ้าไม่มีนัด                                                               |
| `serviceClass` 🟡     | string | ✅       | ประเภทบริการ                                      | OPServices.Class (#3)         | mapping จาก `ovst.spclty`                           | `EC`=ตรวจรักษา, `OP`=หัตถการ, `LB`=Lab, `XR`=รังสี, `IV`=ตรวจพิเศษ, `ZZ`=อื่น |
| `serviceType`         | string | ❌       | ลักษณะบริการ                                      | OPServices.TypeServ (#8)      | mapping จากประเภท visit                              | `01`=ใหม่, `02`=F/U, `03`=เรื้อรัง, `04`=ปรึกษา, `05`=ฉุกเฉิน                |
| `prescriptionTime`    | string | ❌       | เวลาสั่งยา (ISO 8601) ถ้าต่างจาก serviceStartTime | Dispensing.Prescdt (#6)       | `opi_dispense` เวลาจ่ายยา                           |                                                                                |

> 🔴🟡 = ดูลำดับความสำคัญใน §1.4.1 — ปัจจุบันระบบใช้ค่า default (`visitType="9"`, `dischargeType="9"`, `serviceClass="EC"`, `serviceType="03"`) หากทีม HIS ยังไม่พร้อมส่งค่าจริง

#### 1.4.3.1 Diagnosis Fields (array `diagnoses[]`) 🔴 ใหม่

> **สำคัญ**: `diagnoses[]` เป็น structured array ที่ระบุ diagnosis type ชัดเจน — ช่วยให้ SSOP OPDx สมบูรณ์ (**เพิ่มเติมจาก** `primaryDiagnosis` และ `secondaryDiagnoses` ที่ยังคงส่งเหมือนเดิมเพื่อ backward compatibility)
> **Source**: ตาราง `ovstdiag` (join ด้วย `vn`)

| Field      | Type   | Required | คำอธิบาย                                 | ใช้ใน SSOP        | Source HOSxP              | ค่าที่รับ                                                             |
| ---------- | ------ | -------- | ---------------------------------------- | ----------------- | ------------------------- | --------------------------------------------------------------------- |
| `icd10`    | string | ✅       | รหัส ICD-10 (ไม่ต้องมีจุด)               | OPDx.Code (#5)    | `ovstdiag.icd10`          | เช่น `C509`, `Z511`, `E119`                                          |
| `diagType` | string | ✅       | ประเภทการวินิจฉัย                        | OPDx.DxType (#3)  | `ovstdiag.diagtype`       | `1`=หลัก, `2`=ร่วม, `3`=สาเหตุภายนอก, `4`=อื่นๆ                     |
| `diagTerm` | string | ❌       | คำวินิจฉัยของแพทย์ (free-text)           | —                 | `ovstdiag` doctor's text  | เช่น `"Breast cancer, unspecified"`, `"เคมีบำบัด"`                    |

**ตัวอย่าง:**

```json
"diagnoses": [
  { "icd10": "C509", "diagType": "1", "diagTerm": "Breast cancer, unspecified" },
  { "icd10": "Z511", "diagType": "2", "diagTerm": "เคมีบำบัด" },
  { "icd10": "E119", "diagType": "2", "diagTerm": "DM type 2" }
]
```

> **Note**: ต้องมีอย่างน้อย 1 record ที่ `diagType = "1"` (วินิจฉัยหลัก) เสมอ

#### 1.4.4 Medication Fields (array `medications[]`)

| Field            | Type   | Required | คำอธิบาย                          | ใช้ใน                          |
| ---------------- | ------ | -------- | --------------------------------- | ------------------------------ |
| `hospitalCode`   | string | ✅       | รหัสยา/บริการของ รพ. (Local Code) | VisitMedication.hospitalCode   |
| `medicationName` | string | ✅       | ชื่อยา/บริการ                     | VisitMedication.medicationName |
| `quantity`       | string | ✅       | จำนวน                             | VisitMedication.quantity       |
| `unit`           | string | ✅       | หน่วย                             | VisitMedication.unit           |

> **Note**: `medications` ใช้สำหรับ protocol analysis (resolve ไปหา Drug → matching → scoring) — เป็นข้อมูลที่ import.service.ts ปัจจุบันรองรับอยู่แล้ว

#### 1.4.5 Billing Item Fields (array `billingItems[]`)

**ทุกรายการ (ยา + บริการ):**

| Field            | Type   | Required | คำอธิบาย                                          | ใช้ใน SSOP                 | Source HOSxP                                          |
| ---------------- | ------ | -------- | ------------------------------------------------- | -------------------------- | ----------------------------------------------------- |
| `hospitalCode`   | string | ✅       | Local Code ของ รพ.                                | BillItems.LCCode (#4)      | `opitemrece.icode`                                    |
| `aipnCode`       | string | ✅       | รหัส AIPN ของ รพ.                                 | mapping ภายในระบบ           | `opitemrece.icode` (ถ้าใช้ AIPN เป็น local code)      |
| `tmtCode`        | string | ✅       | รหัสยา TMT 24 หลัก (Thai Medicines Terminology)   | DispensedItems.DrgID (#4)  | `drugitems.tmt_tp_code` หรือ `tpu_code_list` (join `opitemrece.icode` → `drugitems.icode`) |
| `sksDrugCode` 🟠 | string | ✅       | รหัสยา สกส. (SKS Drug Code)                       | DispensedItems.DrgID (#4), BillItems.STDCode (#5) | `drugitems.sks_drug_code` (join `opitemrece.icode` → `drugitems.icode`) |
| `stdCode`        | string | ✅       | รหัสมาตรฐานแห่งชาติ (TMT สำหรับยา, MoF สำหรับอื่น) | BillItems.STDCode (#5)     | ยา: `drugitems.sks_drug_code`, อื่น: `opitemrece.icode` |
| `billingGroup`   | string | ✅       | หมวดค่ารักษาของ รพ. (3/8/B/C/G/etc.)              | —                          | `opitemrece.income` → `income.income`                 |
| `stdGroup` 🟠    | string | ✅       | หมวดค่ารักษามาตรฐาน สปส. (1-17)                   | BillItems.BillMuad (#3)    | `income.std_group` (join `opitemrece.income` → `income.income`) |
| `description`    | string | ✅       | คำอธิบาย                                          | BillItems.Desc (#6)        | `drugitems.name` (ยา) หรือ `nondrugitems.name` (อื่น) |
| `quantity`       | number | ✅       | จำนวน                                             | BillItems.QTY (#7)         | `opitemrece.qty`                                      |
| `unitPrice`      | number | ✅       | ราคาขายต่อหน่วย                                   | BillItems.UP (#8)          | `opitemrece.unitprice`                                |
| `sksReimbPrice` 🟠 | number | ❌     | ราคาเบิก สกส. (ถ้ามี)                             | BillItems.ClaimUP (#10)    | `drugitems.sks_reimb_price` (join `opitemrece.icode` → `drugitems.icode`) |
| `claimUnitPrice` | number | ✅       | ราคาเบิกต่อหน่วย (default = unitPrice)            | BillItems.ClaimUP (#10)    | `sksReimbPrice` ถ้ามี, ไม่งั้น `unitPrice`             |
| `claimCategory`  | string | ✅       | OP1 (ทั่วไป) / OPR (รังสี) — default "OP1"        | BillItems.ClaimCat (#13)   | mapping จากประเภท visit/สิทธิ                          |

**เฉพาะรายการยา (`billingGroup = "3"` หรือ `stdGroup` = "2","3","4"):**

| Field            | Type   | Required | คำอธิบาย                                | ใช้ใน SSOP                          | Source HOSxP                                                | ตัวอย่าง                                           |
| ---------------- | ------ | -------- | --------------------------------------- | ----------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `sksDfsText` 🟠  | string | ✅       | ชื่อยาตามทะเบียน สกส. (generic+dose+form) | DispensedItems.dfsText (#6)       | `drugitems.sks_dfs_text` (join `opitemrece.icode`)          | `"PACLITAXEL 300 MG/50 ML INJECTION"`             |
| `dfsText`        | string | ✅       | ชื่อยา / dose / form / strength         | DispensedItems.dfsText (#6)         | `drugitems.name` + `drugitems.strength` + `drugitems.units` | `"Paclitaxel 300mg/50ml inj"`                      |
| `packsize`       | string | ❌       | ขนาดบรรจุ                               | DispensedItems.Packsize (#7)        | `drugitems.packqty` + `drugitems.units`                     | `"50 ml"`, `"10 tab"`                              |
| `sigCode`        | string | ❌       | รหัสวิธีใช้ยา                           | DispensedItems.sigCode (#8)         | `opitemrece.drugusage`                                      | รหัสมาตรฐาน sig code                                |
| `sigText` 🟡     | string | ✅       | ข้อความวิธีใช้ยา (ภาษาไทย)              | DispensedItems.sigText (#9)         | `drugusage.name1` + `name2` + `name3` (join `opitemrece.drugusage` → `drugusage.drugusage`) | `"ฉีดเข้าหลอดเลือดดำ ผสมใน 5%DW 500 ml drip นาน 3 ชม."` |
| `supplyDuration` | string | ❌       | ระยะเวลาจ่ายยา (format: nnnA)          | DispensedItems.SupplyFor (#19)      | `opi_dispense` supply period                                | `"1D"`, `"7D"`, `"30D"`                            |
| `dayCover`       | string | ❌       | ระยะเวลาครอบคลุมรวมทั้งใบสั่งยา         | Dispensing.DayCover (#18)           | `opi_dispense` ระยะเวลารวม                                  | `"30D"`                                             |

> 🔴🟠🟡 = ดูลำดับความสำคัญใน §1.4.1
>
> **Fallback chain สำหรับ field สำคัญ:**
> - **DrgID** (รหัสยาใน SSOP): `sksDrugCode` → `tmtCode` → `aipnCode`
> - **dfsText** (ชื่อยาใน SSOP): `sksDfsText` → `dfsText` → `description`
> - **ClaimUP** (ราคาเบิกใน SSOP): `sksReimbPrice` → `claimUnitPrice` → `unitPrice`
> - **BillMuad** (หมวดค่ารักษาใน SSOP): `stdGroup` → `billingGroup`
> - **STDCode** (รหัสมาตรฐานใน SSOP): `sksDrugCode` → `stdCode` → `tmtCode` → `aipnCode`

#### 1.4.6 Code Mappings (SSOP 0.93)

> ตารางสรุปความสัมพันธ์ระหว่าง field ที่ HIS ส่งมา กับ SSOP file ที่ระบบ generate

| HIS Field       | SSOP File  | SSOP Field                  | คำอธิบาย                                       | Source HOSxP                          |
| --------------- | ---------- | --------------------------- | ---------------------------------------------- | ------------------------------------- |
| `hospitalCode`  | BILLTRAN   | BillItems.LCCode (#4)       | Local code ของ รพ.                             | `opitemrece.icode`                    |
| `sksDrugCode`   | BILLTRAN   | BillItems.STDCode (#5)      | รหัสยา สกส. (ใช้เป็น STDCode หลัก)              | `drugitems.sks_drug_code`             |
| `stdCode`       | BILLTRAN   | BillItems.STDCode (#5)      | รหัสมาตรฐาน (fallback จาก sksDrugCode)          | `drugitems.sks_drug_code` หรือ local  |
| `stdGroup`      | BILLTRAN   | BillItems.BillMuad (#3)     | หมวดค่ารักษามาตรฐาน สปส.                        | `income.std_group`                    |
| `sksReimbPrice` | BILLTRAN   | BillItems.ClaimUP (#10)     | ราคาเบิก สกส.                                  | `drugitems.sks_reimb_price`           |
| `aipnCode`      | —          | (mapping ภายในระบบเท่านั้น)  | รหัส AIPN สำหรับ lookup ภายใน                   | `opitemrece.icode`                    |
| `tmtCode`       | BILLDISP   | DispensedItems.DrgID (#4)   | รหัสยา TMT 24 หลัก (เฉพาะยา)                   | `drugitems.tmt_tp_code`               |
| `sksDrugCode`   | BILLDISP   | DispensedItems.DrgID (#4)   | รหัสยา สกส. (fallback chain: sks→tmt→aipn)      | `drugitems.sks_drug_code`             |
| `description`   | BILLTRAN   | BillItems.Desc (#6)         | คำอธิบายรายการ                                  | `drugitems.name`                      |
| `sksDfsText`    | BILLDISP   | DispensedItems.dfsText (#6) | ชื่อยาตามทะเบียน สกส. (ใช้เป็น dfsText หลัก)    | `drugitems.sks_dfs_text`              |
| `dfsText`       | BILLDISP   | DispensedItems.dfsText (#6) | ชื่อยา/dose/form/strength (fallback)            | `drugitems.name+strength+units`       |
| `sigText`       | BILLDISP   | DispensedItems.sigText (#9) | วิธีใช้ยา (ภาษาไทย)                            | `drugusage.name1+name2+name3`         |
| `diagnoses[]`   | OPServices | OPDx (#1-#6)                | วินิจฉัย structured พร้อม diagtype              | `ovstdiag`                            |

#### 1.4.7 HOSxP Join Reference (สำหรับทีม HIS)

> แผนผังการ join ตาราง HOSxP เพื่อสร้าง response ของ Endpoint 2

```
ovst (vn, hn, vstdate, doctor, spclty, visit_type)
├── patient (hn → demographics, cid, mainHospitalCode)
├── doctor (ovst.doctor → doctor.code → licenseno)
├── ovstdiag (vn → icd10, diagtype) ← diagnoses[]
├── vn_stat (vn → pdx, dx0-dx5, income breakdown)
├── opitemrece (vn → icode, qty, unitprice, income, drugusage)
│   ├── drugitems (icode → name, sks_drug_code, sks_dfs_text, sks_reimb_price, tmt_tp_code)
│   ├── income (opitemrece.income → std_group) ← stdGroup
│   └── drugusage (opitemrece.drugusage → name1+name2+name3) ← sigText
├── rcpt_print (vn → rcpno) ← receiptNo
└── oapp (vn → nextdate) ← nextAppointmentDate
```

---

### 1.5 Endpoint 3: Advanced Patient Search (Clinical Criteria) ⏳

> **Note**: Endpoint 3 ใช้ Endpoint 2 ภายในเพื่อดึง visit data ของแต่ละผู้ป่วยที่ match — ดังนั้น field ใหม่ที่เพิ่มใน §1.4 (เช่น `diagnoses[]`, `sksDrugCode`, `stdGroup`) จะอยู่ใน visit data ที่ดึงผ่าน Endpoint 2 หลังจากค้นหาผู้ป่วยผ่าน Endpoint 3 แล้ว

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

### 1.8 Implementation Notes (สำหรับทีม SSO Cancer Care — ไม่ส่ง HIS)

> **Section นี้เป็น internal reference** สำหรับทีมพัฒนาฝั่ง SSO Cancer Care เท่านั้น — ไม่รวมในเอกสารที่ส่งทีม HIS

**การปรับ code จาก spec เดิม (Endpoint 1):**

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
