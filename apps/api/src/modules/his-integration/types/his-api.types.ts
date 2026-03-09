/**
 * HIS API response types — matches the HIS API specification (Plan §11)
 */

export interface HisPatientSearchResult {
  hn: string;
  citizenId: string;
  titleName?: string;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  phoneNumber?: string;
  insuranceType?: string;
  mainHospitalCode?: string;
  totalVisitCount?: number;
  matchingVisitCount?: number;
}

export interface HisMedication {
  hospitalCode: string;
  medicationName: string;
  quantity?: string;
  unit?: string;
}

export interface HisDiagnosis {
  diagCode: string;
  diagType: string; // '1'=primary, '2'=comorbid, '3'=complication, '4'=other, '5'=external cause
  diagTerm?: string | null;
}

export interface HisBillingItem {
  hospitalCode: string;
  aipnCode?: string;
  tmtCode?: string;
  stdCode?: string;
  billingGroup: string;
  description: string;
  quantity: number;
  unitPrice: number;
  claimUnitPrice?: number;
  claimCategory?: string;
  // Drug/dispensing fields (billingGroup "3" only)
  dfsText?: string;
  packsize?: string;
  sigCode?: string;
  sigText?: string;
  supplyDuration?: string;
  // SKS fields from HOSxP drugitems (TMT/SSO standard codes)
  sksDrugCode?: string; // TMT TPU code (confirmed real TMT)
  stdGroup?: string; // SSO standard billing group (from income.std_group)
  sksDfsText?: string; // Drug description from drugitems.sks_dfs_text
  sksReimbPrice?: number; // SSO reimbursement price from drugitems.sks_reimb_price
}

export interface HisVisit {
  vn: string;
  visitDate: string;
  serviceStartTime?: string;
  serviceEndTime?: string;
  physicianLicenseNo?: string;
  clinicCode?: string;
  primaryDiagnosis: string;
  secondaryDiagnoses?: string;
  hpi?: string;
  doctorNotes?: string;
  // SSOP 0.93 fields
  billNo?: string;
  visitType?: string;
  dischargeType?: string;
  nextAppointmentDate?: string;
  serviceClass?: string;
  serviceType?: string;
  prescriptionTime?: string;
  dayCover?: string;
  receiptNo?: string;
  diagnoses?: HisDiagnosis[];
  medications?: HisMedication[];
  billingItems?: HisBillingItem[];
}

export interface HisPatientData {
  patient: HisPatientSearchResult;
  visits: HisVisit[];
}

export interface HisApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

/** ICD-10 prefixes considered cancer-related for filtering */
export const CANCER_ICD10_PREFIXES = [
  'C',    // Malignant neoplasms (C00-C97)
  'D0',   // In situ neoplasms (D00-D09)
  'Z51',  // Encounter for antineoplastic therapy
];

export function isCancerRelatedIcd10(icdCode: string): boolean {
  if (!icdCode) return false;
  const code = icdCode.replace(/\./g, '').toUpperCase();
  return CANCER_ICD10_PREFIXES.some((prefix) => code.startsWith(prefix));
}

/** Check if a code is ICD-9-CM procedure code (starts with digit, e.g. 9224, 9925) */
export function isIcd9ProcedureCode(code: string): boolean {
  if (!code) return false;
  return /^\d/.test(code.trim());
}

/**
 * Extract primary/secondary diagnoses from structured diagnoses array.
 * Handles: trim diagType trailing spaces, filter ICD-9 from primary.
 */
