## Endpoint 4: IPD (In-Patient) Visit Data — สำหรับ CIPN Export

> **เอกสารนี้จะถูกส่งให้ทีม HIS ของโรงพยาบาล** เพื่อให้พัฒนา API สำหรับดึงข้อมูลผู้ป่วยใน (IPD) จากระบบ HOSxP
> ข้อมูลนี้ใช้สำหรับสร้างไฟล์ CIPN 2.0 (แฟ้มข้อมูลเบิกค่ารักษาผู้ป่วยใน) ส่งกรมบัญชีกลาง

### 4.1 Overview

| Item        | รายละเอียด                                                                           |
| ----------- | ------------------------------------------------------------------------------------ |
| วัตถุประสงค์ | ดึงข้อมูลการ admit ผู้ป่วยใน (IPD) พร้อมวินิจฉัย, หัตถการ, ค่ารักษา สำหรับสร้างไฟล์ CIPN |
| เรียกเมื่อ   | ผู้ใช้กด "นำเข้าข้อมูลผู้ป่วยใน" หรือ Nightly Scan อัตโนมัติ                          |
| Authentication | เหมือน Endpoint 1-3 (`Authorization: Bearer {api_key}`)                            |
| สถานะ       | ⏳ รอทีม HIS พัฒนา                                                                  |

### 4.2 Endpoint

```
GET /api/patients/{hn}/admissions?from={startDate}&to={endDate}
```

**Parameters:**

| Parameter | Type  | Required | Description                                  |
| --------- | ----- | -------- | -------------------------------------------- |
| `hn`      | path  | ✅       | HN ของผู้ป่วย (9 หลัก เติม 0 ข้างหน้า)       |
| `from`    | query | ❌       | วันเริ่มต้น (YYYY-MM-DD) — default: ไม่จำกัด |
| `to`      | query | ❌       | วันสิ้นสุด (YYYY-MM-DD) — default: วันนี้    |

> **Filter**: กรองเฉพาะ admission ที่มีวันจำหน่าย (`discharge_date`) อยู่ใน range — ถ้ายังไม่จำหน่าย ให้รวมด้วย
> **กรอง**: เฉพาะผู้ป่วยสิทธิ์ประกันสังคม (SSO) เท่านั้น เหมือน Endpoint 1-3

---

### 4.3 Priority Matrix

