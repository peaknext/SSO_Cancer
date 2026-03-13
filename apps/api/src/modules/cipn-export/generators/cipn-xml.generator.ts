import type {
  CipnAdmissionData,
  IpadtRecord,
  IpdxRecord,
  IpOpRecord,
  CipnBillItemRecord,
} from '../types/cipn.types';
import {
  calculateMd5,
  formatDate,
  formatDateTime,
  formatAmount,
} from '../../ssop-export/generators/encoding';

// ─── XML helpers ────────────────────────────────────────────────────────────

/** Escape XML special characters */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Replace pipe characters in text fields (pipes are the field delimiter) */
function escapePipe(str: string): string {
  return str.replace(/\|/g, ' ');
}

/** Strip dots from ICD codes (C11.9 → C119) */
function stripDots(code: string): string {
  return code.replace(/\./g, '');
}

/**
 * Combine a date string (YYYY-MM-DD) and optional time string (HH:mm:ss)
 * into an ISO datetime string (YYYY-MM-DDTHH:mm:ss).
 */
function combineDateAndTime(
  dateStr: string | null,
  timeStr: string | null,
  fallbackDate?: Date,
): string {
  if (!dateStr && fallbackDate) {
    return formatDateTime(fallbackDate);
  }
  if (!dateStr) return '';
  const date = dateStr.substring(0, 10); // YYYY-MM-DD
  const time = timeStr || '00:00:00';
  return `${date}T${time}`;
}

/**
 * Normalize billing group for CSMBS claim system.
 * Strips leading zero ('03' → '3'), then pads to 2 digits ('3' → '3').
 * If stdGroup is provided, use it; otherwise map from hospital billingGroup.
 */
function normalizeBillGrCS(
  stdGroup: string | null | undefined,
  billingGroup: string,
): string {
  const raw = stdGroup || billingGroup;
  // Strip leading zeros, then keep as-is (CSMBS uses 1-17, 88, 90, 91)
  const num = parseInt(raw, 10);
  if (isNaN(num)) return raw;
  return num.toString();
}

// ─── IPADT record builder ───────────────────────────────────────────────────

/** Build the 22-field IPADT record from admission data */
export function buildIpadtRecord(admission: CipnAdmissionData): IpadtRecord {
  // F1: AN — pad to at least 7 digits with leading zeros
  const an = admission.an.padStart(7, '0');

  // F15: DTAdm — combine admitDate + admitTime, fallback to visitDate
  const dtAdm = combineDateAndTime(
    admission.admitDate,
    admission.admitTime,
    admission.visitDate,
  );

  // F16: DTDisch — combine dischargeDate + dischargeTime, fallback to admitDate → visitDate
  let dtDisch = '';
  if (admission.dischargeDate) {
    dtDisch = combineDateAndTime(
      admission.dischargeDate instanceof Date
        ? formatDate(admission.dischargeDate)
        : (admission.dischargeDate as string),
      admission.dischargeTime,
    );
  } else if (admission.admitDate) {
    dtDisch = combineDateAndTime(admission.admitDate, admission.admitTime);
  } else {
    dtDisch = formatDateTime(admission.visitDate);
  }

  return {
    an,
    hn: admission.patientHn,
    idType: '0',
    pidPat: admission.patientCitizenId,
    title: admission.patientTitle || '',
    namePat: admission.patientFullName,
    dob: admission.patientDob ? formatDate(admission.patientDob) : '',
    sex: admission.patientSex || '9',
    marriage: admission.patientMaritalStatus || '4',
    changwat: admission.patientProvince || '',
    amphur: admission.patientDistrict || '',
    nation: admission.patientNationality || '99',
    admType: admission.admissionType || 'O',
    admSource: admission.admissionSource || 'O',
    dtAdm,
    dtDisch,
    leaveDay: admission.leaveDay?.toString() || '0',
    dischStat: admission.dischargeStatus || '2',
    dischType: admission.dischargeType || '1',
    admWt: admission.birthWeight != null ? admission.birthWeight.toFixed(3) : '',
    dischWard: admission.ward || '',
    dept: admission.department || '12',
  };
}

// ─── IPDx record builder ────────────────────────────────────────────────────

