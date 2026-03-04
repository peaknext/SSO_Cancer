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