| Priority   | ข้อมูล                                   | เหตุผล                                 | Source HOSxP                                                           | Fallback           |
| ---------- | ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------- | ------------------ |
| 🔴 สูง    | `an` (Admission Number)                  | Primary key ของ CIPN file              | `an_stat.an` หรือ `ipt.an`                                            | ❌ ไม่มี — ต้องมี  |
| 🔴 สูง    | `admitDate`, `admitTime`                 | IPADT.DTAdm                            | `ipt.regdate` + `ipt.regtime`                                         | ❌ ไม่มี           |
| 🔴 สูง    | `dischargeDate`, `dischargeTime`         | IPADT.DTDisch                          | `ipt.dchdate` + `ipt.dchtime`                                         | null (ยังไม่จำหน่าย) |
| 🔴 สูง    | `dischargeStatus`                        | IPADT.DischStat (#18)                  | `ipt.dchstts`                                                         | ❌ ไม่มี           |
| 🔴 สูง    | `dischargeType`                          | IPADT.DischType (#19)                  | `ipt.dchtype`                                                         | ❌ ไม่มี           |
| 🔴 สูง    | `admissionType`                          | IPADT.AdmType (#13)                    | `ipt.ipt_type` หรือ mapping จาก `an_stat`                             | `"C"` (elective)   |
| 🔴 สูง    | `ward`                                   | IPADT.DischWard (#21)                  | `ipt.ward` → `ward.name`                                              | ❌ ไม่มี           |
| 🔴 สูง    | `department`                             | IPADT.Dept (#22)                       | `ipt.spclty`                                                          | ❌ ไม่มี           |
| 🔴 สูง    | `attendingDoctorLicense`                 | IPDx.DR / IPOp.DR                      | `doctor.licenseno` (join `ipt.admdoctor`)                              | ❌ ไม่มี           |
| 🔴 สูง    | `diagnoses[]` (structured)               | IPDx records                           | `iptdiag` (icd10 + diagtype + doctor)                                  | ❌ ไม่มี           |
| 🔴 สูง    | `billingItems[]`                         | Invoices / BillItems records           | `opitemrece` WHERE `an` = ? (+ drugitems/nondrugitems/income joins)    | ❌ ไม่มี           |
| 🟠 สูง-กลาง | `procedures[]` (surgical/operations)   | IPOp records                           | `ipt_operation` (procedure code, surgeon, datetime)                    | empty array        |
| 🟠 สูง-กลาง | `admissionSource`                      | IPADT.AdmSource (#14)                  | mapping จาก `ipt.ipt_type` หรือ referral data                         | `"O"` (OPD)        |
| 🟠 สูง-กลาง | `drg`, `drgVersion`                    | DRG data สำหรับ CIPN                   | `an_stat.drg` + `an_stat.rw` + version                                | null               |
| 🟡 กลาง   | `lengthOfStay`                           | LOS (วัน)                              | `DATEDIFF(dchdate, regdate)` หรือ `an_stat.los`                       | คำนวณฝั่งเรา       |
| 🟡 กลาง   | `birthWeight`                            | IPADT.AdmWt (#20) เฉพาะทารก            | `ipt.bw`                                                               | null               |
| 🟡 กลาง   | `authCode`, `authDate`                   | ClaimAuth element                      | ระบบ pre-authorization ของ รพ.                                         | default            |
| 🟢 ต่ำ    | `leaveDay`                               | IPADT.LeaveDay (#17)                   | `ipt.leave_day` (ถ้ามี)                                               | `0`                |
| 🟢 ต่ำ    | `coinsurance`                            | Coinsurance element                    | ข้อมูลสิทธิ์ร่วม                                                       | null               |

---

### 4.4 Response Format

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
      "idType": "0",
      "maritalStatus": "2",
      "nationality": "99",
      "province": "48",
      "district": "4801",
      "mainHospitalCode": "10711"
    },
    "admissions": [
      {
        "an": "0054321",
        "hn": "001002104",
        "admitDate": "2026-03-01",
        "admitTime": "19:20:30",
        "dischargeDate": "2026-03-05",
        "dischargeTime": "10:00:00",
        "admissionType": "C",
        "admissionSource": "O",
        "dischargeStatus": "2",
        "dischargeType": "1",
        "ward": "3N",
        "department": "01",
        "attendingDoctorLicense": "ว54236",
        "lengthOfStay": 4,
        "leaveDay": 0,
        "birthWeight": null,
        "drg": "470",
        "drgVersion": "6",
        "rw": 0.5432,
        "adjRw": 0.6518,
        "authCode": "CS-2026-001234",
        "authDate": "2026-03-01T18:00:00",
        "diagnoses": [
          {
            "icd10": "C509",
            "diagType": "1",
            "diagTerm": "Breast cancer, unspecified",
            "doctorLicense": "ว54236",
            "diagDate": "2026-03-01"
          },
          {
            "icd10": "Z5111",
            "diagType": "4",
            "diagTerm": "เคมีบำบัด",
            "doctorLicense": "ว54236",
            "diagDate": "2026-03-01"
          },
          {
            "icd10": "N189",
            "diagType": "2",
            "diagTerm": "CKD, unspecified",
            "doctorLicense": "ว54236",
            "diagDate": "2026-03-02"
          }
        ],
        "procedures": [
          {
            "procedureCode": "9925",
            "codeSys": "ICD9CM",
            "procedureTerm": "Injection of cancer chemotherapy",
            "doctorLicense": "ว54236",
            "startDate": "2026-03-02",
            "startTime": "09:30:00",
            "endDate": "2026-03-02",
            "endTime": "12:00:00",
            "location": "Chemo Unit"
          }
        ],
        "billingItems": [
          {
            "serviceDate": "2026-03-02T09:30:00",
            "hospitalCode": "1502262",
            "billingGroup": "3",
            "stdGroup": "03",
            "description": "PACLITAXEL 300MG/50ML INJ",
            "quantity": 1,
            "unitPrice": 2500.00,
            "discount": 0.00,
            "sksDrugCode": "49304",
            "tmtCode": "1052756000040901",
            "sksDfsText": "PACLITAXEL 300 MG/50 ML INJECTION",
            "dfsText": "Paclitaxel 300mg/50ml injection",
            "sksReimbPrice": 2500.00,
            "claimCategory": "T",
            "sigCode": "",
            "sigText": "ฉีดเข้าหลอดเลือดดำ ผสมใน 5%DW 500 ml drip นาน 3 ชม.",
            "packsize": "50 ml"
          },
          {
            "serviceDate": "2026-03-01T19:30:00",
            "hospitalCode": "9010001",
            "billingGroup": "1",
            "stdGroup": "01",
            "description": "ค่าห้องพิเศษ ชั้น 2 (รวมอาหาร)",
            "quantity": 4,
            "unitPrice": 1200.00,
            "discount": 0.00,
            "sksDrugCode": null,
            "tmtCode": null,
            "sksDfsText": null,
            "dfsText": null,
            "sksReimbPrice": null,
            "claimCategory": "D",
            "sigCode": null,
            "sigText": null,
            "packsize": null
          }
        ]
      }
    ]
  }
}
```

---

### 4.5 Admission Fields (array `admissions[]`)

| Field                   | Type   | Required | คำอธิบาย                                         | ใช้ใน CIPN               | Source HOSxP                                        | ค่าที่รับ                                                                                  |
| ----------------------- | ------ | -------- | ------------------------------------------------ | ------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `an`                    | string | ✅       | Admission Number (7-9 หลัก เติม 0)               | IPADT #1                 | `ipt.an`                                            | เช่น `"0054321"`                                                                           |
| `hn`                    | string | ✅       | HN ผู้ป่วย (9 หลัก)                               | IPADT #2                 | `ipt.hn`                                            |                                                                                            |
| `admitDate`             | string | ✅       | วันที่รับ admit (YYYY-MM-DD)                      | IPADT #15 (DTAdm)        | `ipt.regdate`                                       |                                                                                            |
| `admitTime`             | string | ✅       | เวลารับ admit (HH:mm:ss)                          | IPADT #15 (DTAdm)        | `ipt.regtime`                                       |                                                                                            |
| `dischargeDate`         | string | ❌       | วันจำหน่าย (YYYY-MM-DD) — null = ยังไม่จำหน่าย    | IPADT #16 (DTDisch)      | `ipt.dchdate`                                       | null ถ้ายังไม่ D/C                                                                          |
| `dischargeTime`         | string | ❌       | เวลาจำหน่าย (HH:mm:ss)                           | IPADT #16 (DTDisch)      | `ipt.dchtime`                                       |                                                                                            |
| `admissionType`         | string | ✅       | ประเภทการรับ admit                                | IPADT #13 (AdmType)      | `ipt.ipt_type` หรือ mapping                         | `A`=อุบัติเหตุ, `E`=ฉุกเฉิน, `C`=นัดหมาย, `L`=คลอด, `N`=ทารก, `U`=เร่งด่วน, `O`=อื่น     |
| `admissionSource`       | string | ✅       | แหล่งที่มาของการ admit                            | IPADT #14 (AdmSource)    | mapping จาก refer/OPD                               | `O`=OPD, `E`=ER, `S`=service unit, `B`=born, `T`=transferred, `R`=referral                |
| `dischargeStatus`       | string | ⚠️ ✅*   | สถานะการจำหน่าย                                   | IPADT #18 (DischStat)    | `ipt.dchstts`                                       | `1`=หายดี, `2`=ดีขึ้น, `3`=ไม่ดีขึ้น, `4`=คลอดปกติ, `8`=ตายคลอด, `9`=เสียชีวิต           |
| `dischargeType`         | string | ⚠️ ✅*   | ประเภทการจำหน่าย                                  | IPADT #19 (DischType)    | `ipt.dchtype`                                       | `1`=อนุญาต, `2`=ขอกลับ, `3`=หนี, `4`=ส่งต่อ, `5`=อื่น, `8`=เสียชีวิต(ชัน), `9`=เสียชีวิต  |
| `ward`                  | string | ✅       | หอผู้ป่วย (รหัสหรือชื่อ)                          | IPADT #21 (DischWard)    | `ipt.ward` → `ward.name`                           | เช่น `"3N"`, `"ICU-1"`, `"Ward-5B"`                                                       |
| `department`            | string | ✅       | รหัสแผนก (2 หลัก)                                 | IPADT #22 (Dept)         | `ipt.spclty`                                        | `01`=อายุรกรรม, `02`=ศัลยกรรม, `05`=กุมารเวช, `10`=รังสี, `12`=อื่น                       |
| `attendingDoctorLicense`| string | ✅       | เลขใบอนุญาตแพทย์เจ้าของไข้                       | IPDx.DR / IPOp.DR        | `doctor.licenseno` (join `ipt.admdoctor`)           | เช่น `"ว54236"`                                                                            |
| `lengthOfStay`          | number | ❌       | จำนวนวันนอน                                       | —                        | `DATEDIFF(dchdate,regdate)` หรือ `an_stat.los`      | คำนวณฝั่งเราได้ถ้าไม่มี                                                                    |
| `leaveDay`              | number | ❌       | จำนวนวันลากลับบ้าน (ระหว่าง admit)                | IPADT #17 (LeaveDay)     | `ipt.leave_day`                                     | default `0`                                                                                |
| `birthWeight`           | number | ❌       | น้ำหนักแรกเกิด (kg, ทศนิยม 3 ตำแหน่ง)             | IPADT #20 (AdmWt)        | `ipt.bw` (เฉพาะทารกอายุ < 28 วัน)                  | null ถ้าไม่ใช่ทารก                                                                         |
| `drg`                   | string | ❌       | DRG code                                          | Invoices.DRGCharge       | `an_stat.drg`                                       | เช่น `"470"`                                                                               |
| `drgVersion`            | string | ❌       | DRG version                                       | —                        | `an_stat.drg_version` หรือ config                   | เช่น `"6"`                                                                                 |
| `rw`                    | number | ❌       | Relative Weight                                   | —                        | `an_stat.rw`                                        | เช่น `0.5432`                                                                              |
| `adjRw`                 | number | ❌       | Adjusted RW                                       | —                        | `an_stat.adjrw`                                     | เช่น `0.6518`                                                                              |
| `authCode`              | string | ❌       | Authorization code                                | ClaimAuth.AuthCode       | ระบบ pre-auth ของ รพ.                               | เช่น `"CS-2026-001234"`                                                                     |
| `authDate`              | string | ❌       | Authorization datetime (ISO 8601)                 | ClaimAuth.AuthDT         | ระบบ pre-auth ของ รพ.                               |                                                                                            |

> **⚠️ ✅\***: `dischargeStatus` และ `dischargeType` เป็น **mandatory ใน CIPN** (IPADT #18, #19) — null ได้เฉพาะกรณียังไม่จำหน่าย (`dischargeDate` = null) ถ้าจำหน่ายแล้วต้องมีค่าเสมอ

---

### 4.5.1 Diagnosis Fields (array `diagnoses[]`) 🔴 Required

> **Source**: ตาราง `iptdiag` (join ด้วย `an`)
> ต้องมีอย่างน้อย 1 record ที่ `diagType = "1"` (วินิจฉัยหลัก) เสมอ

| Field           | Type   | Required | คำอธิบาย                                 | ใช้ใน CIPN           | Source HOSxP                                         |
| --------------- | ------ | -------- | ---------------------------------------- | -------------------- | ---------------------------------------------------- |
| `icd10`         | string | ✅       | รหัส ICD-10 (ไม่ต้องมีจุด)               | IPDx #4 (Code)       | `iptdiag.icd10`                                      |
| `diagType`      | string | ✅       | ประเภทการวินิจฉัย                        | IPDx #2 (DxType)     | `iptdiag.diagtype`                                   |
| `diagTerm`      | string | ❌       | คำวินิจฉัยของแพทย์ (free text)           | IPDx #5 (DiagTerm)   | `icd101.tname` (join `iptdiag.icd10`)                |
| `doctorLicense` | string | ❌       | เลขใบอนุญาตแพทย์ที่วินิจฉัย              | IPDx #6 (DR)         | `doctor.licenseno` (join `iptdiag.doctor`)           |
| `diagDate`      | string | ❌       | วันที่วินิจฉัย (YYYY-MM-DD)              | IPDx #7 (DateDiag)   | `iptdiag.diagdate` หรือ `ipt.regdate`                |

**`diagType` mapping (IPD):**

| ค่า | ความหมาย         | CIPN DxType | หมายเหตุ                   |
| --- | --------------- | ----------- | -------------------------- |
| `1` | วินิจฉัยหลัก     | `1`         | ต้องมี 1 record เสมอ        |
| `2` | โรคร่วม          | `2`         | comorbidity (มีก่อน admit)  |
| `3` | โรคแทรก          | `3`         | complication (เกิดขณะ admit) |
| `4` | วินิจฉัยอื่น      | `4`         |                            |
| `5` | สาเหตุภายนอก     | `5`         | external cause of injury    |

---

### 4.5.2 Procedure Fields (array `procedures[]`) 🟠 Recommended

> **Source**: ตาราง `ipt_operation` (join ด้วย `an`)
> ถ้าไม่มีหัตถการ ให้ส่ง empty array `[]`

| Field            | Type   | Required | คำอธิบาย                                 | ใช้ใน CIPN             | Source HOSxP                                         |
| ---------------- | ------ | -------- | ---------------------------------------- | ---------------------- | ---------------------------------------------------- |
| `procedureCode`  | string | ✅       | รหัส ICD-9-CM procedure                  | IPOp #3 (Code)         | `ipt_operation.icd9`                                 |
| `codeSys`        | string | ✅       | Code system (ปกติ = `"ICD9CM"`)          | IPOp #2 (CodeSys)      | hardcode `"ICD9CM"`                                  |
| `procedureTerm`  | string | ❌       | คำอธิบายหัตถการ (free text)              | IPOp #4 (ProcTerm)     | `icd9.tname` (join `ipt_operation.icd9`)             |
| `doctorLicense`  | string | ✅       | เลขใบอนุญาตศัลยแพทย์/แพทย์ที่ทำหัตถการ   | IPOp #5 (DR)           | `doctor.licenseno` (join `ipt_operation.doctor`)     |
| `startDate`      | string | ✅       | วันที่เริ่มหัตถการ (YYYY-MM-DD)           | IPOp #6 (DateIn)       | `ipt_operation.opdate`                               |
| `startTime`      | string | ❌       | เวลาเริ่ม (HH:mm:ss)                     | IPOp #6 (DateIn)       | `ipt_operation.optime`                               |
| `endDate`        | string | ❌       | วันที่สิ้นสุดหัตถการ (YYYY-MM-DD)         | IPOp #7 (DateOut)      | `ipt_operation.end_date`                             |
| `endTime`        | string | ❌       | เวลาสิ้นสุด (HH:mm:ss)                   | IPOp #7 (DateOut)      | `ipt_operation.end_time`                             |
| `location`       | string | ❌       | ห้องผ่าตัด / สถานที่ทำหัตถการ             | IPOp #8 (Location)     | `ipt_operation.room` หรือ `operation_room.name`      |

---

### 4.5.3 Billing Item Fields (array `billingItems[]`) 🔴 Required

> **Source**: ตาราง `opitemrece` WHERE `an` = ? (join drugitems/nondrugitems/income)
> format เหมือน Endpoint 2 (OPD) แต่เพิ่ม `serviceDate` และ `claimCategory` mapping ต่างกัน

| Field            | Type   | Required | คำอธิบาย                                          | ใช้ใน CIPN                         | Source HOSxP                                                         |
| ---------------- | ------ | -------- | ------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| `serviceDate`    | string | ✅       | วัน/เวลาที่ให้บริการ (ISO 8601)                    | BillItems #2 (ServDate)            | `opitemrece.rxdate` + `opitemrece.rxtime`                            |
| `hospitalCode`   | string | ✅       | Local Code ของ รพ.                                | BillItems #4 (LCCode)              | `opitemrece.icode`                                                   |
| `billingGroup`   | string | ✅       | หมวดค่ารักษาของ รพ.                                | BillItems #3 (BillGr)              | `opitemrece.income`                                                  |
| `stdGroup`       | string | ✅       | หมวดค่ารักษามาตรฐาน CSMBS (01-17)                 | BillItems #13 (BillGrCS)           | `income.std_group` (join `opitemrece.income`)                        |
| `description`    | string | ✅       | คำอธิบาย                                          | BillItems #5 (Descript)            | `drugitems.name` (ยา) หรือ `nondrugitems.name` (อื่น)               |
| `quantity`       | number | ✅       | จำนวน                                             | BillItems #6 (QTY)                 | `opitemrece.qty`                                                     |
| `unitPrice`      | number | ✅       | ราคาต่อหน่วย                                      | BillItems #7 (UnitPrice)           | `opitemrece.unitprice`                                               |
| `discount`       | number | ✅       | ส่วนลด (default 0.00)                             | BillItems #9 (Discount)            | `opitemrece.discount` หรือ `0.00`                                    |
| `sksDrugCode`    | string | ❌       | รหัสยา สกส. (TMT TPU) — เฉพาะรายการยา             | BillItems #16 (STDCode)            | `drugitems.sks_drug_code`                                            |
| `tmtCode`        | string | ❌       | รหัส TMT 24 หลัก — เฉพาะรายการยา                  | —                                  | `drugitems.tmt_tp_code`                                              |
| `sksDfsText`     | string | ❌       | ชื่อยาตามทะเบียน สกส. — เฉพาะรายการยา              | —                                  | `drugitems.sks_dfs_text`                                             |
| `dfsText`        | string | ❌       | ชื่อยา/dose/form — เฉพาะรายการยา                   | —                                  | `drugitems.name` + `strength` + `units`                              |
| `sksReimbPrice`  | number | ❌       | ราคาเบิก สกส. — เฉพาะรายการยา                      | BillItems #19 (ClaimUP)            | `drugitems.sks_reimb_price`                                          |
| `claimCategory`  | string | ✅       | ประเภทการเบิก CIPN                                | BillItems #17 (ClaimCat)           | mapping (ดู §4.5.4)                                                  |
| `sigCode`        | string | ❌       | รหัสวิธีใช้ยา                                     | —                                  | `opitemrece.drugusage`                                               |
| `sigText`        | string | ❌       | วิธีใช้ยา (ภาษาไทย)                               | —                                  | `drugusage.name1` + `name2` + `name3`                                |
| `packsize`       | string | ❌       | ขนาดบรรจุ                                         | —                                  | `drugitems.packqty` + `drugitems.units`                              |

---

### 4.5.4 Claim Category Mapping (CIPN)

> CIPN ใช้ `ClaimCat` ต่างจาก SSOP (OPD)

| ClaimCat | ความหมาย                    | ใช้เมื่อ                                                      |
| -------- | --------------------------- | ------------------------------------------------------------- |
| `T`      | Tariff — เบิกตามรายการ       | ยาเคมีบำบัด, อุปกรณ์พิเศษ, รายการที่เบิกนอก DRG               |
| `D`      | DRG — รวมในก้อน DRG          | ค่าห้อง, ค่าอาหาร, ค่ายาทั่วไป, ค่าบริการปกติ                  |
| `X`      | Exempt — ไม่เบิก             | รายการจากทุนวิจัย, บริจาค, ไม่ submit claim                     |

> **หมายเหตุ**: ทีม HIS ส่ง `"T"`, `"D"`, หรือ `"X"` — ตาม SQL ตัวอย่าง: ยาที่มี `sks_reimb_price` (เบิกนอก DRG) → `"T"`, ที่เหลือ → `"D"` ถ้า รพ. มี mapping ที่ละเอียดกว่านี้ ใช้ mapping ของ รพ. ได้เลย ฝั่ง SSO Cancer Care จะ re-map อีกครั้ง

---

### 4.6 Patient Fields (เพิ่มเติมจาก Endpoint 1)

> CIPN ต้องการข้อมูลผู้ป่วยเพิ่มเติมจาก SSOP:

| Field           | Type   | Required | คำอธิบาย                      | ใช้ใน CIPN          | Source HOSxP                  |
| --------------- | ------ | -------- | ----------------------------- | ------------------- | ----------------------------- |
| `idType`        | string | ✅       | ประเภทบัตร (ดู mapping ด้านล่าง) | IPADT #3 (IDTYPE)   | `patient.nationality` → mapping  |
| `maritalStatus` | string | ❌       | สถานภาพสมรส                      | IPADT #9 (MARRIAGE) | `patient.maritalstatus` ⚠️       |
| `nationality`   | string | ❌       | สัญชาติ                          | IPADT #12 (NATION)  | `patient.nationality`            |
| `province`      | string | ❌       | รหัสจังหวัด                      | IPADT #10 (CHANGWAT)| `patient.changwat`               |
| `district`      | string | ❌       | รหัสอำเภอ                        | IPADT #11 (AMPHUR)  | `patient.amphur` ⚠️              |

> ⚠️ **Verify with HIS team**: ชื่อคอลัมน์ `maritalstatus` / `amphur` อาจแตกต่างตาม version ของ HOSxP — บาง version ใช้ `maession` / `amphession`

**`idType` mapping:**
| nationality ใน HOSxP           | idType | ความหมาย                    |
| ------------------------------ | ------ | --------------------------- |
| `''`, `'99'`, `'TH'`, `NULL`  | `0`    | บัตรประชาชนไทย              |
| อื่น ๆ (ต่างชาติ)              | `1`    | หนังสือเดินทาง (Passport)    |

> fields ที่มีอยู่แล้วใน Endpoint 1 (`hn`, `citizenId`, `titleName`, `fullName`, `gender`, `dateOfBirth`) ไม่ต้องส่งซ้ำ — ใช้ format เดิมทั้งหมด

---

### 4.7 HOSxP Join Reference

> แผนผัง join ตาราง HOSxP สำหรับสร้าง response

```
ipt (an, hn, regdate, regtime, dchdate, dchtime, dchstts, dchtype, ward, spclty, admdoctor, ipt_type, bw, leave_day)
├── patient (hn → demographics)
├── doctor (ipt.admdoctor → doctor.code → licenseno)
├── ward (ipt.ward → ward.name)
├── an_stat (an → drg, rw, adjrw, drg_version, los)
├── iptdiag (an → icd10, diagtype, doctor, diagdate)
│   ├── icd101 (iptdiag.icd10 → tname)
│   └── doctor (iptdiag.doctor → licenseno)
├── ipt_operation (an → icd9, doctor, opdate, optime, end_date, end_time, room)
│   ├── icd9 (ipt_operation.icd9 → tname)
│   └── doctor (ipt_operation.doctor → licenseno)
└── opitemrece (an → icode, qty, unitprice, income, drugusage, rxdate, rxtime, discount)
    ├── drugitems (icode → name, sks_drug_code, sks_dfs_text, sks_reimb_price, tmt_tp_code, strength, units, packqty)
    ├── nondrugitems (icode → name)
    ├── income (opitemrece.income → std_group)
    └── drugusage (opitemrece.drugusage → name1, name2, name3)
```

---

### 4.8 SQL Reference (สำหรับทีม HIS)

> SQL ตัวอย่างเพื่อช่วยทีม HIS ดึงข้อมูลจาก HOSxP

#### 4.8.1 Main Admission Data

```sql
SELECT
    i.an,
    LPAD(i.hn, 9, '0') AS hn,
    DATE_FORMAT(i.regdate, '%Y-%m-%d') AS admitDate,
    COALESCE(i.regtime, '00:00:00') AS admitTime,
    CASE WHEN i.dchdate IS NOT NULL THEN DATE_FORMAT(i.dchdate, '%Y-%m-%d') ELSE NULL END AS dischargeDate,
    i.dchtime AS dischargeTime,
    COALESCE(i.ipt_type, 'C') AS admissionType,
    'O' AS admissionSource,
    i.dchstts AS dischargeStatus,
    i.dchtype AS dischargeType,
    COALESCE(w.name, CAST(i.ward AS CHAR)) AS ward,
    LPAD(COALESCE(i.spclty, '12'), 2, '0') AS department,
    d.licenseno AS attendingDoctorLicense,
    COALESCE(a.los, DATEDIFF(i.dchdate, i.regdate)) AS lengthOfStay,
    COALESCE(i.leave_day, 0) AS leaveDay,
    CASE WHEN TIMESTAMPDIFF(DAY, p.birthday, i.regdate) < 28 THEN i.bw ELSE NULL END AS birthWeight,
    a.drg,
    a.drg_version AS drgVersion,
    a.rw,
    a.adjrw
FROM ipt i
LEFT JOIN patient p ON p.hn = i.hn
LEFT JOIN doctor d ON d.code = i.admdoctor
LEFT JOIN ward w ON w.ward = i.ward
LEFT JOIN an_stat a ON a.an = i.an
WHERE i.hn = ?
  AND (i.dchdate BETWEEN ? AND ? OR i.dchdate IS NULL)
ORDER BY i.regdate DESC;
```

#### 4.8.2 IPD Diagnoses

```sql
SELECT
    id.an,
    REPLACE(id.icd10, '.', '') AS icd10,
    id.diagtype AS diagType,
    COALESCE(ic.tname, ic.ename) AS diagTerm,
    doc.licenseno AS doctorLicense,
    DATE_FORMAT(COALESCE(id.diagdate, i.regdate), '%Y-%m-%d') AS diagDate
FROM iptdiag id
LEFT JOIN icd101 ic ON ic.code = id.icd10
LEFT JOIN doctor doc ON doc.code = id.doctor
LEFT JOIN ipt i ON i.an = id.an
WHERE id.an IN (?)
ORDER BY id.an, id.diagtype, id.icd10;
```

#### 4.8.3 IPD Procedures

```sql
SELECT
    io.an,
    io.icd9 AS procedureCode,
    'ICD9CM' AS codeSys,
    COALESCE(i9.tname, i9.ename) AS procedureTerm,
    d.licenseno AS doctorLicense,
    DATE_FORMAT(io.opdate, '%Y-%m-%d') AS startDate,
    io.optime AS startTime,
    DATE_FORMAT(io.end_date, '%Y-%m-%d') AS endDate,
    io.end_time AS endTime,
    COALESCE(opr.name, io.room) AS location
FROM ipt_operation io
LEFT JOIN icd9 i9 ON i9.code = io.icd9
LEFT JOIN doctor d ON d.code = io.doctor
LEFT JOIN operation_room opr ON opr.id = io.room_id
WHERE io.an IN (?)
ORDER BY io.an, io.opdate, io.optime;
```

#### 4.8.4 IPD Billing Items

```sql
SELECT
    opi.an,
    CONCAT(DATE_FORMAT(COALESCE(opi.rxdate, i.regdate), '%Y-%m-%d'), 'T',
           COALESCE(opi.rxtime, '00:00:00')) AS serviceDate,
    opi.icode AS hospitalCode,
    opi.income AS billingGroup,
    COALESCE(inc.std_group, opi.income) AS stdGroup,
    COALESCE(di.name, ndi.name) AS description,
    opi.qty AS quantity,
    opi.unitprice AS unitPrice,
    COALESCE(opi.discount, 0) AS discount,
    di.sks_drug_code AS sksDrugCode,
    di.tmt_tp_code AS tmtCode,
    di.sks_dfs_text AS sksDfsText,
    CASE WHEN di.icode IS NOT NULL
         THEN CONCAT_WS(' ', di.name, di.strength, di.units)
         ELSE NULL END AS dfsText,
    di.sks_reimb_price AS sksReimbPrice,
    CASE
        WHEN di.icode IS NOT NULL AND di.sks_reimb_price IS NOT NULL THEN 'T'
        ELSE 'D'
    END AS claimCategory,
    opi.drugusage AS sigCode,
    CASE WHEN du.drugusage IS NOT NULL
         THEN CONCAT_WS(' ', du.name1, du.name2, du.name3)
         ELSE NULL END AS sigText,
    CASE WHEN di.icode IS NOT NULL
         THEN CONCAT_WS(' ', di.packqty, di.units)
         ELSE NULL END AS packsize
FROM opitemrece opi
LEFT JOIN ipt i ON i.an = opi.an
LEFT JOIN drugitems di ON di.icode = opi.icode
LEFT JOIN nondrugitems ndi ON ndi.icode = opi.icode AND di.icode IS NULL
LEFT JOIN income inc ON inc.income = opi.income
LEFT JOIN drugusage du ON du.drugusage = opi.drugusage
WHERE opi.an IN (?)
ORDER BY opi.an, opi.rxdate, opi.rxtime;
```

#### 4.8.5 Patient Demographics (IPD-specific fields)

```sql
SELECT
    LPAD(p.hn, 9, '0') AS hn,
    p.cid AS citizenId,
    CASE
        WHEN p.nationality IN ('', '99', 'TH') THEN '0'
        ELSE '1'
    END AS idType,
    COALESCE(p.maritalstatus, '9') AS maritalStatus,   -- ⚠️ verify: อาจเป็น p.marriage หรือ p.maession แล้วแต่ version HOSxP
    COALESCE(p.nationality, '99') AS nationality,
    p.changwat AS province,
    p.amphur AS district                               -- ⚠️ verify: อาจเป็น p.ampession แล้วแต่ version HOSxP
FROM patient p
WHERE p.hn = ?;
```

---

### 4.9 Golang Implementation Reference

> ตัวอย่าง Golang code สำหรับทีม HIS — ปรับจากรูปแบบ Endpoint 2 (OPD) ที่มีอยู่แล้ว

#### 4.9.1 Data Structures

```go
package models

import "time"

// IPDAdmission represents a single inpatient admission
type IPDAdmission struct {
	AN                    string          `json:"an"`
	HN                    string          `json:"hn"`
	AdmitDate             string          `json:"admitDate"`
	AdmitTime             string          `json:"admitTime"`
	DischargeDate         *string         `json:"dischargeDate"`
	DischargeTime         *string         `json:"dischargeTime"`
	AdmissionType         string          `json:"admissionType"`
	AdmissionSource       string          `json:"admissionSource"`
	DischargeStatus       *string         `json:"dischargeStatus"`
	DischargeType         *string         `json:"dischargeType"`
	Ward                  string          `json:"ward"`
	Department            string          `json:"department"`
	AttendingDoctorLicense string         `json:"attendingDoctorLicense"`
	LengthOfStay          *int            `json:"lengthOfStay"`
	LeaveDay              int             `json:"leaveDay"`
	BirthWeight           *float64        `json:"birthWeight"`
	DRG                   *string         `json:"drg"`
	DRGVersion            *string         `json:"drgVersion"`
	RW                    *float64        `json:"rw"`
	AdjRW                 *float64        `json:"adjRw"`
	AuthCode              *string         `json:"authCode"`
	AuthDate              *string         `json:"authDate"`
	Diagnoses             []IPDDiagnosis  `json:"diagnoses"`
	Procedures            []IPDProcedure  `json:"procedures"`
	BillingItems          []IPDBillingItem `json:"billingItems"`
}

// IPDDiagnosis represents a single diagnosis record for an admission
type IPDDiagnosis struct {
	ICD10         string  `json:"icd10"`
	DiagType      string  `json:"diagType"`
	DiagTerm      *string `json:"diagTerm"`
	DoctorLicense *string `json:"doctorLicense"`
	DiagDate      *string `json:"diagDate"`
}

// IPDProcedure represents a single surgical/operation record
type IPDProcedure struct {
	ProcedureCode string  `json:"procedureCode"`
	CodeSys       string  `json:"codeSys"`
	ProcedureTerm *string `json:"procedureTerm"`
	DoctorLicense string  `json:"doctorLicense"`
	StartDate     string  `json:"startDate"`
	StartTime     *string `json:"startTime"`
	EndDate       *string `json:"endDate"`
	EndTime       *string `json:"endTime"`
	Location      *string `json:"location"`
}

// IPDBillingItem represents a single billing line item
type IPDBillingItem struct {
	ServiceDate   string   `json:"serviceDate"`
	HospitalCode  string   `json:"hospitalCode"`
	BillingGroup  string   `json:"billingGroup"`
	StdGroup      string   `json:"stdGroup"`
	Description   string   `json:"description"`
	Quantity      float64  `json:"quantity"`
	UnitPrice     float64  `json:"unitPrice"`
	Discount      float64  `json:"discount"`
	SksDrugCode   *string  `json:"sksDrugCode"`
	TmtCode       *string  `json:"tmtCode"`
	SksDfsText    *string  `json:"sksDfsText"`
	DfsText       *string  `json:"dfsText"`
	SksReimbPrice *float64 `json:"sksReimbPrice"`
	ClaimCategory string   `json:"claimCategory"`
	SigCode       *string  `json:"sigCode"`
	SigText       *string  `json:"sigText"`
	Packsize      *string  `json:"packsize"`
}

// IPDPatient extends the existing patient struct with IPD-specific fields
type IPDPatient struct {
	HN                string  `json:"hn"`
	CitizenId         string  `json:"citizenId"`
	TitleName         string  `json:"titleName"`
	FullName          string  `json:"fullName"`
	Gender            string  `json:"gender"`
	DateOfBirth       string  `json:"dateOfBirth"`
	IDType            string  `json:"idType"`
	MaritalStatus     *string `json:"maritalStatus"`
	Nationality       *string `json:"nationality"`
	Province          *string `json:"province"`
	District          *string `json:"district"`
	MainHospitalCode  string  `json:"mainHospitalCode"`
}

// IPDResponse is the top-level response for Endpoint 4
type IPDResponse struct {
	Patient    IPDPatient     `json:"patient"`
	Admissions []IPDAdmission `json:"admissions"`
}
```

#### 4.9.2 Handler & Query

```go
package handlers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// nullStr scans a sql.NullString and returns *string (nil if NULL)
func nullStr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}

// nullF64 scans a sql.NullFloat64 and returns *float64 (nil if NULL)
func nullF64(nf sql.NullFloat64) *float64 {
	if nf.Valid {
		return &nf.Float64
	}
	return nil
}

// nullInt scans a sql.NullInt64 and returns *int (nil if NULL)
func nullInt(ni sql.NullInt64) *int {
	if ni.Valid {
		v := int(ni.Int64)
		return &v
	}
	return nil
}

// GetIPDAdmissions handles GET /api/patients/:hn/admissions
func GetIPDAdmissions(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		hn := c.Param("hn")
		// Validate and pad HN to 9 digits (numeric only)
		hnNum, err := strconv.Atoi(strings.TrimLeft(hn, "0"))
		if err != nil || hnNum <= 0 {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error":   gin.H{"code": "INVALID_PARAMETER", "message": "HN ไม่ถูกต้อง"},
			})
			return
		}
		hn = fmt.Sprintf("%09d", hnNum)

		dateFrom := c.DefaultQuery("from", "2000-01-01")
		dateTo := c.DefaultQuery("to", "2099-12-31")

		// 1. Fetch patient demographics
		patient, err := fetchIPDPatient(db, hn)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   gin.H{"code": "PATIENT_NOT_FOUND", "message": "ไม่พบข้อมูลผู้ป่วย HN " + hn},
			})
			return
		}

		// 2. Fetch admissions
		admissions, err := fetchAdmissions(db, hn, dateFrom, dateTo)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   gin.H{"code": "INTERNAL_ERROR", "message": "เกิดข้อผิดพลาดในการดึงข้อมูล admission"},
			})
			return
		}

		if len(admissions) == 0 {
			c.JSON(http.StatusOK, gin.H{
				"success": true,
				"data":    gin.H{"patient": patient, "admissions": []interface{}{}},
			})
			return
		}

		// 3. Collect AN list for batch queries
		anList := make([]string, len(admissions))
		for i, adm := range admissions {
			anList[i] = adm.AN
		}

		// 4. Batch-fetch diagnoses, procedures, billing items
		diagMap, err := fetchIPDDiagnoses(db, anList)
		if err != nil {
			log.Printf("WARN: fetchIPDDiagnoses failed: %v", err)
			diagMap = map[string][]IPDDiagnosis{}
		}
		procMap, err := fetchIPDProcedures(db, anList)
		if err != nil {
			log.Printf("WARN: fetchIPDProcedures failed: %v", err)
			procMap = map[string][]IPDProcedure{}
		}
		billMap, err := fetchIPDBillingItems(db, anList)
		if err != nil {
			log.Printf("WARN: fetchIPDBillingItems failed: %v", err)
			billMap = map[string][]IPDBillingItem{}
		}

		// 5. Attach to admissions
		for i := range admissions {
			an := admissions[i].AN
			admissions[i].Diagnoses = diagMap[an]
			admissions[i].Procedures = procMap[an]
			admissions[i].BillingItems = billMap[an]

			if admissions[i].Diagnoses == nil {
				admissions[i].Diagnoses = []IPDDiagnosis{}
			}
			if admissions[i].Procedures == nil {
				admissions[i].Procedures = []IPDProcedure{}
			}
			if admissions[i].BillingItems == nil {
				admissions[i].BillingItems = []IPDBillingItem{}
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    gin.H{"patient": patient, "admissions": admissions},
		})
	}
}