/** Build diagnosis records from admission diagnoses or fallback to primaryDiagnosis */
export function buildIpdxRecords(admission: CipnAdmissionData): IpdxRecord[] {
  const records: IpdxRecord[] = [];

  if (admission.diagnoses.length > 0) {
    for (const diag of admission.diagnoses) {
      records.push({
        sequence: diag.sequence,
        dxType: diag.diagType,
        codeSys: diag.codeSys || 'ICD-10',
        code: stripDots(diag.diagCode),
        diagTerm: diag.diagTerm || '',
        dr: diag.doctorLicense || admission.physicianLicenseNo || '',
        dateDiag: diag.diagDate ? formatDate(diag.diagDate) : '',
      });
    }
  } else {
    // Fallback: create 1 record from primaryDiagnosis
    records.push({
      sequence: 1,
      dxType: '1',
      codeSys: 'ICD-10',
      code: stripDots(admission.primaryDiagnosis),
      diagTerm: '',
      dr: admission.physicianLicenseNo || '',
      dateDiag: '',
    });
  }

  return records;
}

// ─── IPOp record builder ────────────────────────────────────────────────────

/** Build procedure records from admission procedures */
export function buildIpOpRecords(admission: CipnAdmissionData): IpOpRecord[] {
  return admission.procedures.map((proc) => {
    const dateIn = combineDateAndTime(
      proc.startDate ? formatDate(proc.startDate) : null,
      proc.startTime,
      admission.visitDate,
    );
    const dateOut = combineDateAndTime(
      proc.endDate ? formatDate(proc.endDate) : null,
      proc.endTime,
    );

    return {
      sequence: proc.sequence,
      codeSys: proc.codeSys || 'ICD9CM',
      code: proc.procedureCode,
      procTerm: proc.procedureTerm || '',
      dr: proc.doctorLicense || admission.physicianLicenseNo || '',
      dateIn,
      dateOut: dateOut || dateIn,
      location: proc.location || '',
    };
  });
}

// ─── BillItem record builder ────────────────────────────────────────────────

/** Build billing item records. 20 pipe-delimited fields each. */
export function buildBillItemRecords(
  admission: CipnAdmissionData,
  _diagRecords: IpdxRecord[],
  _procRecords: IpOpRecord[],
): CipnBillItemRecord[] {
  return admission.billingItems.map((item, index) => {
    const qty = item.quantity;
    const unitPrice = item.unitPrice;
    const chargeAmt = qty * unitPrice;
    const discount = item.discount || 0;
    const claimUP = Math.min(unitPrice, item.claimUnitPrice) || 0;
    const claimAmt = qty * claimUP;

    // F6: qty — integer if whole number, otherwise 2 decimals
    const qtyStr = Number.isInteger(qty) ? qty.toString() : formatAmount(qty);

    // F2: servDate
    const servDate = item.serviceDate
      ? formatDateTime(item.serviceDate)
      : formatDateTime(admission.visitDate);

    return {
      sequence: index + 1,
      servDate,
      billGr: item.billingGroup,
      lcCode: item.hospitalCode,
      descript: escapePipe(item.description),
      qty: qtyStr,
      unitPrice: formatAmount(unitPrice),
      chargeAmt: formatAmount(chargeAmt),
      discount: formatAmount(discount),
      procedureSeq: '0',
      diagnosisSeq: '1',
      claimSys: 'SS',
      billGrCS: normalizeBillGrCS(item.stdGroup, item.billingGroup),
      csCode: item.sksDrugCode || item.aipnCode || '',
      codeSys: item.sksDrugCode ? 'TMT' : '',
      stdCode: item.sksDrugCode || item.tmtCode || '',
      claimCat: 'T',
      dateRev: '',
      claimUP: formatAmount(claimUP),
      claimAmt: formatAmount(claimAmt),
    };
  });
}

// ─── Serialization helpers ──────────────────────────────────────────────────

function serializeIpadt(r: IpadtRecord): string {
  return [
    r.an, r.hn, r.idType, r.pidPat, r.title, r.namePat, r.dob, r.sex,
    r.marriage, r.changwat, r.amphur, r.nation, r.admType, r.admSource,
    r.dtAdm, r.dtDisch, r.leaveDay, r.dischStat, r.dischType, r.admWt,
    r.dischWard, r.dept,
  ].join('|');
}

function serializeIpdx(r: IpdxRecord): string {
  return [
    r.sequence, r.dxType, r.codeSys, r.code, r.diagTerm, r.dr, r.dateDiag,
  ].join('|');
}

function serializeIpOp(r: IpOpRecord): string {
  return [
    r.sequence, r.codeSys, r.code, r.procTerm, r.dr, r.dateIn, r.dateOut,
    r.location,
  ].join('|');
}

function serializeBillItem(r: CipnBillItemRecord): string {
  return [
    r.sequence, r.servDate, r.billGr, r.lcCode, r.descript, r.qty,
    r.unitPrice, r.chargeAmt, r.discount, r.procedureSeq, r.diagnosisSeq,
    r.claimSys, r.billGrCS, r.csCode, r.codeSys, r.stdCode, r.claimCat,
    r.dateRev, r.claimUP, r.claimAmt,
  ].join('|');
}