export function extractDiagnosesFromArray(
  diagnoses: HisDiagnosis[],
): { primaryDiagnosis: string | null; secondaryDiagnoses: string | null } {
  if (!diagnoses || diagnoses.length === 0) {
    return { primaryDiagnosis: null, secondaryDiagnoses: null };
  }

  let primaryDiagnosis: string | null = null;
  const secondaryCodes: string[] = [];

  for (const dx of diagnoses) {
    const diagType = dx.diagType?.trim();
    const code = dx.diagCode?.trim();
    if (!code) continue;

    if (diagType === '1') {
      // Primary diagnosis — only accept ICD-10 (starts with letter)
      if (!isIcd9ProcedureCode(code)) {
        primaryDiagnosis = code;
      }
      // ICD-9 in primary slot: skip it (don't put in secondary either)
    } else {
      // Secondary/other — keep all codes including ICD-9 procedure codes
      secondaryCodes.push(code);
    }
  }

  // Fallback: if no ICD-10 primary found, try first ICD-10 code from any diagType
  if (!primaryDiagnosis) {
    const firstIcd10 = diagnoses.find(
      (dx) => dx.diagCode?.trim() && !isIcd9ProcedureCode(dx.diagCode.trim()),
    );
    if (firstIcd10) {
      primaryDiagnosis = firstIcd10.diagCode.trim();
      // Remove it from secondary if it was there
      const idx = secondaryCodes.indexOf(primaryDiagnosis);
      if (idx >= 0) secondaryCodes.splice(idx, 1);
    }
  }

  return {
    primaryDiagnosis,
    secondaryDiagnoses: secondaryCodes.length > 0 ? secondaryCodes.join(',') : null,
  };
}

// ─── Visit Completeness Analysis ─────────────────────────────────────────────

export type CompletenessLevel = 'complete' | 'incomplete' | 'minimal';

export interface FieldCompleteness {
  field: string;
  label: string;
  present: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface VisitCompleteness {
  level: CompletenessLevel;
  score: number;
  missingFields: FieldCompleteness[];
}

export interface HisPreviewVisit {
  visit: HisVisit;
  isCancerRelated: boolean;
  isAlreadyImported: boolean;
  completeness: VisitCompleteness;
  hasProtocolDrugs: boolean;
}

export interface HisSearchPreviewResult {
  patient: HisPatientSearchResult;
  existingPatientId: number | null;
  visits: HisPreviewVisit[];
  summary: {
    totalVisits: number;
    cancerRelatedVisits: number;
    alreadyImported: number;
    newImportable: number;
    completeVisits: number;
    incompleteVisits: number;
  };
}

/** Analyze visit data completeness against SSOP 0.93 requirements */
export function analyzeVisitCompleteness(visit: HisVisit): VisitCompleteness {
  const fields: FieldCompleteness[] = [
    { field: 'medications', label: 'รายการยา', present: (visit.medications?.length ?? 0) > 0, priority: 'critical' },
    { field: 'billingItems', label: 'รายการค่ารักษา', present: (visit.billingItems?.length ?? 0) > 0, priority: 'critical' },
    { field: 'primaryDiagnosis', label: 'วินิจฉัยหลัก', present: !!visit.primaryDiagnosis, priority: 'critical' },
    { field: 'visitType', label: 'ประเภทการมา (TypeIn)', present: !!visit.visitType, priority: 'high' },
    { field: 'dischargeType', label: 'ประเภทจำหน่าย (TypeOut)', present: !!visit.dischargeType, priority: 'high' },
    { field: 'serviceClass', label: 'ประเภทบริการ (Class)', present: !!visit.serviceClass, priority: 'medium' },
    { field: 'serviceType', label: 'ชนิดบริการ (TypeServ)', present: !!visit.serviceType, priority: 'medium' },
    { field: 'physicianLicenseNo', label: 'เลข ว.แพทย์', present: !!visit.physicianLicenseNo, priority: 'medium' },
    { field: 'billNo', label: 'เลขที่ใบเสร็จ', present: !!visit.billNo, priority: 'low' },
    { field: 'nextAppointmentDate', label: 'วันนัดครั้งถัดไป', present: !!visit.nextAppointmentDate, priority: 'low' },
    { field: 'dayCover', label: 'DayCover', present: !!visit.dayCover, priority: 'low' },
  ];

  const presentFields = fields.filter((f) => f.present);
  const missingFields = fields.filter((f) => !f.present);
  const score = Math.round((presentFields.length / fields.length) * 100);

  const hasCriticalMissing = missingFields.some((f) => f.priority === 'critical');
  const hasHighMissing = missingFields.some((f) => f.priority === 'high');

  let level: CompletenessLevel = 'complete';
  if (hasCriticalMissing) level = 'minimal';
  else if (hasHighMissing) level = 'incomplete';

  return { level, score, missingFields };
}