// fetchIPDPatient fetches patient demographics with IPD-specific fields
func fetchIPDPatient(db *sql.DB, hn string) (*IPDPatient, error) {
	query := `
		SELECT
			LPAD(p.hn, 9, '0') AS hn,
			p.cid AS citizenId,
			COALESCE(p.pname, '') AS titleName,
			CONCAT_WS(' ', p.fname, p.lname) AS fullName,
			CASE WHEN p.sex = '1' THEN 'M' ELSE 'F' END AS gender,
			DATE_FORMAT(p.birthday, '%Y-%m-%d') AS dateOfBirth,
			CASE WHEN p.nationality IN ('', '99', 'TH') OR p.nationality IS NULL THEN '0' ELSE '1' END AS idType,
			p.maritalstatus AS maritalStatus,
			COALESCE(p.nationality, '99') AS nationality,
			p.changwat AS province,
			p.amphur AS district,
			COALESCE(p.hcode, '') AS mainHospitalCode
		FROM patient p
		WHERE p.hn = ?`

	var pt IPDPatient
	var maritalNS, nationalityNS, provinceNS, districtNS sql.NullString
	err := db.QueryRow(query, hn).Scan(
		&pt.HN, &pt.CitizenId, &pt.TitleName, &pt.FullName,
		&pt.Gender, &pt.DateOfBirth, &pt.IDType,
		&maritalNS, &nationalityNS, &provinceNS, &districtNS,
		&pt.MainHospitalCode,
	)
	if err != nil {
		return nil, err
	}
	pt.MaritalStatus = nullStr(maritalNS)
	pt.Nationality = nullStr(nationalityNS)
	pt.Province = nullStr(provinceNS)
	pt.District = nullStr(districtNS)
	return &pt, nil
}

