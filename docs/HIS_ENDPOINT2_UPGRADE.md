# Endpoint 2: Patient Visit Data — แนวทางปรับปรุง

> **เอกสารฉบับนี้สำหรับทีม HIS** — สรุปสิ่งที่ต้องแก้ไข/เพิ่มเติมใน Endpoint 2 จากการตรวจสอบ response จริง
> เทียบกับข้อมูลที่ระบบ SSO Cancer Care ต้องใช้สำหรับ SSOP 0.93 electronic billing

---

## 1. สรุปปัญหาจาก Response ปัจจุบัน

### 1.1 ข้อมูลที่ส่งมาถูกต้องแล้ว ✅

| Field | ตัวอย่างจริง | หมายเหตุ |
|-------|-------------|----------|
| `physicianLicenseNo` | `"ว54236"`, `"ท14164"` | มีครบทุก visit |
| `clinicCode` | `"10"`, `"11"` | มีค่าจริง |
| `visitType` | `"1"`, `"2"` | walk-in / นัด |
| `dischargeType` | `"1"`, `"9"` | กลับบ้าน / อื่นๆ |
| `nextAppointmentDate` | `"2025-12-11"` | มีสำหรับบาง visit |
| `tmtCode` | `"1052756000040901"` | เฉพาะรายการยา, null สำหรับ non-drug ✅ |
| `dfsText` | `"CARBOPLATIN 450MG/45ML INJ"` | มีสำหรับรายการยา |
| `sigText` | `"ฉีดเข้าหลอดเลือดดำ..."` | มีสำหรับรายการยา |

### 1.2 ข้อมูลที่ต้องแก้ไข ⚠️

| # | Field | ปัญหา | ค่าจริงที่ได้ | ค่าที่ต้องการ |
|---|-------|-------|-------------|-------------|
| 1 | `stdCode` | ส่ง local code เหมือน `hospitalCode` | `"1502262"` | ยา: `drugitems.sks_drug_code`, อื่น: คงเดิม |
| 2 | `serviceClass` | ส่งเป็น `""` (empty string) | `""` | map จาก `ovst.spclty` → `"EC"`/`"OP"` ฯลฯ |
| 3 | `serviceType` | ส่งเป็น `""` (empty string) | `""` | map จาก visit context → `"01"` ถึง `"05"` |
| 4 | `billingGroup` | hospital local code | `"3"`,`"8"`,`"B"`,`"C"` | ยังส่งเหมือนเดิมได้ (เราใช้ `stdGroup` แทน) |
| 5 | `medications[]` | ว่างแม้ visit มียาใน billingItems | `[]` | populate จาก `opitemrece` ที่เป็นยา |

### 1.3 ข้อมูลที่ต้องเพิ่ม ❌

| # | Field | ความสำคัญ | ใช้ใน SSOP | Source HOSxP |
|---|-------|-----------|------------|--------------|
| 1 | `diagnoses[]` | 🔴 สูง | OPDx (ต้องการ diagType) | `ovstdiag` |
| 2 | `sksDrugCode` | 🟠 สูง-กลาง | DrgID, STDCode | `drugitems.sks_drug_code` |
| 3 | `stdGroup` | 🟠 สูง-กลาง | BillItems.BillMuad | `income.std_group` |
| 4 | `sksDfsText` | 🟠 สูง-กลาง | DispensedItems.dfsText | `drugitems.sks_dfs_text` |
| 5 | `sksReimbPrice` | 🟠 สูง-กลาง | BillItems.ClaimUP | `drugitems.sks_reimb_price` |
| 6 | `receiptNo` | 🟡 กลาง | BILLTRAN.Billno | `rcpt_print.rcpno` |

---

## 2. แผนผัง Join ตาราง HOSxP

```
ovst (vn, hn, vstdate, vsttime, doctor, spclty, visit_type)
│
├── patient (hn → cid, pname, fname, lname, birthday, sex, hcode)
│
├── doctor (ovst.doctor → doctor.code)
│   └── doctor.licenseno                          → physicianLicenseNo
│
├── ovstdiag (vn)                                 → diagnoses[]
│   ├── ovstdiag.icd10                            → diagnoses[].icd10
│   └── ovstdiag.diagtype                         → diagnoses[].diagType
│
├── vn_stat (vn)
│   ├── vn_stat.pdx                               → primaryDiagnosis
│   └── vn_stat.dx0 ~ dx5                         → secondaryDiagnoses
│
├── opitemrece (vn → icode, qty, unitprice, income, drugusage)
│   │
│   ├── drugitems (opitemrece.icode = drugitems.icode)
│   │   ├── drugitems.sks_drug_code               → sksDrugCode ⭐ ใหม่
│   │   ├── drugitems.sks_dfs_text                → sksDfsText ⭐ ใหม่
│   │   ├── drugitems.sks_reimb_price             → sksReimbPrice ⭐ ใหม่
│   │   ├── drugitems.tmt_tp_code                 → tmtCode (มีแล้ว)
│   │   ├── drugitems.name                        → description (มีแล้ว)
│   │   └── drugitems.name + strength + units     → dfsText (มีแล้ว)
│   │
│   ├── income (opitemrece.income = income.income)
│   │   └── income.std_group                      → stdGroup ⭐ ใหม่
│   │
│   └── drugusage (opitemrece.drugusage = drugusage.drugusage)
│       └── drugusage.name1 + name2 + name3       → sigText (มีแล้ว)
│
├── rcpt_print (vn)
│   └── rcpt_print.rcpno                          → receiptNo ⭐ ใหม่
│
└── oapp (vn)
    └── oapp.nextdate                             → nextAppointmentDate (มีแล้ว)
```