// ─── Main XML generator ────────────────────────────────────────────────────

/**
 * Generate a complete CIPN XML document for a single admission.
 *
 * @param admission - Enriched admission data
 * @param hcode - Hospital 5-digit code
 * @param hname - Hospital name
 * @returns Complete XML string with MD5 HMAC footer
 */
export function generateCipnXml(
  admission: CipnAdmissionData,
  hcode: string,
  hname: string,
): string {
  // Build all records
  const ipadtRecord = buildIpadtRecord(admission);
  const ipdxRecords = buildIpdxRecords(admission);
  const ipOpRecords = buildIpOpRecords(admission);
  const billItemRecords = buildBillItemRecords(admission, ipdxRecords, ipOpRecords);

  // Serialize records as pipe-delimited strings
  const ipadtLine = serializeIpadt(ipadtRecord);
  const ipdxLines = ipdxRecords.map(serializeIpdx).join('\r\n');
  const ipOpLines = ipOpRecords.map(serializeIpOp).join('\r\n');
  const billItemLines = billItemRecords.map(serializeBillItem).join('\r\n');

  // Calculate DRGCharge (sum of claimCat='D' items) and XDRGClaim (sum of claimCat='T' items)
  let drgCharge = 0;
  let xdrgClaim = 0;
  for (const item of billItemRecords) {
    const amt = parseFloat(item.claimAmt);
    if (item.claimCat === 'D') {
      drgCharge += amt;
    } else if (item.claimCat === 'T') {
      xdrgClaim += amt;
    }
  }

  // Effective time (now in ISO format)
  const effectiveTime = formatDateTime(new Date());

  // Auth code and date
  const authCode = admission.authCode || 'SSOCAC';
  const authDT = admission.authDate
    ? formatDateTime(admission.authDate)
    : effectiveTime;

  // Invoice datetime — use admitDate or visitDate
  const invDT = admission.admitDate
    ? combineDateAndTime(admission.admitDate, admission.admitTime, admission.visitDate)
    : formatDateTime(admission.visitDate);

  // Build the CIPN XML body (from <CIPN to </CIPN>\r\n — this is the MD5 scope)
  const cipnBody = [
    `<CIPN submissionType = "N">`,
    `<Header>`,
    `<DocClass>IPClaim</DocClass>`,
    `<DocSysID version="2.0">CIPN</DocSysID>`,
    `<serviceEvent>ADT</serviceEvent>`,
    `<authorID>${escapeXml(hcode)}</authorID>`,
    `<authorName>${escapeXml(hname)}</authorName>`,
    `<effectiveTime>${effectiveTime}</effectiveTime>`,
    `</Header>`,
    `<ClaimAuth>`,
    `<AuthCode>${escapeXml(authCode)}</AuthCode>`,
    `<AuthDT>${authDT}</AuthDT>`,
    `<UPayPlan>80</UPayPlan>`,
    `<ServiceType>IP</ServiceType>`,
    `<ProjectCode />`,
    `<EventCode />`,
    `</ClaimAuth>`,
    `<IPADT>`,
    ipadtLine,
    `</IPADT>`,
    `<IPDx Reccount="${ipdxRecords.length}">`,
    ipdxLines,
    `</IPDx>`,
    `<IPOp Reccount="${ipOpRecords.length}">`,
    ipOpLines,
    `</IPOp>`,
    `<Invoices>`,
    `<InvNumber>${escapeXml(admission.an)}</InvNumber>`,
    `<InvDT>${invDT}</InvDT>`,
    `<BillItems Reccount="${billItemRecords.length}">`,
    billItemLines,
    `</BillItems>`,
    `<InvAddDiscount>0.00</InvAddDiscount>`,
    `<DRGCharge>${formatAmount(drgCharge)}</DRGCharge>`,
    `<XDRGClaim>${formatAmount(xdrgClaim)}</XDRGClaim>`,
    `</Invoices>`,
    `<Coinsurance />`,
    `</CIPN>`,
  ].join('\r\n');

  // MD5 covers from <CIPN through </CIPN>\r\n
  const md5Content = cipnBody + '\r\n';
  const hmac = calculateMd5(md5Content);

  // Assemble complete XML document
  const xmlDeclaration = `<?xml version="1.0" encoding="windows-874"?>`;
  const fullDocument = [
    xmlDeclaration,
    cipnBody,
    `<?EndNote HMAC="${hmac}" ?>`,
  ].join('\r\n');

  return fullDocument + '\r\n';
}