// fetchAdmissions fetches admission records from ipt table
func fetchAdmissions(db *sql.DB, hn, dateFrom, dateTo string) ([]IPDAdmission, error) {
	query := `
		SELECT
			i.an,
			LPAD(i.hn, 9, '0') AS hn,
			DATE_FORMAT(i.regdate, '%Y-%m-%d') AS admitDate,
			COALESCE(i.regtime, '00:00:00') AS admitTime,
			CASE WHEN i.dchdate IS NOT NULL THEN DATE_FORMAT(i.dchdate, '%Y-%m-%d') ELSE NULL END AS dischargeDate,
			i.dchtime AS dischargeTime,
			COALESCE(i.ipt_type, 'C') AS admissionType,
			'O' AS admissionSource,
			i.dchstts AS dischargeStatus,
			i.dchtype AS dischargeType,
			COALESCE(w.name, CAST(i.ward AS CHAR)) AS ward,
			LPAD(COALESCE(i.spclty, '12'), 2, '0') AS department,
			d.licenseno AS attendingDoctorLicense,
			COALESCE(a.los, DATEDIFF(i.dchdate, i.regdate)) AS lengthOfStay,
			COALESCE(i.leave_day, 0) AS leaveDay,
			CASE WHEN TIMESTAMPDIFF(DAY, p.birthday, i.regdate) < 28 THEN i.bw ELSE NULL END AS birthWeight,
			a.drg,
			a.drg_version AS drgVersion,
			a.rw,
			a.adjrw
		FROM ipt i
		LEFT JOIN patient p ON p.hn = i.hn
		LEFT JOIN doctor d ON d.code = i.admdoctor
		LEFT JOIN ward w ON w.ward = i.ward
		LEFT JOIN an_stat a ON a.an = i.an
		WHERE i.hn = ?
		  AND (i.dchdate BETWEEN ? AND ? OR i.dchdate IS NULL)
		ORDER BY i.regdate DESC`

	rows, err := db.Query(query, hn, dateFrom, dateTo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var admissions []IPDAdmission
	for rows.Next() {
		var adm IPDAdmission
		var dischDateNS, dischTimeNS, dischStatNS, dischTypeNS sql.NullString
		var doctorLicNS, drgNS, drgVersionNS sql.NullString
		var losNI sql.NullInt64
		var birthWtNF, rwNF, adjRwNF sql.NullFloat64

		err := rows.Scan(
			&adm.AN, &adm.HN, &adm.AdmitDate, &adm.AdmitTime,
			&dischDateNS, &dischTimeNS,
			&adm.AdmissionType, &adm.AdmissionSource,
			&dischStatNS, &dischTypeNS,
			&adm.Ward, &adm.Department, &doctorLicNS,
			&losNI, &adm.LeaveDay, &birthWtNF,
			&drgNS, &drgVersionNS, &rwNF, &adjRwNF,
		)
		if err != nil {
			log.Printf("WARN: scan admission row: %v", err)
			continue
		}
		adm.DischargeDate = nullStr(dischDateNS)
		adm.DischargeTime = nullStr(dischTimeNS)
		adm.DischargeStatus = nullStr(dischStatNS)
		adm.DischargeType = nullStr(dischTypeNS)
		adm.AttendingDoctorLicense = func() string {
			if doctorLicNS.Valid { return doctorLicNS.String }
			return ""
		}()
		adm.LengthOfStay = nullInt(losNI)
		adm.BirthWeight = nullF64(birthWtNF)
		adm.DRG = nullStr(drgNS)
		adm.DRGVersion = nullStr(drgVersionNS)
		adm.RW = nullF64(rwNF)
		adm.AdjRW = nullF64(adjRwNF)
		admissions = append(admissions, adm)
	}
	return admissions, nil
}

// fetchIPDDiagnoses batch-fetches diagnoses for multiple ANs
func fetchIPDDiagnoses(db *sql.DB, anList []string) (map[string][]IPDDiagnosis, error) {
	if len(anList) == 0 {
		return map[string][]IPDDiagnosis{}, nil
	}

	placeholders := strings.Repeat("?,", len(anList))
	placeholders = placeholders[:len(placeholders)-1]

	query := fmt.Sprintf(`
		SELECT
			id.an,
			REPLACE(id.icd10, '.', '') AS icd10,
			id.diagtype AS diagType,
			COALESCE(ic.tname, ic.ename) AS diagTerm,
			doc.licenseno AS doctorLicense,
			DATE_FORMAT(COALESCE(id.diagdate, i.regdate), '%%Y-%%m-%%d') AS diagDate
		FROM iptdiag id
		LEFT JOIN icd101 ic ON ic.code = id.icd10
		LEFT JOIN doctor doc ON doc.code = id.doctor
		LEFT JOIN ipt i ON i.an = id.an
		WHERE id.an IN (%s)
		ORDER BY id.an, id.diagtype, id.icd10`, placeholders)

	args := make([]interface{}, len(anList))
	for i, an := range anList {
		args[i] = an
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]IPDDiagnosis)
	for rows.Next() {
		var an string
		var d IPDDiagnosis
		var diagTermNS, doctorLicNS, diagDateNS sql.NullString
		if err := rows.Scan(&an, &d.ICD10, &d.DiagType, &diagTermNS, &doctorLicNS, &diagDateNS); err != nil {
			continue
		}
		d.DiagTerm = nullStr(diagTermNS)
		d.DoctorLicense = nullStr(doctorLicNS)
		d.DiagDate = nullStr(diagDateNS)
		result[an] = append(result[an], d)
	}
	return result, nil
}