---

## 3. SQL สำหรับดึงข้อมูล

### 3.1 ดึง Visit พร้อมข้อมูลหลัก

```sql
-- ข้อมูล visit หลัก + แพทย์ + ใบเสร็จ
-- ใช้ subquery สำหรับ rcpt_print และ oapp เพื่อป้องกัน row multiplication
-- (VN หนึ่งอาจมีหลายใบเสร็จ/หลายนัด)
SELECT
    o.vn,
    o.hn,
    DATE_FORMAT(o.vstdate, '%Y-%m-%d')           AS visitDate,
    CONCAT(DATE_FORMAT(o.vstdate, '%Y-%m-%d'), 'T', o.vsttime) AS serviceStartTime,
    d.licenseno                                  AS physicianLicenseNo,
    o.spclty                                     AS clinicCode,
    o.visit_type                                 AS visitType,
    vs.pdx                                       AS primaryDiagnosis,
    CONCAT_WS(',',
        NULLIF(vs.dx0,''), NULLIF(vs.dx1,''), NULLIF(vs.dx2,''),
        NULLIF(vs.dx3,''), NULLIF(vs.dx4,''), NULLIF(vs.dx5,'')
    )                                            AS secondaryDiagnoses,
    rp.rcpno                                     AS receiptNo,
    DATE_FORMAT(oa.nextdate, '%Y-%m-%d')         AS nextAppointmentDate,
    -- serviceClass: map จาก spclty (ปรับ CASE ตาม spclty ของ รพ.)
    CASE o.spclty
        WHEN '10' THEN 'XR'   -- รังสี
        WHEN '19' THEN 'OP'   -- ศัลยกรรม
        WHEN '04' THEN 'LB'   -- ชันสูตร
        ELSE 'EC'              -- ตรวจรักษาทั่วไป
    END                                          AS serviceClass,
    -- dischargeType (⚠️ ตรวจสอบว่า ill_visit ตรง discharge type จริงหรือไม่
    -- บาง HOSxP ใช้ field อื่น เช่น ovst.discharge_type)
    COALESCE(vs.ill_visit, '9')                  AS dischargeType
FROM ovst o
JOIN vn_stat vs ON vs.vn = o.vn
LEFT JOIN doctor d ON d.code = o.doctor
-- subquery: ใบเสร็จล่าสุดที่ไม่ถูกยกเลิก (ป้องกัน row multiplication)
LEFT JOIN (
    SELECT vn, MAX(rcpno) AS rcpno
    FROM rcpt_print
    WHERE status IS NULL OR status = ''
    GROUP BY vn
) rp ON rp.vn = o.vn
-- subquery: นัดครั้งถัดไปที่ยังไม่ผ่าน (ป้องกัน row multiplication)
LEFT JOIN (
    SELECT vn, MIN(nextdate) AS nextdate
    FROM oapp
    WHERE nextdate >= CURDATE()
    GROUP BY vn
) oa ON oa.vn = o.vn
WHERE o.hn = ?
    AND o.vstdate BETWEEN ? AND ?
ORDER BY o.vstdate DESC, o.vsttime DESC;
```

### 3.2 ดึง Diagnoses (structured) — ⭐ ใหม่

```sql
-- diagnoses[] per visit
SELECT
    od.vn,
    REPLACE(od.icd10, '.', '')                   AS icd10,
    od.diagtype                                  AS diagType,
    i.tname                                      AS diagTerm
FROM ovstdiag od
LEFT JOIN icd101 i ON i.code = od.icd10
WHERE od.vn IN (?)   -- list ของ VN ที่ได้จาก query 3.1
ORDER BY od.vn, od.diagtype, od.icd10;
```

### 3.3 ดึง Billing Items พร้อมข้อมูล สกส.

```sql
-- billingItems[] per visit พร้อม SKS fields
SELECT
    opi.vn,
    opi.icode                                    AS hospitalCode,
    opi.icode                                    AS aipnCode,
    -- TMT code (เฉพาะยา)
    di.tmt_tp_code                               AS tmtCode,
    -- ⭐ SKS fields ใหม่
    di.sks_drug_code                             AS sksDrugCode,
    di.sks_dfs_text                              AS sksDfsText,
    di.sks_reimb_price                           AS sksReimbPrice,
    inc.std_group                                AS stdGroup,
    -- STDCode: ใช้ sks_drug_code สำหรับยา, icode สำหรับอื่น
    COALESCE(di.sks_drug_code, opi.icode)        AS stdCode,
    -- Billing group (hospital local)
    opi.income                                   AS billingGroup,
    -- Description
    COALESCE(di.name, ndi.name)                  AS description,
    -- Drug-specific fields
    CONCAT_WS(' ', di.name, di.strength, di.units) AS dfsText,
    CONCAT_WS(' ', du.name1, du.name2, du.name3)   AS sigText,
    -- Quantities & prices
    opi.qty                                      AS quantity,
    opi.unitprice                                AS unitPrice,
    -- ClaimUP: ใช้ sks_reimb_price ถ้ามี, ไม่งั้นใช้ unitprice
    COALESCE(di.sks_reimb_price, opi.unitprice)  AS claimUnitPrice,
    -- ClaimCategory
    'OP1'                                        AS claimCategory,
    -- Optional drug fields
    -- ⚠️ packqty: ตรวจสอบว่า drugitems มี field นี้ใน HOSxP version ของ รพ.
    -- ถ้าไม่มี ให้ลบ หรือใช้ CONCAT(di.strength, ' ', di.units) แทน
    CONCAT_WS(' ', di.packqty, di.units)         AS packsize,
    opi.drugusage                                AS sigCode,
    -- isDrug flag (ช่วยแยกยา/ไม่ใช่ยา)
    CASE WHEN di.icode IS NOT NULL THEN 1 ELSE 0 END AS isDrug
FROM opitemrece opi
LEFT JOIN drugitems di ON di.icode = opi.icode
LEFT JOIN nondrugitems ndi ON ndi.icode = opi.icode
    AND di.icode IS NULL  -- join nondrugitems เฉพาะเมื่อไม่ใช่ยา
LEFT JOIN income inc ON inc.income = opi.income
LEFT JOIN drugusage du ON du.drugusage = opi.drugusage
WHERE opi.vn IN (?)   -- list ของ VN
ORDER BY opi.vn;
```

