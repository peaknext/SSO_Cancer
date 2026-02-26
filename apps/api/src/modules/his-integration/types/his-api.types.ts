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
  billingGroup: string;
  description: string;
  quantity: number;
  unitPrice: number;
  claimUnitPrice?: number;
  claimCategory?: string;
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
  medications: HisMedication[];
  billingItems: HisBillingItem[];
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
  const code = icdCode.replace(/\./g, '').toUpperCase();
  return CANCER_ICD10_PREFIXES.some((prefix) => code.startsWith(prefix));
}