// fetchIPDProcedures batch-fetches procedures for multiple ANs
func fetchIPDProcedures(db *sql.DB, anList []string) (map[string][]IPDProcedure, error) {
	if len(anList) == 0 {
		return map[string][]IPDProcedure{}, nil
	}

	placeholders := strings.Repeat("?,", len(anList))
	placeholders = placeholders[:len(placeholders)-1]

	query := fmt.Sprintf(`
		SELECT
			io.an,
			io.icd9 AS procedureCode,
			'ICD9CM' AS codeSys,
			COALESCE(i9.tname, i9.ename) AS procedureTerm,
			doc.licenseno AS doctorLicense,
			DATE_FORMAT(io.opdate, '%%Y-%%m-%%d') AS startDate,
			io.optime AS startTime,
			CASE WHEN io.end_date IS NOT NULL THEN DATE_FORMAT(io.end_date, '%%Y-%%m-%%d') ELSE NULL END AS endDate,
			io.end_time AS endTime,
			COALESCE(opr.name, io.room) AS location
		FROM ipt_operation io
		LEFT JOIN icd9 i9 ON i9.code = io.icd9
		LEFT JOIN doctor doc ON doc.code = io.doctor
		LEFT JOIN operation_room opr ON opr.id = io.room_id
		WHERE io.an IN (%s)
		ORDER BY io.an, io.opdate, io.optime`, placeholders)

	args := make([]interface{}, len(anList))
	for i, an := range anList {
		args[i] = an
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]IPDProcedure)
	for rows.Next() {
		var an string
		var p IPDProcedure
		var procTermNS, doctorLicNS, startTimeNS, endDateNS, endTimeNS, locationNS sql.NullString
		if err := rows.Scan(&an, &p.ProcedureCode, &p.CodeSys, &procTermNS,
			&doctorLicNS, &p.StartDate, &startTimeNS, &endDateNS, &endTimeNS, &locationNS); err != nil {
			continue
		}
		p.ProcedureTerm = nullStr(procTermNS)
		p.DoctorLicense = func() string {
			if doctorLicNS.Valid { return doctorLicNS.String }
			return ""
		}()
		p.StartTime = nullStr(startTimeNS)
		p.EndDate = nullStr(endDateNS)
		p.EndTime = nullStr(endTimeNS)
		p.Location = nullStr(locationNS)
		result[an] = append(result[an], p)
	}
	return result, nil
}