### 3.4 ดึง Medications (สำหรับ protocol analysis)

```sql
-- medications[] per visit (เฉพาะรายการยา)
SELECT
    opi.vn,
    opi.icode                                    AS hospitalCode,
    di.name                                      AS medicationName,
    opi.qty                                      AS quantity,
    di.units                                     AS unit
FROM opitemrece opi
JOIN drugitems di ON di.icode = opi.icode
WHERE opi.vn IN (?)
ORDER BY opi.vn;
```

---

## 4. Response Format ที่ต้องการ

### 4.1 Visit Object (เพิ่ม/แก้ไขจากปัจจุบัน)

```jsonc
{
  "vn": "681125000097",
  "visitDate": "2025-11-25",
  "serviceStartTime": "2025-11-25T08:30:00",
  "serviceEndTime": "2025-11-25T10:30:00",     // คำนวณหรือเวลาจ่ายยา
  "physicianLicenseNo": "ว54236",               // ✅ มีแล้ว
  "clinicCode": "10",                           // ✅ มีแล้ว
  "primaryDiagnosis": "C119",                   // ✅ มีแล้ว
  "secondaryDiagnoses": "Z510",                 // ✅ มีแล้ว
  // ⭐ ใหม่: diagnoses[] structured
  "diagnoses": [
    { "icd10": "C119", "diagType": "1", "diagTerm": "Malignant neoplasm of nasopharynx" },
    { "icd10": "Z510", "diagType": "2", "diagTerm": "Encounter for antineoplastic radiation therapy" }
  ],
  "hpi": null,
  "doctorNotes": null,
  "receiptNo": "R2568-012345",                  // ⭐ ใหม่
  "visitType": "2",                             // ✅ มีแล้ว
  "dischargeType": "1",                         // ✅ มีแล้ว
  "nextAppointmentDate": "2025-12-11",          // ✅ มีแล้ว
  "serviceClass": "XR",                         // ⚠️ แก้: เดิมส่ง "" → ต้อง map
  "serviceType": "03",                          // ⚠️ แก้: เดิมส่ง "" → ต้อง map
  "medications": [                              // ⚠️ แก้: เดิมว่าง
    { "hospitalCode": "1502262", "medicationName": "CARBOPLATIN 450MG/45ML INJ", "quantity": "1", "unit": "vial" }
  ],
  "billingItems": [
    {
      "hospitalCode": "1502262",
      "aipnCode": "1502262",
      "tmtCode": "1052756000040901",            // ✅ มีแล้ว
      "sksDrugCode": "49304",                   // ⭐ ใหม่: drugitems.sks_drug_code
      "stdCode": "49304",                       // ⚠️ แก้: ใช้ sks_drug_code (เดิมส่ง hospitalCode)
      "billingGroup": "3",                      // ✅ คงเดิม (hospital local)
      "stdGroup": "2",                          // ⭐ ใหม่: income.std_group
      "description": "CARBOPLATIN 450MG/45ML INJ",
      "sksDfsText": "CARBOPLATIN 450 MG/45 ML INJECTION",  // ⭐ ใหม่
      "dfsText": "CARBOPLATIN 450MG/45ML INJ",  // ✅ มีแล้ว
      "sigText": "ฉีดเข้าหลอดเลือดดำ...",        // ✅ มีแล้ว
      "quantity": 1,
      "unitPrice": 2500.00,
      "sksReimbPrice": 2500.00,                 // ⭐ ใหม่: drugitems.sks_reimb_price
      "claimUnitPrice": 2500.00,                // ✅ มีแล้ว
      "claimCategory": "OP1"                    // ✅ มีแล้ว
    }
  ]
}
```

---

## 5. Code ตัวอย่าง

### 5.1 JavaScript (Node.js + mysql2)

