/**
 * CIPN Export Types — In-Patient (IPD) claims for กรมบัญชีกลาง (CSMBS)
 * Based on CIPN version 2.0 (CIPNnov2019-Edt7.txt)
 */

/** IPADT record — 1 per admission, 22 pipe-delimited fields */
export interface IpadtRecord {
  an: string; // F1: Admission Number (7-9 digits, leading zeros)
  hn: string; // F2: Hospital Number
  idType: string; // F3: 0=Thai ID, 1=Foreigner, 3=Passport, 9=Other
  pidPat: string; // F4: ID/Passport number
  title: string; // F5: Name prefix (นาย, นาง, etc.)
  namePat: string; // F6: Full name & surname
  dob: string; // F7: ISO date YYYY-MM-DD
  sex: string; // F8: 1=Male, 2=Female
  marriage: string; // F9: 1=Single, 2=Married, 3=Widowed, 4=Other
  changwat: string; // F10: Province code
  amphur: string; // F11: District code
  nation: string; // F12: Nationality code (99=Thai)
  admType: string; // F13: A=Accident, E=Emergency, C=Elective, etc.
  admSource: string; // F14: O=OPD, E=Emergency, S=Other, T=Transfer, R=Referral
  dtAdm: string; // F15: ISO datetime admission
  dtDisch: string; // F16: ISO datetime discharge
  leaveDay: string; // F17: Leave days count
  dischStat: string; // F18: 1=Recovery, 2=Improved, etc.
  dischType: string; // F19: 1=With approval, 2=Against advice, etc.
  admWt: string; // F20: Admission weight (kg)
  dischWard: string; // F21: Discharge ward code
  dept: string; // F22: Department code (01-12)
}

/** IPDx record — diagnoses, 7 pipe-delimited fields per record */
export interface IpdxRecord {
  sequence: number; // F1: Sequential order 1,2,3,...
  dxType: string; // F2: 1=Principal, 2=Comorbidity, 3=Complication, 4=Other, 5=External
  codeSys: string; // F3: ICD-10, ICD-10-TM, SNOMED
  code: string; // F4: Diagnosis code
  diagTerm: string; // F5: Diagnosis description
  dr: string; // F6: Doctor license (ว1234567)
  dateDiag: string; // F7: ISO date if available
}

/** IPOp record — procedures, 8 pipe-delimited fields per record */
export interface IpOpRecord {
  sequence: number; // F1: Sequential order 1,2,3,...
  codeSys: string; // F2: ICD9CM, ICD-10-TM, ICD10PCS
  code: string; // F3: Procedure code
  procTerm: string; // F4: Procedure description
  dr: string; // F5: Doctor/provider license
  dateIn: string; // F6: ISO datetime start
  dateOut: string; // F7: ISO datetime end
  location: string; // F8: Service location
}

/** CIPN BillItem — 20 pipe-delimited fields per record */
export interface CipnBillItemRecord {
  sequence: number; // F1: Item order 1,2,3,...
  servDate: string; // F2: ISO datetime service date
  billGr: string; // F3: Hospital billing group
  lcCode: string; // F4: Hospital item code (Local Charge Code)
  descript: string; // F5: Item description
  qty: string; // F6: Quantity
  unitPrice: string; // F7: Hospital unit price
  chargeAmt: string; // F8: QTY × UnitPrice
  discount: string; // F9: Discount amount
  procedureSeq: string; // F10: Link to IPOp.sequence (0 if none)
  diagnosisSeq: string; // F11: Link to IPDx.sequence (0 if none)
  claimSys: string; // F12: SS (Social Security)
  billGrCS: string; // F13: CSMBS billing group (01-17, 88, 90, 91)
  csCode: string; // F14: CSMBS item code
  codeSys: string; // F15: Standard code system (TMT for drugs)
  stdCode: string; // F16: Standard code (TMT code for drugs)
  claimCat: string; // F17: T=Tariff, D=DRG, X=Exempt
  dateRev: string; // F18: Last revision date
  claimUP: string; // F19: Claim unit price
  claimAmt: string; // F20: QTY × ClaimUP
}

/** Enriched admission data for CIPN export */
export interface CipnAdmissionData {
  visitId: number;
  an: string;
  hn: string;
  visitDate: Date;
  admitDate: string | null;
  admitTime: string | null;
  dischargeDate: Date | null;
  dischargeTime: string | null;
  admissionType: string | null;
  admissionSource: string | null;
  dischargeStatus: string | null;
  dischargeType: string | null;
  ward: string | null;
  department: string | null;
  lengthOfStay: number | null;
  leaveDay: number | null;
  birthWeight: number | null; // Decimal in schema
  drg: string | null;
  drgVersion: string | null;
  rw: number | null; // Decimal
  adjRw: number | null; // Decimal
  authCode: string | null;
  authDate: Date | null;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  physicianLicenseNo: string | null;
  // Patient data
  patientHn: string;
  patientCitizenId: string;
  patientFullName: string;
  patientDob: Date | null;
  patientSex: string | null;
  patientTitle: string | null;
  patientMaritalStatus: string | null;
  patientNationality: string | null;
  patientProvince: string | null;
  patientDistrict: string | null;
  // Case data
  caseNumber: string;
  mainHospitalCode: string;
  // Structured data
  diagnoses: Array<{
    sequence: number;
    diagCode: string;
    diagType: string;
    codeSys: string | null;
    diagTerm: string | null;
    doctorLicense: string | null;
    diagDate: Date | null;
  }>;
  procedures: Array<{
    sequence: number;
    procedureCode: string;
    codeSys: string | null;
    procedureTerm: string | null;
    doctorLicense: string | null;
    startDate: Date | null;
    startTime: string | null;
    endDate: Date | null;
    endTime: string | null;
    location: string | null;
  }>;
  billingItems: Array<{
    hospitalCode: string;
    aipnCode: string | null;
    tmtCode: string | null;
    stdCode: string | null;
    billingGroup: string;
    stdGroup: string | null;
    description: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    serviceDate: Date | null;
    sksDrugCode: string | null;
    sksReimbPrice: number | null;
    claimUnitPrice: number;
    claimCategory: string;
  }>;
}