// fetchIPDBillingItems batch-fetches billing items for multiple ANs
func fetchIPDBillingItems(db *sql.DB, anList []string) (map[string][]IPDBillingItem, error) {
	if len(anList) == 0 {
		return map[string][]IPDBillingItem{}, nil
	}

	placeholders := strings.Repeat("?,", len(anList))
	placeholders = placeholders[:len(placeholders)-1]

	query := fmt.Sprintf(`
		SELECT
			opi.an,
			CONCAT(DATE_FORMAT(COALESCE(opi.rxdate, i.regdate), '%%Y-%%m-%%d'), 'T',
			       COALESCE(opi.rxtime, '00:00:00')) AS serviceDate,
			opi.icode AS hospitalCode,
			opi.income AS billingGroup,
			COALESCE(inc.std_group, opi.income) AS stdGroup,
			COALESCE(di.name, ndi.name) AS description,
			opi.qty AS quantity,
			COALESCE(opi.unitprice, 0) AS unitPrice,
			COALESCE(opi.discount, 0) AS discount,
			di.sks_drug_code AS sksDrugCode,
			di.tmt_tp_code AS tmtCode,
			di.sks_dfs_text AS sksDfsText,
			CASE WHEN di.icode IS NOT NULL
			     THEN CONCAT_WS(' ', di.name, di.strength, di.units)
			     ELSE NULL END AS dfsText,
			di.sks_reimb_price AS sksReimbPrice,
			CASE
			    WHEN di.icode IS NOT NULL AND di.sks_reimb_price IS NOT NULL THEN 'T'
			    ELSE 'D'
			END AS claimCategory,
			opi.drugusage AS sigCode,
			CASE WHEN du.drugusage IS NOT NULL
			     THEN CONCAT_WS(' ', du.name1, du.name2, du.name3)
			     ELSE NULL END AS sigText,
			CASE WHEN di.icode IS NOT NULL
			     THEN CONCAT_WS(' ', di.packqty, di.units)
			     ELSE NULL END AS packsize
		FROM opitemrece opi
		LEFT JOIN ipt i ON i.an = opi.an
		LEFT JOIN drugitems di ON di.icode = opi.icode
		LEFT JOIN nondrugitems ndi ON ndi.icode = opi.icode AND di.icode IS NULL
		LEFT JOIN income inc ON inc.income = opi.income
		LEFT JOIN drugusage du ON du.drugusage = opi.drugusage
		WHERE opi.an IN (%s)
		ORDER BY opi.an, opi.rxdate, opi.rxtime`, placeholders)

	args := make([]interface{}, len(anList))
	for i, an := range anList {
		args[i] = an
	}

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]IPDBillingItem)
	for rows.Next() {
		var an string
		var b IPDBillingItem
		var sksDrugNS, tmtNS, sksDfsNS, dfsNS, sigCodeNS, sigTextNS, packsizeNS sql.NullString
		var sksReimbNF sql.NullFloat64
		if err := rows.Scan(&an, &b.ServiceDate, &b.HospitalCode, &b.BillingGroup,
			&b.StdGroup, &b.Description, &b.Quantity, &b.UnitPrice, &b.Discount,
			&sksDrugNS, &tmtNS, &sksDfsNS, &dfsNS, &sksReimbNF,
			&b.ClaimCategory, &sigCodeNS, &sigTextNS, &packsizeNS); err != nil {
			continue
		}
		b.SksDrugCode = nullStr(sksDrugNS)
		b.TmtCode = nullStr(tmtNS)
		b.SksDfsText = nullStr(sksDfsNS)
		b.DfsText = nullStr(dfsNS)
		b.SksReimbPrice = nullF64(sksReimbNF)
		b.SigCode = nullStr(sigCodeNS)
		b.SigText = nullStr(sigTextNS)
		b.Packsize = nullStr(packsizeNS)
		result[an] = append(result[an], b)
	}
	return result, nil
}
```

#### 4.9.3 Router Registration

```go
// In main.go or routes.go
func RegisterIPDRoutes(r *gin.RouterGroup, db *sql.DB) {
	r.GET("/patients/:hn/admissions", handlers.GetIPDAdmissions(db))
}
```

---

### 4.10 ความแตกต่างจาก Endpoint 2 (OPD)

| หัวข้อ              | Endpoint 2 (OPD visits)              | Endpoint 4 (IPD admissions)            |
| ------------------- | ------------------------------------ | -------------------------------------- |
| **Path**            | `/api/patients/{hn}/visits`          | `/api/patients/{hn}/admissions`        |
| **Primary Key**     | VN (Visit Number)                    | AN (Admission Number)                  |
| **HOSxP table**     | `ovst` + `opitemrece`                | `ipt` + `opitemrece` (join by `an`)    |
| **Diagnoses**       | `ovstdiag` (diagtype 1-4)            | `iptdiag` (diagtype 1-5, + doctor)     |
| **Procedures**      | ไม่มี                                | `ipt_operation` (ICD-9-CM + surgeon)   |
| **Date range**      | `visitDate BETWEEN`                  | `dchdate BETWEEN` (+ ยังไม่ D/C)       |
| **Time fields**     | `serviceStartTime`, `serviceEndTime` | `admitDate/Time`, `dischargeDate/Time` |
| **DRG data**        | ไม่มี                                | `drg`, `rw`, `adjRw`                   |
| **ClaimCategory**   | `OP1` / `OPR`                        | `T` / `D` / `X`                        |
| **Demographics**    | เหมือน Endpoint 1                    | เพิ่ม `idType`, `maritalStatus`, `nationality`, `province`, `district` |
| **Ward/Discharge**  | `dischargeType` only                 | `ward` + `dischargeStatus` + `dischargeType` + `department` |

---

### 4.11 Error Codes

> เหมือน Endpoint 1-3 (§1.6) + เพิ่มเติม:

| Code                     | HTTP Status | Description                          |
| ------------------------ | ----------- | ------------------------------------ |
| `PATIENT_NOT_FOUND`      | 404         | ไม่พบผู้ป่วย                         |
| `NO_ADMISSIONS_FOUND`    | 200         | ไม่มีข้อมูล admission (ส่ง empty array) |
| `INVALID_PARAMETER`      | 400         | Parameter ไม่ถูกต้อง                 |
| `UNAUTHORIZED`           | 401         | API Key ไม่ถูกต้อง                   |
| `RATE_LIMITED`           | 429         | เรียก API บ่อยเกินไป                 |
| `INTERNAL_ERROR`         | 500         | ข้อผิดพลาดภายใน HIS                  |

---

### 4.12 CIPN Fields — HIS vs Derived

> CIPN 2.0 มีบาง field ที่ไม่ต้องมาจาก HIS — สร้างฝั่ง SSO Cancer Care ได้เลย
> ตารางนี้แสดง field ที่จะถูก **derive ใน export code** ไม่ต้องส่งจาก HIS

| CIPN Element      | Field          | วิธี Derive                                                         | หมายเหตุ                                      |
| ----------------- | -------------- | ------------------------------------------------------------------- | --------------------------------------------- |
| Header            | DocClass       | hardcode `"IPClaim"`                                                | คงที่                                          |
| Header            | DocSysID       | hardcode `"CIPN"` version 2.0                                      | คงที่                                          |
| Header            | serviceEvent   | hardcode `"ADT"`                                                   | คงที่                                          |
| Header            | authorID       | จาก `hospital_id` ใน AppSetting                                    | hcode5 ของ รพ.                                 |
| Header            | authorName     | จาก Hospital table                                                  |                                               |
| ClaimAuth         | UPayPlan       | hardcode `"80"` (SSO)                                              | สิทธิ์ SSO = 80                                |
| ClaimAuth         | ServiceType    | derive จาก `admissionType`: default `"IP"`                         |                                               |
| IPADT             | IDTYPE (#3)    | จาก `patient.idType` (mapping nationality → 0/1)                   | อยู่ใน API response แล้ว                       |
| IPADT             | PIDPAT (#4)    | จาก `patient.citizenId`                                            | อยู่ใน API response แล้ว                       |
| IPDx              | sequence       | array index + 1                                                     |                                               |
| IPDx              | CodeSys (#3)   | hardcode `"ICD10"` หรือ `"ICD10TM"`                                | ตามที่ กรมบัญชีกลาง กำหนด                      |
| IPOp              | sequence       | array index + 1                                                     |                                               |
| Invoices          | InvNumber      | generate จาก batch ID                                               |                                               |
| Invoices          | InvDT          | export datetime                                                     |                                               |
| Invoices          | InvAddDiscount | `SUM(discount)` จาก billing items                                   | คำนวณจากข้อมูลที่มี                            |
| Invoices          | DRGCharge      | `SUM(qty*unitPrice - discount)` WHERE claimCat='D'                  | คำนวณจากข้อมูลที่มี                            |
| Invoices          | XDRGClaim      | `SUM(MIN(claimAmt, chargeAmt))` WHERE claimCat='T'                  | คำนวณจากข้อมูลที่มี                            |
| BillItems         | sequence       | array index + 1                                                     |                                               |
| BillItems         | ChargeAmt (#8) | `quantity × unitPrice`                                              |                                               |
| BillItems         | ClaimAmt (#20) | `quantity × sksReimbPrice` (เฉพาะ claimCat='T')                    |                                               |
| BillItems         | ClaimSys (#12) | hardcode `"SS"` (SSO)                                               |                                               |
| Coinsurance       | ทั้ง section    | ส่ง empty `<Coinsurance/>` (spec อนุญาต)                            | ข้อมูลสิทธิ์ร่วมยากดึงจาก HIS                  |

> **สรุป**: API response ครอบคลุม ~83% ของ CIPN mandatory fields ส่วนที่เหลือ derive ได้ทั้งหมดใน export code โดยไม่ต้อง request เพิ่มจาก HIS

---

### 4.13 HOSxP Field Verification Checklist

> ⚠️ ชื่อคอลัมน์ต่อไปนี้อาจแตกต่างตาม **version ของ HOSxP** — ทีม HIS ควรตรวจสอบก่อน implement

| Field ใน spec      | คอลัมน์ที่ใช้ใน SQL  | ทางเลือกอื่นที่อาจพบ                        | ตรวจสอบ |
| ------------------- | -------------------- | ------------------------------------------- | ------- |
| Marital status      | `patient.maritalstatus` | `patient.maession`, `patient.marriage`    | ☐       |
| District code       | `patient.amphur`     | `patient.amphession`, `patient.ampession`   | ☐       |
| Operation room FK   | `ipt_operation.room_id` → `operation_room.id` | `ipt_operation.room` (direct string) | ☐ |
| Drug pack quantity  | `drugitems.packqty`  | อาจไม่มีใน HOSxP บาง version               | ☐       |
| DRG version         | `an_stat.drg_version` | `an_stat.rw_version`                       | ☐       |
| ICD-10 lookup table | `icd101`             | `icd10`, `icd10tm`                          | ☐       |
| Billing table for IPD | `opitemrece` (WHERE `an` IS NOT NULL) | ตรวจว่ามีทั้ง `vn` และ `an` column | ☐ |
