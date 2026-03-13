// ─── Types ───────────────────────────────────────────────────────────────────

export interface VisitExportBatch {
  batchId: number;
  sessionNo: number;
  createdAt: string;
}

export interface BillingClaim {
  id: number;
  roundNumber: number;
  status: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  notes: string | null;
  isActive: boolean;
}

export interface PatientCase {
  id: number;
  caseNumber: string;
  vcrCode: string | null;
  status: string;
  openedAt: string;
  closedAt: string | null;
  notes: string | null;
  referralDate: string | null;
  admissionDate: string | null;
  sourceHospital: {
    id: number;
    hcode5: string | null;
    hcode9: string;
    nameThai: string;
    province: string;
  } | null;
  protocol: {
    id: number;
    protocolCode: string;
    nameThai: string;
    nameEnglish: string;
    cancerSite?: { id: number; siteCode: string; nameThai: string; nameEnglish: string };
  } | null;
  _count?: { visits: number };
}

export interface VisitMedication {
  id: number;
  medicationName: string;
  quantity: number | null;
  unit: string | null;
  resolvedDrug: { id: number; genericName: string; drugCategory: string } | null;
  resolvedAipnCode: string | null;
}

export interface Visit {
  id: number;
  vn: string;
  hn: string;
  visitDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  confirmedAt: string | null;
  // Insurance type
  pttype?: string | null;
  pttypeName?: string | null;
  // IPD fields
  visitType?: string | null;
  an?: string | null;
  admitDate?: string | null;
  dischargeDate?: string | null;
  admitTime?: string | null;
  dischargeTime?: string | null;
  ward?: string | null;
  dischargeStatus?: string | null;
  lengthOfStay?: number | null;
  medications: VisitMedication[];
  case: {
    id: number;
    caseNumber: string;
    status: string;
    protocol: { id: number; protocolCode: string; nameThai: string } | null;
  } | null;
  confirmedProtocol: {
    id: number;
    protocolCode: string;
    nameThai: string;
    nameEnglish: string;
  } | null;
  confirmedRegimen: {
    id: number;
    regimenCode: string;
    regimenName: string;
  } | null;
  resolvedSite: { id: number; siteCode: string; nameThai: string } | null;
  billingClaims: BillingClaim[];
}

export interface TopMatch {
  protocolId: number;
  protocolCode: string;
  protocolName: string;
  score: number;
  regimenId: number | null;
  regimenCode: string | null;
  regimenName: string | null;
}

export interface PatientDetail {
  id: number;
  hn: string;
  citizenId: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  cases: PatientCase[];
  visits: Visit[];
  _count: { visits: number; cases: number };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatThaiDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}

export function maskCitizenId(cid: string): string {
  if (!cid || cid.length !== 13) return cid;
  return `${cid[0]}-${cid.slice(1, 5)}-${cid.slice(5, 10)}-${cid.slice(10, 12)}-${cid[12]}`;
}

export const caseStatusVariant: Record<string, 'success' | 'secondary' | 'destructive'> = {
  ACTIVE: 'success',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
};

export const caseStatusLabel: Record<string, string> = {
  ACTIVE: 'กำลังรักษา',
  COMPLETED: 'เสร็จสิ้น',
  CANCELLED: 'ยกเลิก',
};

export const claimStatusVariant: Record<string, 'success' | 'destructive' | 'warning'> = {
  APPROVED: 'success',
  REJECTED: 'destructive',
  PENDING: 'warning',
};

export const claimStatusLabel: Record<string, string> = {
  PENDING: 'รอผล',
  APPROVED: 'ผ่าน',
  REJECTED: 'ไม่ผ่าน',
};

export const claimStatusOptions = [
  { value: 'PENDING', label: 'รอผล (Pending)' },
  { value: 'APPROVED', label: 'ผ่าน (Approved)' },
  { value: 'REJECTED', label: 'ไม่ผ่าน (Rejected)' },
];