```javascript
const express = require('express');
const mysql = require('mysql2/promise');

const app = express();

// สร้าง connection pool
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'hosxp_user',
  password: 'your_password',
  database: 'hosxp',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
});

/**
 * Endpoint 2: GET /api/patients/:hn/visits?from=&to=
 * ดึงข้อมูล visits + billing + diagnoses สำหรับ SSO Cancer Care
 */
async function getPatientVisits(hn, fromDate, toDate) {
  // 1) ข้อมูลผู้ป่วย
  const [patients] = await pool.query(
    `SELECT
       LPAD(p.hn, 9, '0') AS hn,
       p.cid AS citizenId,
       p.pname AS titleName,
       CONCAT(p.pname, p.fname, ' ', p.lname) AS fullName,
       CASE p.sex WHEN '1' THEN 'M' WHEN '2' THEN 'F' ELSE 'U' END AS gender,
       DATE_FORMAT(p.birthday, '%Y-%m-%d') AS dateOfBirth,
       CONCAT_WS(' ', p.addrpart, CONCAT('หมู่ที่ ', p.moopart), p.road) AS address,
       COALESCE(p.mobile_phone_number, p.hometel) AS phoneNumber,
       p.hcode AS mainHospitalCode
     FROM patient p WHERE p.hn = ?`,
    [hn]
  );
  if (!patients.length) {
    return { success: false, error: { code: 'PATIENT_NOT_FOUND', message: `ไม่พบผู้ป่วย HN ${hn}` } };
  }

  // 2) ข้อมูล Visits — ใช้ subquery สำหรับ rcpt_print/oapp (ป้องกัน row multiplication)
  const [visits] = await pool.query(
    `SELECT
       o.vn,
       DATE_FORMAT(o.vstdate, '%Y-%m-%d') AS visitDate,
       CONCAT(DATE_FORMAT(o.vstdate, '%Y-%m-%d'), 'T', o.vsttime) AS serviceStartTime,
       d.licenseno AS physicianLicenseNo,
       o.spclty AS clinicCode,
       vs.pdx AS primaryDiagnosis,
       CONCAT_WS(',',
         NULLIF(vs.dx0,''), NULLIF(vs.dx1,''), NULLIF(vs.dx2,''),
         NULLIF(vs.dx3,''), NULLIF(vs.dx4,''), NULLIF(vs.dx5,'')
       ) AS secondaryDiagnoses,
       rp.rcpno AS receiptNo,
       o.visit_type AS visitType,
       COALESCE(vs.ill_visit, '9') AS dischargeType,
       DATE_FORMAT(oa.nextdate, '%Y-%m-%d') AS nextAppointmentDate,
       CASE o.spclty
         WHEN '10' THEN 'XR' WHEN '19' THEN 'OP'
         WHEN '04' THEN 'LB' ELSE 'EC'
       END AS serviceClass,
       '03' AS serviceType
     FROM ovst o
     JOIN vn_stat vs ON vs.vn = o.vn
     LEFT JOIN doctor d ON d.code = o.doctor
     LEFT JOIN (
       SELECT vn, MAX(rcpno) AS rcpno
       FROM rcpt_print WHERE status IS NULL OR status = ''
       GROUP BY vn
     ) rp ON rp.vn = o.vn
     LEFT JOIN (
       SELECT vn, MIN(nextdate) AS nextdate
       FROM oapp WHERE nextdate >= CURDATE()
       GROUP BY vn
     ) oa ON oa.vn = o.vn
     WHERE o.hn = ? AND o.vstdate BETWEEN ? AND ?
     ORDER BY o.vstdate DESC, o.vsttime DESC`,
    [hn, fromDate || '2000-01-01', toDate || new Date().toISOString().slice(0, 10)]
  );

  if (!visits.length) {
    return { success: true, data: { patient: patients[0], visits: [] } };
  }

  const vnList = visits.map((v) => v.vn);

  // 3) Diagnoses — ⭐ ใหม่
  const [diagRows] = await pool.query(
    `SELECT
       od.vn,
       REPLACE(od.icd10, '.', '') AS icd10,
       od.diagtype AS diagType,
       COALESCE(i.tname, '') AS diagTerm
     FROM ovstdiag od
     LEFT JOIN icd101 i ON i.code = od.icd10
     WHERE od.vn IN (?)
     ORDER BY od.vn, od.diagtype, od.icd10`,
    [vnList]
  );

  // 4) Billing Items พร้อม SKS fields — ⭐ ใหม่
  const [billingRows] = await pool.query(
    `SELECT
       opi.vn,
       opi.icode AS hospitalCode,
       opi.icode AS aipnCode,
       di.tmt_tp_code AS tmtCode,
       di.sks_drug_code AS sksDrugCode,
       di.sks_dfs_text AS sksDfsText,
       di.sks_reimb_price AS sksReimbPrice,
       inc.std_group AS stdGroup,
       COALESCE(di.sks_drug_code, opi.icode) AS stdCode,
       opi.income AS billingGroup,
       COALESCE(di.name, ndi.name) AS description,
       CASE WHEN di.icode IS NOT NULL
         THEN CONCAT_WS(' ', di.name, di.strength, di.units)
         ELSE NULL
       END AS dfsText,
       CASE WHEN du.drugusage IS NOT NULL
         THEN CONCAT_WS(' ', du.name1, du.name2, du.name3)
         ELSE NULL
       END AS sigText,
       opi.qty AS quantity,
       opi.unitprice AS unitPrice,
       COALESCE(di.sks_reimb_price, opi.unitprice) AS claimUnitPrice,
       'OP1' AS claimCategory,
       CASE WHEN di.icode IS NOT NULL
         THEN CONCAT_WS(' ', di.packqty, di.units)
         ELSE NULL
       END AS packsize,
       opi.drugusage AS sigCode,
       CASE WHEN di.icode IS NOT NULL THEN 1 ELSE 0 END AS isDrug
     FROM opitemrece opi
     LEFT JOIN drugitems di ON di.icode = opi.icode
     LEFT JOIN nondrugitems ndi ON ndi.icode = opi.icode AND di.icode IS NULL
     LEFT JOIN income inc ON inc.income = opi.income
     LEFT JOIN drugusage du ON du.drugusage = opi.drugusage
     WHERE opi.vn IN (?)
     ORDER BY opi.vn`,
    [vnList]
  );

  // 5) Medications (เฉพาะยา) — ⚠️ แก้ไข: เดิมว่าง
  const [medRows] = await pool.query(
    `SELECT
       opi.vn,
       opi.icode AS hospitalCode,
       COALESCE(di.name, '') AS medicationName,
       CAST(opi.qty AS CHAR) AS quantity,
       COALESCE(di.units, '') AS unit
     FROM opitemrece opi
     JOIN drugitems di ON di.icode = opi.icode
     WHERE opi.vn IN (?)
     ORDER BY opi.vn`,
    [vnList]
  );

  // 6) ประกอบ response
  const diagMap = groupBy(diagRows, 'vn');
  const billingMap = groupBy(billingRows, 'vn');
  const medMap = groupBy(medRows, 'vn');

  const result = visits.map((v) => ({
    vn: v.vn,
    visitDate: v.visitDate,
    serviceStartTime: v.serviceStartTime,
    serviceEndTime: v.serviceStartTime, // ถ้าไม่มีเวลาสิ้นสุด ใช้เวลาเริ่ม
    physicianLicenseNo: v.physicianLicenseNo || '',
    clinicCode: v.clinicCode || '99',
    primaryDiagnosis: v.primaryDiagnosis || '',
    secondaryDiagnoses: v.secondaryDiagnoses || '',
    diagnoses: (diagMap[v.vn] || []).map((d) => ({
      icd10: d.icd10,
      diagType: d.diagType,
      diagTerm: d.diagTerm || '',
    })),
    hpi: null,
    doctorNotes: null,
    receiptNo: v.receiptNo || null,
    visitType: v.visitType || '9',
    dischargeType: v.dischargeType || '9',
    nextAppointmentDate: v.nextAppointmentDate || null,
    serviceClass: v.serviceClass || 'EC',
    serviceType: v.serviceType || '03',
    prescriptionTime: null,
    medications: (medMap[v.vn] || []).map((m) => ({
      hospitalCode: m.hospitalCode,
      medicationName: m.medicationName,
      quantity: m.quantity,
      unit: m.unit || '',
    })),
    billingItems: (billingMap[v.vn] || []).map((b) => ({
      hospitalCode: b.hospitalCode,
      aipnCode: b.aipnCode,
      tmtCode: b.tmtCode || null,
      sksDrugCode: b.sksDrugCode || null,
      stdCode: b.stdCode || b.hospitalCode,
      billingGroup: b.billingGroup || '',
      stdGroup: b.stdGroup || null,
      description: b.description || '',
      sksDfsText: b.sksDfsText || null,
      dfsText: b.dfsText || null,
      packsize: b.packsize || null,
      sigCode: b.sigCode || null,
      sigText: b.sigText || null,
      supplyDuration: null,
      quantity: Number(b.quantity) || 0,
      unitPrice: Number(b.unitPrice) || 0,
      sksReimbPrice: b.sksReimbPrice != null ? Number(b.sksReimbPrice) : null,
      claimUnitPrice: Number(b.claimUnitPrice) || 0,
      claimCategory: b.claimCategory,
    })),
  }));

  return { success: true, data: { patient: patients[0], visits: result } };
}

/** Group array by key */
function groupBy(arr, key) {
  return arr.reduce((map, item) => {
    const k = item[key];
    (map[k] = map[k] || []).push(item);
    return map;
  }, {});
}

// ---- Express Route ----

app.get('/api/patients/:hn/visits', async (req, res) => {
  try {
    const { hn } = req.params;
    const { from, to } = req.query;
    const result = await getPatientVisits(hn, from, to);
    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (err) {
    console.error('getPatientVisits error:', err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'ข้อผิดพลาดภายใน HIS' },
    });
  }
});

app.listen(8080, () => console.log('HIS API listening on :8080'));
```

