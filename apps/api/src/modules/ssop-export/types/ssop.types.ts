/**
 * SSOP 0.93 record types — matches Plan §2
 */

/** BILLTRAN record (19 pipe-delimited fields) */
export interface BilltranRecord {
  station: string;       // #1: "01"
  authcode: string;      // #2: "SSOCAC"
  dtTran: string;        // #3: YYYY-MM-DDThh:mm:ss
  hcode: string;         // #4: 5-digit hospital code
  invno: string;         // #5: VN (PK)
  billno: string;        // #6: empty
  hn: string;            // #7: PatientCase.caseNumber (CHI68-A02 override)
  memberNo: string;      // #8: PatientCase.vcrCode (CHI68-A02 override)
  amount: string;        // #9: total billing amount
  paid: string;          // #10: "0.00"
  verCode: string;       // #11: Protocol code (CHI68-A02 override)
  tflag: string;         // #12: "E"
  pid: string;           // #13: Citizen ID 13 digits
  name: string;          // #14: fullName
  hMain: string;         // #15: main hospital hcode5
  payPlan: string;       // #16: "80"
  claimAmt: string;      // #17: = amount
  otherPayplan: string;  // #18: empty
  otherPay: string;      // #19: "0.00"
}

/** BillItems record (13 pipe-delimited fields) */
export interface BillItemRecord {
  invno: string;       // #1: FK → BILLTRAN.Invno
  svDate: string;      // #2: YYYY-MM-DD
  billMuad: string;    // #3: billing group (3/8/B/C/G)
  lcCode: string;      // #4: hospital code
  stdCode: string;     // #5: AIPN code
  desc: string;        // #6: description
  qty: string;         // #7: quantity
  up: string;          // #8: unit price
  chargeAmt: string;   // #9: QTY × UP
  claimUp: string;     // #10: claim unit price
  claimAmount: string; // #11: QTY × ClaimUP
  svRefId: string;     // #12: FK → OPServices.SVID
  claimCat: string;    // #13: OP1 or OPR
}

/** OPServices record (22 pipe-delimited fields) */
export interface OpServiceRecord {
  invno: string;       // #1: VN
  svId: string;        // #2: service ID (PK)
  class_: string;      // #3: "EC"
  hcode: string;       // #4: hospital code
  hn: string;          // #5: Patient.hn
  pid: string;         // #6: Citizen ID
  careAccount: string; // #7: "1"
  typeServ: string;    // #8: "03"
  typeIn: string;      // #9: "9"
  typeOut: string;     // #10: "9"
  dtAppoint: string;   // #11: empty
  svPid: string;       // #12: physician license no
  clinic: string;      // #13: clinic code
  begDt: string;       // #14: service start time
  endDt: string;       // #15: service end time
  lcCode: string;      // #16: empty
  codeSet: string;     // #17: empty
  stdCode: string;     // #18: empty
  svCharge: string;    // #19: "0.00"
  completion: string;  // #20: "Y"
  svTxCode: string;    // #21: empty
  claimCat: string;    // #22: "OP1" or "OPR"
}

/** OPDx record (6 pipe-delimited fields) */
export interface OpDxRecord {
  class_: string;  // #1: "EC"
  svId: string;    // #2: FK → OPServices.SVID
  sl: string;      // #3: sequence (1-9)
  codeSet: string; // #4: "TT"
  code: string;    // #5: ICD-10 code
  desc: string;    // #6: empty
}

/** Enriched visit data for SSOP export */
export interface SsopVisitData {
  vn: string;
  visitDate: Date;
  serviceStartTime: Date | null;
  serviceEndTime: Date | null;
  physicianLicenseNo: string | null;
  clinicCode: string | null;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  patientHn: string;
  patientCitizenId: string;
  patientFullName: string;
  caseNumber: string;
  vcrCode: string;
  protocolCode: string;
  mainHospitalCode: string;
  billingItems: {
    hospitalCode: string;
    aipnCode: string | null;
    billingGroup: string;
    description: string;
    quantity: number;
    unitPrice: number;
    claimUnitPrice: number;
    claimCategory: string;
  }[];
}