### 5.2 Golang (Gin + database/sql)

```go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
)

// ---- Data Structures ----

type Patient struct {
	HN               string `json:"hn"`
	CitizenID        string `json:"citizenId"`
	TitleName        string `json:"titleName"`
	FullName         string `json:"fullName"`
	Gender           string `json:"gender"`
	DateOfBirth      string `json:"dateOfBirth"`
	Address          string `json:"address"`
	PhoneNumber      string `json:"phoneNumber"`
	MainHospitalCode string `json:"mainHospitalCode"`
}

type Diagnosis struct {
	ICD10    string `json:"icd10"`
	DiagType string `json:"diagType"`
	DiagTerm string `json:"diagTerm"`
}

type Medication struct {
	HospitalCode   string `json:"hospitalCode"`
	MedicationName string `json:"medicationName"`
	Quantity       string `json:"quantity"`
	Unit           string `json:"unit"`
}

type BillingItem struct {
	HospitalCode   string   `json:"hospitalCode"`
	AipnCode       string   `json:"aipnCode"`
	TmtCode        *string  `json:"tmtCode"`
	SksDrugCode    *string  `json:"sksDrugCode"`
	StdCode        string   `json:"stdCode"`
	BillingGroup   string   `json:"billingGroup"`
	StdGroup       *string  `json:"stdGroup"`
	Description    string   `json:"description"`
	SksDfsText     *string  `json:"sksDfsText"`
	DfsText        *string  `json:"dfsText"`
	SigText        *string  `json:"sigText"`
	Packsize       *string  `json:"packsize"`
	SigCode        *string  `json:"sigCode"`
	SupplyDuration *string  `json:"supplyDuration"`
	Quantity       float64  `json:"quantity"`
	UnitPrice      float64  `json:"unitPrice"`
	SksReimbPrice  *float64 `json:"sksReimbPrice"`
	ClaimUnitPrice float64  `json:"claimUnitPrice"`
	ClaimCategory  string   `json:"claimCategory"`
}

// หมายเหตุ: *string / *float64 ใช้ได้กับ go-sql-driver/mysql ซึ่ง scan NULL → nil
// ถ้าใช้ driver อื่น อาจต้องเปลี่ยนเป็น sql.NullString / sql.NullFloat64

type Visit struct {
	VN                  string        `json:"vn"`
	VisitDate           string        `json:"visitDate"`
	ServiceStartTime    string        `json:"serviceStartTime"`
	ServiceEndTime      string        `json:"serviceEndTime"`
	PhysicianLicenseNo  string        `json:"physicianLicenseNo"`
	ClinicCode          string        `json:"clinicCode"`
	PrimaryDiagnosis    string        `json:"primaryDiagnosis"`
	SecondaryDiagnoses  string        `json:"secondaryDiagnoses"`
	Diagnoses           []Diagnosis   `json:"diagnoses"`
	HPI                 *string       `json:"hpi"`
	DoctorNotes         *string       `json:"doctorNotes"`
	ReceiptNo           *string       `json:"receiptNo"`
	VisitType           string        `json:"visitType"`
	DischargeType       string        `json:"dischargeType"`
	NextAppointmentDate *string       `json:"nextAppointmentDate"`
	ServiceClass        string        `json:"serviceClass"`
	ServiceType         string        `json:"serviceType"`
	PrescriptionTime    *string       `json:"prescriptionTime"`
	Medications         []Medication  `json:"medications"`
	BillingItems        []BillingItem `json:"billingItems"`
}

// ---- Handler ----

func getPatientVisits(c *gin.Context, db *sql.DB) {
	hn := c.Param("hn")
	fromDate := c.DefaultQuery("from", "2000-01-01")
	toDate := c.DefaultQuery("to", time.Now().Format("2006-01-02"))

	// 1) Patient
	patient, err := queryPatient(db, hn)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   gin.H{"code": "PATIENT_NOT_FOUND", "message": fmt.Sprintf("ไม่พบผู้ป่วย HN %s", hn)},
		})
		return
	}

	// 2) Visits
	visits, vnList, err := queryVisits(db, hn, fromDate, toDate)
	if err != nil || len(vnList) == 0 {
		c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"patient": patient, "visits": []Visit{}}})
		return
	}

	// 3) Diagnoses
	diagMap := queryDiagnoses(db, vnList)

	// 4) Billing Items
	billingMap := queryBillingItems(db, vnList)

	// 5) Medications
	medMap := queryMedications(db, vnList)

	// 6) Assemble
	for i := range visits {
		vn := visits[i].VN
		visits[i].Diagnoses = diagMap[vn]
		visits[i].BillingItems = billingMap[vn]
		visits[i].Medications = medMap[vn]
		if visits[i].Diagnoses == nil {
			visits[i].Diagnoses = []Diagnosis{}
		}
		if visits[i].BillingItems == nil {
			visits[i].BillingItems = []BillingItem{}
		}
		if visits[i].Medications == nil {
			visits[i].Medications = []Medication{}
		}
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"patient": patient, "visits": visits}})
}

// ---- Query Functions ----

func queryPatient(db *sql.DB, hn string) (*Patient, error) {
	p := &Patient{}
	err := db.QueryRow(`
		SELECT
			LPAD(p.hn, 9, '0'),
			COALESCE(p.cid, ''),
			COALESCE(p.pname, ''),
			CONCAT(COALESCE(p.pname,''), COALESCE(p.fname,''), ' ', COALESCE(p.lname,'')),
			CASE p.sex WHEN '1' THEN 'M' WHEN '2' THEN 'F' ELSE 'U' END,
			COALESCE(DATE_FORMAT(p.birthday, '%Y-%m-%d'), ''),
			COALESCE(CONCAT_WS(' ', p.addrpart, CONCAT('หมู่ที่ ', p.moopart), p.road), ''),
			COALESCE(p.mobile_phone_number, p.hometel, ''),
			COALESCE(p.hcode, '')
		FROM patient p WHERE p.hn = ?`, hn,
	).Scan(&p.HN, &p.CitizenID, &p.TitleName, &p.FullName, &p.Gender,
		&p.DateOfBirth, &p.Address, &p.PhoneNumber, &p.MainHospitalCode)
	if err != nil {
		return nil, err
	}
	return p, nil
}

func queryVisits(db *sql.DB, hn, fromDate, toDate string) ([]Visit, []string, error) {
	// ใช้ subquery สำหรับ rcpt_print/oapp (ป้องกัน row multiplication)
	rows, err := db.Query(`
		SELECT
			o.vn,
			DATE_FORMAT(o.vstdate, '%Y-%m-%d'),
			CONCAT(DATE_FORMAT(o.vstdate, '%Y-%m-%d'), 'T', o.vsttime),
			COALESCE(d.licenseno, ''),
			COALESCE(o.spclty, '99'),
			COALESCE(vs.pdx, ''),
			COALESCE(CONCAT_WS(',',
				NULLIF(vs.dx0,''), NULLIF(vs.dx1,''), NULLIF(vs.dx2,''),
				NULLIF(vs.dx3,''), NULLIF(vs.dx4,''), NULLIF(vs.dx5,'')), ''),
			rp.rcpno,
			COALESCE(o.visit_type, '9'),
			COALESCE(vs.ill_visit, '9'),
			DATE_FORMAT(oa.nextdate, '%Y-%m-%d'),
			CASE o.spclty
				WHEN '10' THEN 'XR' WHEN '19' THEN 'OP'
				WHEN '04' THEN 'LB' ELSE 'EC'
			END
		FROM ovst o
		JOIN vn_stat vs ON vs.vn = o.vn
		LEFT JOIN doctor d ON d.code = o.doctor
		LEFT JOIN (
			SELECT vn, MAX(rcpno) AS rcpno
			FROM rcpt_print WHERE status IS NULL OR status = ''
			GROUP BY vn
		) rp ON rp.vn = o.vn
		LEFT JOIN (
			SELECT vn, MIN(nextdate) AS nextdate
			FROM oapp WHERE nextdate >= CURDATE()
			GROUP BY vn
		) oa ON oa.vn = o.vn
		WHERE o.hn = ? AND o.vstdate BETWEEN ? AND ?
		ORDER BY o.vstdate DESC, o.vsttime DESC`,
		hn, fromDate, toDate)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	var visits []Visit
	var vnList []string
	for rows.Next() {
		v := Visit{ServiceType: "03"}
		if err := rows.Scan(&v.VN, &v.VisitDate, &v.ServiceStartTime,
			&v.PhysicianLicenseNo, &v.ClinicCode, &v.PrimaryDiagnosis,
			&v.SecondaryDiagnoses, &v.ReceiptNo, &v.VisitType,
			&v.DischargeType, &v.NextAppointmentDate, &v.ServiceClass); err != nil {
			log.Printf("queryVisits scan error: %v", err)
			continue
		}
		v.ServiceEndTime = v.ServiceStartTime
		visits = append(visits, v)
		vnList = append(vnList, v.VN)
	}
	if err := rows.Err(); err != nil {
		log.Printf("queryVisits iteration error: %v", err)
	}
	return visits, vnList, nil
}

func queryDiagnoses(db *sql.DB, vnList []string) map[string][]Diagnosis {
	placeholder := makePlaceholders(len(vnList))
	args := toAnySlice(vnList)

	rows, err := db.Query(fmt.Sprintf(`
		SELECT od.vn, REPLACE(od.icd10, '.', ''), od.diagtype, COALESCE(i.tname, '')
		FROM ovstdiag od
		LEFT JOIN icd101 i ON i.code = od.icd10
		WHERE od.vn IN (%s)
		ORDER BY od.vn, od.diagtype, od.icd10`, placeholder), args...)
	if err != nil {
		return map[string][]Diagnosis{}
	}
	defer rows.Close()

	result := make(map[string][]Diagnosis)
	for rows.Next() {
		var vn string
		d := Diagnosis{}
		if err := rows.Scan(&vn, &d.ICD10, &d.DiagType, &d.DiagTerm); err != nil {
			log.Printf("queryDiagnoses scan error: %v", err)
			continue
		}
		result[vn] = append(result[vn], d)
	}
	if err := rows.Err(); err != nil {
		log.Printf("queryDiagnoses iteration error: %v", err)
	}
	return result
}

func queryBillingItems(db *sql.DB, vnList []string) map[string][]BillingItem {
	placeholder := makePlaceholders(len(vnList))
	args := toAnySlice(vnList)

	rows, err := db.Query(fmt.Sprintf(`
		SELECT
			opi.vn, opi.icode, opi.icode,
			di.tmt_tp_code, di.sks_drug_code, di.sks_dfs_text,
			di.sks_reimb_price, inc.std_group,
			COALESCE(di.sks_drug_code, opi.icode),
			opi.income,
			COALESCE(di.name, ndi.name, ''),
			CASE WHEN di.icode IS NOT NULL
				THEN CONCAT_WS(' ', di.name, di.strength, di.units)
				ELSE NULL END,
			CASE WHEN du.drugusage IS NOT NULL
				THEN CONCAT_WS(' ', du.name1, du.name2, du.name3)
				ELSE NULL END,
			opi.qty, opi.unitprice,
			COALESCE(di.sks_reimb_price, opi.unitprice),
			'OP1',
			CASE WHEN di.icode IS NOT NULL
				THEN CONCAT_WS(' ', di.packqty, di.units)
				ELSE NULL END,
			opi.drugusage
		FROM opitemrece opi
		LEFT JOIN drugitems di ON di.icode = opi.icode
		LEFT JOIN nondrugitems ndi ON ndi.icode = opi.icode AND di.icode IS NULL
		LEFT JOIN income inc ON inc.income = opi.income
		LEFT JOIN drugusage du ON du.drugusage = opi.drugusage
		WHERE opi.vn IN (%s)
		ORDER BY opi.vn`, placeholder), args...)
	if err != nil {
		return map[string][]BillingItem{}
	}
	defer rows.Close()

	result := make(map[string][]BillingItem)
	for rows.Next() {
		var vn string
		b := BillingItem{}
		if err := rows.Scan(&vn, &b.HospitalCode, &b.AipnCode,
			&b.TmtCode, &b.SksDrugCode, &b.SksDfsText,
			&b.SksReimbPrice, &b.StdGroup,
			&b.StdCode, &b.BillingGroup, &b.Description,
			&b.DfsText, &b.SigText,
			&b.Quantity, &b.UnitPrice, &b.ClaimUnitPrice,
			&b.ClaimCategory, &b.Packsize, &b.SigCode); err != nil {
			log.Printf("queryBillingItems scan error: %v", err)
			continue
		}
		result[vn] = append(result[vn], b)
	}
	if err := rows.Err(); err != nil {
		log.Printf("queryBillingItems iteration error: %v", err)
	}
	return result
}

func queryMedications(db *sql.DB, vnList []string) map[string][]Medication {
	placeholder := makePlaceholders(len(vnList))
	args := toAnySlice(vnList)

	rows, err := db.Query(fmt.Sprintf(`
		SELECT opi.vn, opi.icode, COALESCE(di.name, ''), CAST(opi.qty AS CHAR), COALESCE(di.units, '')
		FROM opitemrece opi
		JOIN drugitems di ON di.icode = opi.icode
		WHERE opi.vn IN (%s)
		ORDER BY opi.vn`, placeholder), args...)
	if err != nil {
		return map[string][]Medication{}
	}
	defer rows.Close()

	result := make(map[string][]Medication)
	for rows.Next() {
		var vn string
		m := Medication{}
		if err := rows.Scan(&vn, &m.HospitalCode, &m.MedicationName, &m.Quantity, &m.Unit); err != nil {
			log.Printf("queryMedications scan error: %v", err)
			continue
		}
		result[vn] = append(result[vn], m)
	}
	if err := rows.Err(); err != nil {
		log.Printf("queryMedications iteration error: %v", err)
	}
	return result
}

// ---- Helpers ----

func makePlaceholders(n int) string {
	ph := make([]string, n)
	for i := range ph {
		ph[i] = "?"
	}
	return strings.Join(ph, ",")
}

func toAnySlice(ss []string) []any {
	args := make([]any, len(ss))
	for i, s := range ss {
		args[i] = s
	}
	return args
}

// ---- Router ----

func main() {
	db, err := sql.Open("mysql", "user:pass@tcp(127.0.0.1:3306)/hosxp?charset=utf8mb4&parseTime=true")
	if err != nil {
		log.Fatalf("sql.Open: %v", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatalf("db.Ping: %v", err)
	}
	defer db.Close()

	r := gin.Default()
	r.GET("/api/patients/:hn/visits", func(c *gin.Context) {
		getPatientVisits(c, db)
	})
	log.Fatal(r.Run(":8080"))
}
```

---

## 6. Checklist สำหรับทีม HIS

| # | สิ่งที่ต้องทำ | ความสำคัญ | ตาราง HOSxP |
|---|-------------|-----------|-------------|
| ✅ | `physicianLicenseNo` — ส่งอยู่แล้ว | — | `doctor.licenseno` |
| ✅ | `clinicCode` — ส่งอยู่แล้ว | — | `ovst.spclty` |
| ✅ | `visitType`, `dischargeType` — ส่งอยู่แล้ว | — | `ovst.visit_type` |
| 1 | เพิ่ม `diagnoses[]` array | 🔴 สูง | `ovstdiag` join `vn` |
| 2 | เพิ่ม `sksDrugCode` ใน billingItems | 🟠 สูง-กลาง | `drugitems.sks_drug_code` |
| 3 | เพิ่ม `stdGroup` ใน billingItems | 🟠 สูง-กลาง | `income.std_group` |
| 4 | เพิ่ม `sksDfsText` ใน billingItems | 🟠 สูง-กลาง | `drugitems.sks_dfs_text` |
| 5 | เพิ่ม `sksReimbPrice` ใน billingItems | 🟠 สูง-กลาง | `drugitems.sks_reimb_price` |
| 6 | เพิ่ม `receiptNo` ใน visit | 🟡 กลาง | `rcpt_print.rcpno` |
| 7 | แก้ `stdCode` — ยา: ใช้ `sks_drug_code` | 🟠 สูง-กลาง | `drugitems.sks_drug_code` |
| 8 | แก้ `serviceClass` — map จาก `spclty` | 🟡 กลาง | `ovst.spclty` |
| 9 | แก้ `medications[]` — populate จาก billing ยา | 🟡 กลาง | `opitemrece` + `drugitems` |

---

## 7. หมายเหตุ

- **`nondrugitems` table** ไม่อยู่ใน spreadsheet แต่ใช้ join กับ `opitemrece.icode` สำหรับรายการที่ไม่ใช่ยา — ถ้า HOSxP มีตาราง `nondrugitems` ให้ join เพิ่ม
- **`serviceClass` mapping** ตัวอย่าง CASE statement อาจต้องปรับตาม `spclty` code จริงของ รพ. — ถ้ามีตาราง `spclty` สามารถ map ได้ตรงกว่า
- **`rcpt_print` อาจมีหลาย record ต่อ VN** — SQL ใช้ subquery `MAX(rcpno) GROUP BY vn` เพื่อป้องกัน row multiplication
- **`oapp` อาจมีหลาย appointment ต่อ VN** — SQL ใช้ subquery `MIN(nextdate) WHERE nextdate >= CURDATE() GROUP BY vn` เพื่อเอานัดถัดไปที่ยังไม่ผ่าน
- **`rcpt_print.status`** — บาง HOSxP version ใช้ `NULL` สำหรับ active, บางรุ่นใช้ `''` (empty string) — SQL เช็คทั้งสองกรณี
- **`vn_stat.ill_visit`** ใช้เป็น `dischargeType` — ตรวจสอบว่า HOSxP ของ รพ. ใช้ field นี้จริงหรือไม่ (บางรุ่นใช้ `ovst.discharge_type`)
- **`drugitems.packqty`** — field นี้อาจไม่มีทุก HOSxP version, ถ้าไม่มีให้ลบหรือใช้ `CONCAT(di.strength, ' ', di.units)` แทน
- **`icd101.tname`** — ชื่อวินิจฉัยภาษาไทย, ตรวจสอบว่าตาราง ICD-10 ของ รพ. ใช้ `tname` หรือ `name`
- **Go code: `*string`/`*float64`** — รองรับ NULL scanning เฉพาะ `go-sql-driver/mysql`, ถ้าใช้ driver อื่นให้เปลี่ยนเป็น `sql.NullString`/`sql.NullFloat64`
- ข้อมูลเพิ่มเติมดูที่ `docs/HIS_API_REQUEST.md` (spec ฉบับเต็ม)
