'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePersistedState } from '@/hooks/use-persisted-state';
import {
  Search,
  Calendar,
  Pill,
  CheckCircle2,
  XCircle,
  Star,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
  Sparkles,
  Filter,
  X,
  Activity,
  Radiation,
  ShieldPlus,
  SearchCheck,
  RefreshCw,
  Banknote,
  ClipboardCheck,
  BedDouble,
  Scissors,
  Stethoscope,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ConfirmProtocolDialog } from './confirm-protocol-dialog';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { HelpButton } from '@/components/shared/help-button';

// ─── Types ───────────────────────────────────────────────────

interface Patient {
  hn: string;
  visitCount: number;
  lastVisitDate: string;
}

interface CancerSite {
  id: number;
  siteCode: string;
  nameThai: string;
}

interface VisitSummary {
  id: number;
  vn: string;
  an?: string | null;
  visitDate: string;
  primaryDiagnosis: string;
  resolvedSite: { id: number; nameThai: string; siteCode: string } | null;
  _count: { medications: number };
  confirmedProtocolId: number | null;
  confirmedAt: string | null;
}

interface VisitMedication {
  id: number;
  rawLine: string;
  hospitalCode: string | null;
  resolvedAipnCode: number | null;
  medicationName: string | null;
  quantity: string | null;
  unit: string | null;
  resolvedDrug: {
    id: number;
    genericName: string;
    drugCategory: string | null;
    tradeNames: { tradeName: string | null; drugCode: string }[];
  } | null;
  aipnPricing: {
    rate: number;
    unit: string;
    aipnDescription: string;
  } | null;
  formularyStatus: {
    inFormulary: boolean;
    formularyRate?: number;
    category?: string;
  } | null;
}

interface VisitDetail {
  id: number;
  hn: string;
  vn: string;
  an?: string | null;
  visitDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  medicationsRaw: string | null;
  resolvedSite: { id: number; siteCode: string; nameThai: string; nameEnglish: string } | null;
  medications: VisitMedication[];
  import: { id: number; filename: string; createdAt: string } | null;
  patient: { id: number; fullName: string; titleName: string | null } | null;
  case: {
    id: number;
    caseNumber: string;
    sourceHospital: { id: number; hcode5: string; nameThai: string } | null;
  } | null;
  confirmedProtocolId: number | null;
  confirmedRegimenId: number | null;
  confirmedAt: string | null;
  confirmedProtocol: { id: number; protocolCode: string; nameEnglish: string; nameThai: string | null } | null;
  confirmedRegimen: { id: number; regimenCode: string; regimenName: string } | null;
  confirmedByUser: { id: number; fullName: string; fullNameThai: string | null } | null;
  // Insurance type
  pttype?: string | null;
  pttypeName?: string | null;
  // IPD fields
  visitType?: string | null;
  admitTime?: string | null;
  dischargeDate?: string | null;
  dischargeTime?: string | null;
  admissionType?: string | null;
  admissionSource?: string | null;
  dischargeStatus?: string | null;
  ward?: string | null;
  department?: string | null;
  lengthOfStay?: number | null;
  drg?: string | null;
  drgVersion?: string | null;
  rw?: number | null;
  adjRw?: number | null;
  diagnoses?: { id: number; sequence: number; diagCode: string; diagType: string; codeSys: string; diagTerm: string | null; doctorLicense: string | null; diagDate: string | null }[];
  procedures?: { id: number; sequence: number; procedureCode: string; codeSys: string; procedureTerm: string | null; doctorLicense: string | null; startDate: string | null; startTime: string | null; endDate: string | null; endTime: string | null; location: string | null }[];
}

interface TreatmentModality {
  isRadiation: boolean;
  isChemotherapy: boolean;
  isImmunotherapy: boolean;
}

interface StageInference {
  inferredStage: 'EARLY' | 'LOCALLY_ADVANCED' | 'METASTATIC' | null;
  hasDistantMets: boolean;
  hasNodeInvolvement: boolean;
  treatmentModality: TreatmentModality;
  reasons: string[];
}

interface MatchedRegimen {
  regimenId: number;
  regimenCode: string;
  regimenName: string;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  matchedDrugs: string[];
  totalDrugs: number;
  drugMatchRatio: number;
}

interface FormularyCompliance {
  compliantCount: number;
  totalChecked: number;
  ratio: number;
}

interface MatchResult {
  protocolId: number;
  protocolCode: string;
  protocolName: string;
  cancerSiteName: string;
  protocolType: string | null;
  treatmentIntent: string | null;
  score: number;
  matchedRegimen: MatchedRegimen;
  reasons: string[];
  stageMatch: boolean | null;
  inferredStage: string | null;
  treatmentModality: TreatmentModality;
  formularyCompliance: FormularyCompliance | null;
}

interface MatchResponse {
  results: MatchResult[];
  stageInference: StageInference;
  nonProtocolChemoDrugs: string[];
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ConfirmationResponse {
  confirmedProtocolId: number | null;
  confirmedRegimenId: number | null;
  confirmedAt: string;
  confirmedProtocol: { id: number; protocolCode: string; nameEnglish: string; nameThai: string | null } | null;
  confirmedRegimen: { id: number; regimenCode: string; regimenName: string } | null;
  confirmedByUser: { id: number; fullName: string; fullNameThai: string | null } | null;
}

interface AiRecommendation {
  recommendedProtocolCode: string;
  recommendedProtocolId: number;
  recommendedRegimenCode: string | null;
  recommendedRegimenId: number | null;
  confidenceScore: number;
  reasoning: string;
  alternativeProtocols: { protocolCode: string; protocolId: number; reason: string }[];
  clinicalNotes: string;
}

interface AiSuggestionResponse {
  id: number;
  provider: string;
  model: string;
  recommendation: AiRecommendation;
  tokensUsed: number | null;
  latencyMs: number | null;
  status: string;
  createdAt: string;
}

// ─── Stage labels ────────────────────────────────────────────

const STAGE_LABEL: Record<string, string> = {
  EARLY: 'ระยะเริ่มต้น',
  LOCALLY_ADVANCED: 'ระยะลุกลามเฉพาะที่',
  METASTATIC: 'ระยะแพร่กระจาย',
};

// ─── Component ───────────────────────────────────────────────

export default function ProtocolAnalysisPage() {
  // Persisted state (survives page reload / navigation)
  const [patientSearch, setPatientSearch, h1] = usePersistedState('pa:search', '');
  const [selectedHn, setSelectedHn, h2] = usePersistedState<string | null>('pa:hn', null);
  const [selectedVn, setSelectedVn, h3] = usePersistedState<string | null>('pa:vn', null);
  const [filterSiteId, setFilterSiteId, h4] = usePersistedState('pa:filterSite', '');
  const [filterHasMeds, setFilterHasMeds, h5] = usePersistedState('pa:filterMeds', false);
  const [filterHasZ510, setFilterHasZ510, h6] = usePersistedState('pa:filterZ510', false);
  const [filterHasZ511, setFilterHasZ511, h6b] = usePersistedState('pa:filterZ511', false);
  const [filterDateFrom, setFilterDateFrom, h7] = usePersistedState('pa:dateFrom', '');
  const [filterDateTo, setFilterDateTo, h8] = usePersistedState('pa:dateTo', '');
  const [viewMode, setViewMode, hViewMode] = usePersistedState<'opd' | 'ipd'>('pa:viewMode', 'opd');
  const filtersHydrated = h1 && h2 && h3 && h4 && h5 && h6 && h6b && h7 && h8 && hViewMode;

  // Pre-select HN/VN from URL params (from "ดูการวิเคราะห์" link in patient detail)
  const appliedUrlParams = useRef(false);
  // pendingUrlVn holds the VN from URL params until visits finish loading
  // (the selectedHn effect resets selectedVn when HN changes, so we restore VN after visits load)
  const pendingUrlVn = useRef<string | null>(null);
  useEffect(() => {
    if (!filtersHydrated || appliedUrlParams.current) return;
    const params = new URLSearchParams(window.location.search);
    const urlHn = params.get('hn');
    const urlVn = params.get('vn');
    if (urlHn || urlVn) {
      appliedUrlParams.current = true;
      if (urlVn) pendingUrlVn.current = urlVn;
      if (urlHn) setSelectedHn(urlHn);
      else if (urlVn) setSelectedVn(urlVn);
    }
  }, [filtersHydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  // Transient state (not persisted)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [vnSearch, setVnSearch] = useState('');
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [visitDetail, setVisitDetail] = useState<VisitDetail | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [stageInference, setStageInference] = useState<StageInference | null>(null);
  const [nonProtocolChemoDrugs, setNonProtocolChemoDrugs] = useState<string[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [cancerSites, setCancerSites] = useState<CancerSite[]>([]);
  const [confirmingMatch, setConfirmingMatch] = useState<MatchResult | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const hasActiveFilters = !!filterSiteId || filterHasMeds || filterHasZ510 || filterHasZ511 || !!filterDateFrom || !!filterDateTo;

  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestionResponse | null>(null);
  const [aiCached, setAiCached] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const user = useAuthStore((s) => s.user);
  const canConfirm = user && ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(user.role);
  const canTriggerAi = user && ['SUPER_ADMIN', 'ADMIN', 'EDITOR'].includes(user.role);

  // ─── Fetch cancer sites (once) ──────────────────────────────
  useEffect(() => {
    apiClient
      .get<PaginatedResponse<CancerSite>>('/cancer-sites?limit=100&sortBy=siteCode&sortOrder=asc')
      .then((res) => setCancerSites(res.data))
      .catch(() => {});
  }, []);

  // ─── Fetch patients (only after persisted filters are hydrated) ─
  const fetchPatients = useCallback(async () => {
    if (!filtersHydrated) return;
    setLoadingPatients(true);
    try {
      const params = new URLSearchParams({ limit: '100', sortBy: 'hn', sortOrder: 'asc' });
      if (patientSearch) params.set('search', patientSearch);
      if (filterSiteId) params.set('cancerSiteId', filterSiteId);
      if (filterHasMeds) params.set('hasMedications', 'true');
      if (filterHasZ510) params.set('hasZ510', 'true');
      if (filterHasZ511) params.set('hasZ511', 'true');
      if (filterDateFrom) params.set('visitDateFrom', filterDateFrom);
      if (filterDateTo) params.set('visitDateTo', filterDateTo);
      const res = await apiClient.get<PaginatedResponse<Patient>>(
        `/protocol-analysis/patients?${params}`,
      );
      setPatients(res.data);
      setIsEmpty(res.meta.total === 0 && !patientSearch && !hasActiveFilters);
    } catch {
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }, [patientSearch, filterSiteId, filterHasMeds, filterHasZ510, filterHasZ511, filterDateFrom, filterDateTo, hasActiveFilters, filtersHydrated]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // ─── Refetch on window focus (picks up newly imported patients) ─
  const fetchPatientsRef = useRef(fetchPatients);
  fetchPatientsRef.current = fetchPatients;

  useEffect(() => {
    const onFocus = () => fetchPatientsRef.current();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // ─── Fetch visits for selected HN (with same filters) ─────
  useEffect(() => {
    if (!filtersHydrated) return;
    if (!selectedHn) {
      setVisits([]);
      setSelectedVn(null);
      return;
    }
    setLoadingVisits(true);
    setSelectedVn(null);
    setVnSearch('');
    setVisitDetail(null);
    setMatchResults([]);
    setStageInference(null);
    setNonProtocolChemoDrugs([]);
    const params = new URLSearchParams({ limit: '100', sortOrder: 'desc' });
    if (filterSiteId) params.set('cancerSiteId', filterSiteId);
    if (filterHasMeds) params.set('hasMedications', 'true');
    if (filterHasZ510) params.set('hasZ510', 'true');
    if (filterHasZ511) params.set('hasZ511', 'true');
    if (filterDateFrom) params.set('visitDateFrom', filterDateFrom);
    if (filterDateTo) params.set('visitDateTo', filterDateTo);
    params.set('visitType', viewMode === 'opd' ? '1' : '2');
    apiClient
      .get<PaginatedResponse<VisitSummary>>(
        `/protocol-analysis/patients/${selectedHn}/visits?${params}`,
      )
      .then((res) => {
        setVisits(res.data);
        // Restore VN from URL params if pending (selectedHn effect resets selectedVn above)
        if (pendingUrlVn.current) {
          setSelectedVn(pendingUrlVn.current);
          pendingUrlVn.current = null;
        }
      })
      .catch(() => setVisits([]))
      .finally(() => setLoadingVisits(false));
  }, [selectedHn, filterSiteId, filterHasMeds, filterHasZ510, filterHasZ511, filterDateFrom, filterDateTo, filtersHydrated, viewMode]);

  // ─── Fetch visit detail + match ────────────────────────────
  useEffect(() => {
    if (!selectedVn) {
      setVisitDetail(null);
      setMatchResults([]);
      setStageInference(null);
      setNonProtocolChemoDrugs([]);
      setAiSuggestion(null);
      setAiCached(false);
      setAiError(null);
      return;
    }
    setLoadingDetail(true);
    setLoadingMatch(true);

    apiClient
      .get<VisitDetail>(`/protocol-analysis/visits/${selectedVn}`)
      .then(setVisitDetail)
      .catch(() => setVisitDetail(null))
      .finally(() => setLoadingDetail(false));

    apiClient
      .get<MatchResponse>(`/protocol-analysis/visits/${selectedVn}/match`)
      .then((res) => {
        setMatchResults(res.results);
        setStageInference(res.stageInference);
        setNonProtocolChemoDrugs(res.nonProtocolChemoDrugs ?? []);
      })
      .catch(() => {
        setMatchResults([]);
        setStageInference(null);
        setNonProtocolChemoDrugs([]);
      })
      .finally(() => setLoadingMatch(false));

    // Load cached AI suggestion
    setAiSuggestion(null);
    setAiCached(false);
    setAiError(null);
    apiClient
      .get<AiSuggestionResponse>(`/ai/suggestions/${selectedVn}`)
      .then((res) => {
        if (res) { setAiSuggestion(res); setAiCached(true); }
      })
      .catch(() => { /* no cached suggestion */ });
  }, [selectedVn]);

  const clearFilters = () => {
    setFilterSiteId('');
    setFilterHasMeds(false);
    setFilterHasZ510(false);
    setFilterHasZ511(false);
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // ─── Filtered visits (client-side VN search) ──────────────
  const filteredVisits = vnSearch
    ? visits.filter(
        (v) =>
          v.vn.includes(vnSearch) ||
          v.primaryDiagnosis.toLowerCase().includes(vnSearch.toLowerCase()),
      )
    : visits;

  // ─── Confirmation helpers ───────────────────────────────────
  function isMatchConfirmed(match: MatchResult): boolean {
    if (!visitDetail?.confirmedAt) return false;
    if (match.protocolId === 0) {
      // Non-protocol sentinel: confirmed when confirmedAt is set but no protocol ID stored
      return visitDetail.confirmedProtocolId == null;
    }
    return (
      visitDetail.confirmedProtocolId === match.protocolId &&
      visitDetail.confirmedRegimenId === (match.matchedRegimen?.regimenId || null)
    );
  }

  // ─── Confirmation handlers ─────────────────────────────────
  const handleConfirmClick = (match: MatchResult) => {
    if (isMatchConfirmed(match)) {
      handleUnconfirm();
      return;
    }
    setConfirmingMatch(match);
  };

  const handleConfirm = async (caseId: number | null) => {
    if (!confirmingMatch || !selectedVn) return;
    setConfirmLoading(true);
    const isNonProtocol = confirmingMatch.protocolId === 0;
    try {
      const body = isNonProtocol
        ? {}
        : {
            protocolId: confirmingMatch.protocolId,
            regimenId: confirmingMatch.matchedRegimen?.regimenId || undefined,
          };

      const result = await apiClient.patch<ConfirmationResponse>(
        `/protocol-analysis/visits/${selectedVn}/confirm`,
        body,
      );

      // Assign case if selected — rollback confirmation on failure
      if (caseId) {
        try {
          await apiClient.patch(`/cancer-patients/visits/${selectedVn}/assign-case`, { caseId });
        } catch {
          try {
            await apiClient.delete(`/protocol-analysis/visits/${selectedVn}/confirm`);
          } catch {
            // best-effort rollback
          }
          toast.error('ไม่สามารถผูกเคสได้ — ยกเลิกการยืนยันแล้ว');
          return;
        }
      }

      // Re-fetch visit detail to get updated case info
      try {
        const refreshed = await apiClient.get<VisitDetail>(`/protocol-analysis/visits/${selectedVn}`);
        setVisitDetail(refreshed);
      } catch {
        // Fallback: update only confirmation fields
        setVisitDetail((prev) =>
          prev
            ? {
                ...prev,
                confirmedProtocolId: result.confirmedProtocolId,
                confirmedRegimenId: result.confirmedRegimenId,
                confirmedAt: result.confirmedAt,
                confirmedProtocol: result.confirmedProtocol,
                confirmedRegimen: result.confirmedRegimen,
                confirmedByUser: result.confirmedByUser,
              }
            : prev,
        );
      }

      setVisits((prev) =>
        prev.map((v) =>
          v.vn === selectedVn
            ? { ...v, confirmedProtocolId: result.confirmedProtocolId, confirmedAt: result.confirmedAt }
            : v,
        ),
      );
      setConfirmingMatch(null);
      toast.success(isNonProtocol ? 'บันทึกการรักษานอกโปรโตคอลสำเร็จ' : 'ยืนยันโปรโตคอลสำเร็จ');
    } catch {
      toast.error('ไม่สามารถยืนยันโปรโตคอลได้');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleUnconfirm = async () => {
    if (!selectedVn) return;
    const prevDetail = visitDetail;
    const prevVisits = visits;
    // Optimistic update
    setVisitDetail((prev) =>
      prev
        ? {
            ...prev,
            confirmedProtocolId: null,
            confirmedRegimenId: null,
            confirmedAt: null,
            confirmedProtocol: null,
            confirmedRegimen: null,
            confirmedByUser: null,
            case: null,
          }
        : prev,
    );
    setVisits((prev) =>
      prev.map((v) =>
        v.vn === selectedVn ? { ...v, confirmedProtocolId: null, confirmedAt: null } : v,
      ),
    );
    try {
      await apiClient.delete(`/protocol-analysis/visits/${selectedVn}/confirm`);
      // Also unassign case if one was linked
      if (prevDetail?.case?.id) {
        try {
          await apiClient.delete(`/cancer-patients/visits/${selectedVn}/assign-case`);
        } catch {
          // Not critical — case unassign is best-effort
        }
      }
    } catch {
      toast.error('ไม่สามารถยกเลิกการยืนยันได้');
      // Revert optimistic update
      setVisitDetail(prevDetail);
      setVisits(prevVisits);
    }
  };

  // ─── AI suggestion handlers ──────────────────────────────────
  const handleAiSuggest = async () => {
    if (!selectedVn) return;
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await apiClient.post<AiSuggestionResponse>(`/ai/suggest/${selectedVn}`);
      setAiSuggestion(res);
      setAiCached(false);
      toast.success('วิเคราะห์ AI สำเร็จ');
    } catch (err: unknown) {
      const msg =
        (err as { error?: { message?: string } })?.error?.message ||
        (err as { message?: string })?.message ||
        'AI suggestion failed';
      setAiError(msg);
      toast.error(msg);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleAiRefresh = async () => {
    if (!selectedVn) return;
    setLoadingAi(true);
    try {
      const res = await apiClient.get<AiSuggestionResponse>(`/ai/suggestions/${selectedVn}`);
      if (res) { setAiSuggestion(res); setAiCached(true); }
    } catch {
      /* no cache */
    } finally {
      setLoadingAi(false);
    }
  };

  // ─── Empty state ───────────────────────────────────────────
  if (isEmpty && !loadingPatients) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
          <FileSpreadsheet className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">วิเคราะห์โปรโตคอล</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
          ยังไม่มีข้อมูลผู้ป่วย — นำเข้าจาก HIS เพื่อวิเคราะห์และจับคู่กับโปรโตคอลการรักษาในระบบ
        </p>
      </div>
    );
  }

  // Derive non-protocol chemo drug lookup for red text highlighting
  const nonProtocolDrugSet = new Set(nonProtocolChemoDrugs.map((n) => n.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <SearchCheck className="h-6 w-6 text-primary" />
            วิเคราะห์โปรโตคอล
            <HelpButton section="protocol-analysis" />
          </h1>
          <p className="text-sm text-muted-foreground">
            เลือก HN &rarr; {viewMode === 'opd' ? 'VN' : 'AN'} เพื่อดูรายละเอียดและจับคู่โปรโตคอล
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap glass-light rounded-xl px-3 py-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={filterSiteId}
          onChange={setFilterSiteId}
          placeholder="ตำแหน่งมะเร็งทั้งหมด"
          options={cancerSites.map((s) => ({
            value: String(s.id),
            label: `${s.siteCode} — ${s.nameThai}`,
          }))}
          className="w-56"
        />
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterHasMeds}
            onChange={(e) => setFilterHasMeds(e.target.checked)}
            className="rounded border-input accent-primary h-3.5 w-3.5"
          />
          มีรายการยา
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterHasZ510}
            onChange={(e) => setFilterHasZ510(e.target.checked)}
            className="rounded border-input accent-primary h-3.5 w-3.5"
          />
          Z510 (รังสี)
        </label>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filterHasZ511}
            onChange={(e) => setFilterHasZ511(e.target.checked)}
            className="rounded border-input accent-primary h-3.5 w-3.5"
          />
          Z511 (เคมี)
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">จาก:</span>
          <ThaiDatePicker
            value={filterDateFrom}
            onChange={setFilterDateFrom}
            placeholder="จากวันที่"
            className="h-7 text-xs w-44"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground shrink-0">ถึง:</span>
          <ThaiDatePicker
            value={filterDateTo}
            onChange={setFilterDateTo}
            placeholder="ถึงวันที่"
            className="h-7 text-xs w-44"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            ล้าง
          </button>
        )}

        {/* OPD / IPD toggle — right end */}
        <div className="inline-flex items-center rounded-md bg-muted/60 p-0.5 gap-0.5 ml-auto shrink-0">
          <button
            onClick={() => { setViewMode('opd'); setSelectedVn(null); }}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-all',
              viewMode === 'opd'
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Stethoscope className="h-3 w-3" />
            OPD
          </button>
          <button
            onClick={() => { setViewMode('ipd'); setSelectedVn(null); }}
            className={cn(
              'inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-all',
              viewMode === 'ipd'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BedDouble className="h-3 w-3" />
            IPD
          </button>
        </div>
      </div>

      {/* 3-Column layout */}
      <div className="flex gap-0 rounded-xl overflow-hidden glass-light" style={{ height: 'calc(100vh - 260px)' }}>
        {/* Column 1: HN List */}
        <div className="w-[200px] shrink-0 border-r flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="ค้นหา HN..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full rounded-md border bg-transparent py-1.5 pl-8 pr-7 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
              {patientSearch && (
                <button
                  onClick={() => setPatientSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingPatients ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : patients.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">ไม่พบข้อมูล</p>
            ) : (
              patients.map((p) => (
                <button
                  key={p.hn}
                  onClick={() => setSelectedHn(p.hn)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b text-xs transition-colors',
                    selectedHn === p.hn
                      ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                      : 'hover:bg-primary/4',
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{p.hn}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {p.visitCount}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 2: VN List */}
        <div className="w-[220px] shrink-0 border-r flex flex-col">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder={viewMode === 'opd' ? 'ค้นหา VN...' : 'ค้นหา AN...'}
                value={vnSearch}
                onChange={(e) => setVnSearch(e.target.value)}
                disabled={!selectedHn}
                className="w-full rounded-md border bg-transparent py-1.5 pl-8 pr-7 text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
              {vnSearch && (
                <button
                  onClick={() => setVnSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedHn ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                &larr; เลือก HN ก่อน
              </p>
            ) : loadingVisits ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredVisits.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                {vnSearch ? `ไม่พบ ${viewMode === 'opd' ? 'VN' : 'AN'} ที่ค้นหา` : `ไม่มี ${viewMode === 'opd' ? 'VN' : 'AN'}`}
              </p>
            ) : (
              filteredVisits.map((v) => (
                <button
                  key={v.vn}
                  onClick={() => setSelectedVn(v.vn)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 border-b text-xs transition-colors',
                    selectedVn === v.vn
                      ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                      : 'hover:bg-primary/4',
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-mono font-medium">{viewMode === 'ipd' && v.an ? v.an : v.vn}</span>
                    <div className="flex items-center gap-1">
                      {v.confirmedProtocolId && (
                        <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(v.visitDate).toLocaleDateString('th-TH')}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-[10px] bg-primary/10 text-primary rounded px-1 py-px">
                      {v.primaryDiagnosis}
                    </span>
                    {v.resolvedSite && (
                      <span className="text-[10px] text-muted-foreground truncate">
                        {v.resolvedSite.nameThai}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Detail */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {!selectedVn ? (
            <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
              <Search className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">&larr; เลือก {viewMode === 'opd' ? 'VN' : 'AN'} เพื่อดูรายละเอียด</p>
            </div>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center flex-1">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : visitDetail ? (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Visit header */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-heading text-base font-bold">{viewMode === 'opd' ? 'VN' : 'AN'}: {viewMode === 'ipd' && visitDetail.an ? visitDetail.an : visitDetail.vn}</h2>
                  {visitDetail.resolvedSite && (
                    <Badge variant="outline" className="text-xs">
                      {visitDetail.resolvedSite.nameThai}
                    </Badge>
                  )}
                </div>
                {visitDetail.patient && (
                  <p className="text-sm font-medium text-foreground mb-1">{visitDetail.patient.fullName}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/60">
                  <span>HN: <span className="font-mono text-foreground/80">{visitDetail.hn}</span></span>
                  {visitDetail.case?.sourceHospital && (
                    <span>รพ.ต้นทาง: <span className="text-foreground/80">{visitDetail.case.sourceHospital.nameThai}</span></span>
                  )}
                  <span>วันที่: {new Date(visitDetail.visitDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>วินิจฉัยหลัก: <span className="font-mono text-foreground">{visitDetail.primaryDiagnosis}</span></span>
                  {visitDetail.pttypeName && (
                    <span>สิทธิ์: <span className="text-foreground/80">{visitDetail.pttypeName}</span></span>
                  )}
                </div>
                {visitDetail.secondaryDiagnoses && (
                  <p className="text-xs text-foreground/60 mt-1">
                    วินิจฉัยรอง: <span className="font-mono text-foreground/80">{visitDetail.secondaryDiagnoses.replace(/\|/g, ', ')}</span>
                  </p>
                )}
              </div>

              {/* IPD Admission Info Card */}
              {viewMode === 'ipd' && visitDetail.an && (
                <div className="rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <BedDouble className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-foreground">ข้อมูลการรับผู้ป่วยใน</span>
                  </div>

                  {/* Admission dates + ward */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-foreground/50">AN</span>
                      <p className="font-mono font-medium text-foreground">{visitDetail.an}</p>
                    </div>
                    <div>
                      <span className="text-foreground/50">วันรับเข้า</span>
                      <p className="font-medium text-foreground">
                        {new Date(visitDetail.visitDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                        {visitDetail.admitTime && <span className="text-foreground/60 ml-1">{visitDetail.admitTime}</span>}
                      </p>
                    </div>
                    <div>
                      <span className="text-foreground/50">วันจำหน่าย</span>
                      <p className="font-medium text-foreground">
                        {visitDetail.dischargeDate
                          ? <>
                              {new Date(visitDetail.dischargeDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                              {visitDetail.dischargeTime && <span className="text-foreground/60 ml-1">{visitDetail.dischargeTime}</span>}
                            </>
                          : <span className="text-amber-600 dark:text-amber-400">ยังไม่จำหน่าย</span>
                        }
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-foreground/50">หอผู้ป่วย</span>
                      <p className="font-medium text-foreground">{visitDetail.ward || '-'}</p>
                    </div>
                    <div>
                      <span className="text-foreground/50">แผนก</span>
                      <p className="font-medium text-foreground">{visitDetail.department || '-'}</p>
                    </div>
                    <div>
                      <span className="text-foreground/50">วันนอน</span>
                      <p className="font-medium text-foreground">
                        {visitDetail.lengthOfStay != null ? `${visitDetail.lengthOfStay} วัน` : '-'}
                      </p>
                    </div>
                  </div>

                  {/* DRG info (if available) */}
                  {(visitDetail.drg || visitDetail.rw != null) && (
                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-blue-200/40 dark:border-blue-800/30 pt-2">
                      <div>
                        <span className="text-foreground/50">DRG</span>
                        <p className="font-mono font-medium text-foreground">{visitDetail.drg || '-'}{visitDetail.drgVersion && <span className="text-foreground/40 ml-1">v{visitDetail.drgVersion}</span>}</p>
                      </div>
                      <div>
                        <span className="text-foreground/50">RW</span>
                        <p className="font-mono font-medium text-foreground">{visitDetail.rw != null ? Number(visitDetail.rw).toFixed(4) : '-'}</p>
                      </div>
                      <div>
                        <span className="text-foreground/50">AdjRW</span>
                        <p className="font-mono font-medium text-foreground">{visitDetail.adjRw != null ? Number(visitDetail.adjRw).toFixed(4) : '-'}</p>
                      </div>
                    </div>
                  )}

                  {/* Structured Diagnoses */}
                  {visitDetail.diagnoses && visitDetail.diagnoses.length > 0 && (
                    <div className="border-t border-blue-200/40 dark:border-blue-800/30 pt-2">
                      <span className="text-xs font-semibold text-foreground/70 mb-1 block">วินิจฉัย ({visitDetail.diagnoses.length})</span>
                      <div className="space-y-1">
                        {visitDetail.diagnoses.map((dx) => (
                          <div key={dx.id} className="flex items-center gap-2 text-xs">
                            <Badge
                              variant={dx.diagType === '1' ? 'default' : 'outline'}
                              className={`text-[10px] px-1.5 py-0 shrink-0 ${dx.diagType === '1' ? 'bg-blue-600 text-white' : ''}`}
                            >
                              {dx.diagType === '1' ? 'หลัก' : dx.diagType === '2' ? 'ร่วม' : dx.diagType === '3' ? 'แทรก' : dx.diagType === '4' ? 'อื่น' : dx.diagType === '5' ? 'สาเหตุ' : `#${dx.diagType}`}
                            </Badge>
                            <span className="font-mono font-medium text-foreground">{dx.diagCode}</span>
                            {dx.diagTerm && <span className="text-foreground/60 truncate">{dx.diagTerm}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Structured Procedures */}
                  {visitDetail.procedures && visitDetail.procedures.length > 0 && (
                    <div className="border-t border-blue-200/40 dark:border-blue-800/30 pt-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Scissors className="h-3 w-3 text-foreground/50" />
                        <span className="text-xs font-semibold text-foreground/70">หัตถการ ({visitDetail.procedures.length})</span>
                      </div>
                      <div className="space-y-1">
                        {visitDetail.procedures.map((proc) => (
                          <div key={proc.id} className="flex items-center gap-2 text-xs">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                              {proc.codeSys}
                            </Badge>
                            <span className="font-mono font-medium text-foreground">{proc.procedureCode}</span>
                            {proc.procedureTerm && <span className="text-foreground/60 truncate">{proc.procedureTerm}</span>}
                            {proc.startDate && (
                              <span className="text-foreground/40 shrink-0 ml-auto">
                                {new Date(proc.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation banner */}
              {visitDetail.confirmedProtocol && (
                <div className="flex items-center gap-3 rounded-lg border border-green-300/60 dark:border-green-700/50 bg-linear-to-r from-green-50 to-emerald-50/50 dark:from-green-950/40 dark:to-emerald-950/20 px-3 py-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="font-medium text-green-800 dark:text-green-300">
                      ยืนยันแล้ว:{' '}
                      <span className="font-mono">{visitDetail.confirmedProtocol.protocolCode}</span>{' '}
                      {visitDetail.confirmedProtocol.nameThai || visitDetail.confirmedProtocol.nameEnglish}
                      {visitDetail.confirmedRegimen && (
                        <span className="text-green-600/70 dark:text-green-400/60">
                          {' '}/ สูตร <span className="font-mono">{visitDetail.confirmedRegimen.regimenCode}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-green-600/70 dark:text-green-400/50 shrink-0 text-right leading-relaxed">
                    <div>{visitDetail.confirmedByUser?.fullNameThai || visitDetail.confirmedByUser?.fullName}</div>
                    <div>{visitDetail.confirmedAt && new Date(visitDetail.confirmedAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</div>
                  </div>
                  {canConfirm && (
                    <button
                      onClick={handleUnconfirm}
                      className="text-green-400/60 hover:text-red-500 transition-colors p-1 shrink-0"
                      title="ยกเลิกการยืนยัน"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}

              {/* Stage inference card */}
              {stageInference && (
                <div className="rounded-lg border border-primary/20 bg-primary/4 p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">การอนุมานระยะโรค</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {stageInference.inferredStage ? (
                      <Badge
                        variant={
                          stageInference.inferredStage === 'METASTATIC'
                            ? 'destructive'
                            : stageInference.inferredStage === 'LOCALLY_ADVANCED'
                              ? 'warning'
                              : 'success'
                        }
                        className="text-xs"
                      >
                        {STAGE_LABEL[stageInference.inferredStage] || stageInference.inferredStage}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">ไม่สามารถอนุมานได้</Badge>
                    )}
                  </div>
                  {/* Treatment modality indicators */}
                  <div className="flex items-center gap-3 text-xs">
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        stageInference.treatmentModality.isChemotherapy
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-foreground/30 dark:text-foreground/25',
                      )}
                    >
                      <Pill className="h-3 w-3" />
                      เคมีบำบัด
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        stageInference.treatmentModality.isRadiation
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-foreground/30 dark:text-foreground/25',
                      )}
                    >
                      <Radiation className="h-3 w-3" />
                      รังสีรักษา
                    </span>
                    <span
                      className={cn(
                        'flex items-center gap-1',
                        stageInference.treatmentModality.isImmunotherapy
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-foreground/30 dark:text-foreground/25',
                      )}
                    >
                      <ShieldPlus className="h-3 w-3" />
                      ภูมิคุ้มกันบำบัด
                    </span>
                  </div>
                  {/* Reasons */}
                  {stageInference.reasons.length > 0 && (
                    <div className="text-[11px] text-foreground/60 space-y-0.5 pt-1 border-t border-dashed border-primary/15">
                      {stageInference.reasons.map((r, i) => (
                        <p key={i}>{r}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* HPI / Doctor notes */}
              {(visitDetail.hpi || visitDetail.doctorNotes) && (
                <div className="rounded-lg border border-border/60 bg-background p-3 text-xs space-y-2">
                  {visitDetail.hpi && (
                    <div>
                      <p className="font-medium text-primary mb-0.5">HPI:</p>
                      <p className="text-foreground/80">{visitDetail.hpi}</p>
                    </div>
                  )}
                  {visitDetail.doctorNotes && (
                    <div>
                      <p className="font-medium text-primary mb-0.5">หมายเหตุแพทย์:</p>
                      <p className="text-foreground/80">{visitDetail.doctorNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Medications */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Pill className="h-4 w-4" />
                  ยาที่ได้รับ ({visitDetail.medications.length})
                </h3>
                {visitDetail.medications.length === 0 ? (
                  <p className="text-xs text-muted-foreground">ไม่มีข้อมูลยา</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-primary/4 border-b">
                          <th className="text-left py-1.5 px-2 font-medium text-foreground/70">ชื่อยา</th>
                          <th className="text-left py-1.5 px-2 font-medium text-foreground/70">จำนวน</th>
                          <th className="text-left py-1.5 px-2 font-medium text-foreground/70">จับคู่</th>
                          <th className="text-right py-1.5 px-2 font-medium text-foreground/70">ราคา AIPN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitDetail.medications.map((med) => (
                          <tr key={med.id} className="border-b last:border-0">
                            <td className="py-1.5 px-2">
                              <div className="font-medium">{med.medicationName || med.rawLine}</div>
                              {med.resolvedAipnCode && (
                                <span className="text-[10px] text-foreground/50 font-mono">
                                  TMT: {med.resolvedAipnCode}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 tabular-nums">
                              {med.quantity ? `${med.quantity} ${med.unit || ''}` : '—'}
                            </td>
                            <td className="py-1.5 px-2">
                              {med.resolvedDrug ? (() => {
                                const isNonProtocol = nonProtocolDrugSet.has(
                                  med.resolvedDrug!.genericName.toLowerCase(),
                                );
                                const isSupportive = med.resolvedDrug!.drugCategory === 'supportive';
                                return (
                                  <div className="flex items-center gap-1">
                                    {isNonProtocol ? (
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
                                    ) : (
                                      <CheckCircle2 className={cn(
                                        'h-3.5 w-3.5 shrink-0',
                                        isSupportive
                                          ? 'text-slate-400 dark:text-slate-500'
                                          : 'text-green-600 dark:text-green-400',
                                      )} />
                                    )}
                                    <span className={cn(
                                      'font-semibold',
                                      isNonProtocol
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : isSupportive
                                          ? 'text-slate-500 dark:text-slate-400'
                                          : 'text-green-700 dark:text-green-400',
                                    )}>
                                      {med.resolvedDrug!.genericName}
                                    </span>
                                    {isNonProtocol && (
                                      <span className="text-[9px] text-rose-500/80 dark:text-rose-400/70 whitespace-nowrap">
                                        (นอกโปรโตคอล)
                                      </span>
                                    )}
                                  </div>
                                );
                              })() : (
                                <div className="flex items-center gap-1 text-foreground/40">
                                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span>ไม่พบ</span>
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              {med.aipnPricing ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/80">
                                    ฿{med.aipnPricing.rate.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className="text-[9px] text-foreground/40">/{med.aipnPricing.unit}</span>
                                  {med.formularyStatus?.inFormulary && (
                                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0 rounded text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40">
                                      <ClipboardCheck className="h-2.5 w-2.5" />ในบัญชี
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-foreground/25 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Protocol matches */}
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  โปรโตคอลที่เป็นไปได้
                  {!loadingMatch && ` (${matchResults.length})`}
                </h3>
                {loadingMatch ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    กำลังวิเคราะห์...
                  </div>
                ) : matchResults.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-warning-subtle border border-warning/20 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>ไม่พบโปรโตคอลที่ตรงกัน — อาจเป็นเพราะยังไม่มีข้อมูลยาหรือรหัส ICD-10 ไม่ตรงกับตำแหน่งมะเร็งในระบบ</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matchResults.map((match, idx) => {
                      const isConfirmed = isMatchConfirmed(match);
                      const isRadiation = match.protocolType === 'radiation';
                      const isNonProtocolCard = match.protocolId === 0;

                      return (
                      <div
                        key={`${match.protocolId}-${match.matchedRegimen?.regimenId ?? idx}`}
                        onClick={() => canConfirm && handleConfirmClick(match)}
                        className={cn(
                          'rounded-lg border p-3 text-xs transition-all',
                          isConfirmed
                            ? 'border-green-400/60 dark:border-green-600/50 bg-green-50/80 dark:bg-green-950/30 ring-1 ring-green-300/30 dark:ring-green-700/30'
                            : isNonProtocolCard
                              ? idx === 0
                                ? 'border-rose-400/50 dark:border-rose-600/40 bg-rose-50/60 dark:bg-rose-950/25'
                                : 'border-rose-200/50 dark:border-rose-700/30 hover:bg-rose-50/40 dark:hover:bg-rose-950/15'
                              : isRadiation
                                ? idx === 0
                                  ? 'border-orange-400/50 dark:border-orange-600/40 bg-orange-50/60 dark:bg-orange-950/25'
                                  : 'border-orange-200/50 dark:border-orange-700/30 hover:bg-orange-50/40 dark:hover:bg-orange-950/15'
                                : idx === 0
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'hover:bg-primary/4',
                          canConfirm && 'cursor-pointer hover:shadow-sm',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {isConfirmed && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                              )}
                              <span className={cn(
                                'font-mono text-[11px] font-semibold',
                                isConfirmed
                                  ? 'text-green-700 dark:text-green-400'
                                  : isRadiation
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-primary',
                              )}>
                                {match.protocolCode}
                              </span>
                              <span className="font-medium truncate">{match.protocolName}</span>
                              {match.matchedRegimen?.isPreferred && (
                                <Star className="h-3.5 w-3.5 text-yellow-500 shrink-0 fill-yellow-500" />
                              )}
                              {isConfirmed && (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                                  ยืนยันแล้ว
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1 mb-1.5">
                              {match.protocolType && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px] px-1.5 py-0 gap-0.5',
                                    isRadiation &&
                                      'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200/50 dark:border-orange-700/30',
                                  )}
                                >
                                  {isRadiation && <Radiation className="h-2.5 w-2.5" />}
                                  {match.protocolType.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {match.treatmentIntent && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                  {match.treatmentIntent}
                                </Badge>
                              )}
                              {/* Stage match indicator */}
                              {match.stageMatch === true && (
                                <Badge variant="success" className="text-[10px] px-1.5 py-0 gap-0.5">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  ตรงระยะ
                                </Badge>
                              )}
                              {match.stageMatch === false && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5 opacity-70">
                                  <XCircle className="h-2.5 w-2.5" />
                                  ไม่ตรงระยะ
                                </Badge>
                              )}
                              {/* Formulary compliance indicator */}
                              {match.formularyCompliance && (
                                <Badge
                                  variant={
                                    match.formularyCompliance.ratio >= 80
                                      ? 'success'
                                      : match.formularyCompliance.ratio > 0
                                        ? 'warning'
                                        : 'destructive'
                                  }
                                  className="text-[10px] px-1.5 py-0 gap-0.5"
                                >
                                  <ClipboardCheck className="h-2.5 w-2.5" />
                                  บัญชี SSO: {match.formularyCompliance.ratio}%
                                </Badge>
                              )}
                            </div>
                            <div className="text-foreground/60 space-y-0.5">
                              {match.matchedRegimen ? (
                                <>
                                  <p>
                                    สูตรยา: <span className="font-mono text-foreground/80">{match.matchedRegimen.regimenCode}</span>{' '}
                                    {match.matchedRegimen.regimenName}
                                  </p>
                                  <p>
                                    ยาตรงกัน: {match.matchedRegimen.matchedDrugs.length > 0
                                      ? match.matchedRegimen.matchedDrugs.join(', ')
                                      : '—'}{' '}
                                    ({match.matchedRegimen.matchedDrugs.length}/{match.matchedRegimen.totalDrugs})
                                  </p>
                                </>
                              ) : (
                                <p className="italic">ไม่มีสูตรยา (โปรโตคอลประเภท {match.protocolType})</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div
                              className={cn(
                                'text-lg font-bold tabular-nums',
                                match.score >= 70
                                  ? 'text-green-600 dark:text-green-400'
                                  : match.score >= 40
                                    ? 'text-yellow-600 dark:text-yellow-400'
                                    : 'text-foreground/50',
                              )}
                            >
                              {match.score}
                            </div>
                            <p className="text-[10px] text-foreground/50">คะแนน</p>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* AI Suggestion */}
              {canTriggerAi && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-violet-500" />
                      AI Suggestion
                    </h3>
                    <div className="flex items-center gap-1.5">
                      {aiSuggestion && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleAiRefresh}
                          disabled={loadingAi}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <RefreshCw className={cn('h-3 w-3', loadingAi && 'animate-spin')} />
                          Refresh
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAiSuggest}
                        disabled={loadingAi}
                        className="h-7 px-2.5 text-xs gap-1.5 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40"
                      >
                        {loadingAi ? (
                          <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {loadingAi ? 'กำลังวิเคราะห์...' : aiSuggestion ? 'วิเคราะห์ใหม่' : 'วิเคราะห์ด้วย AI'}
                      </Button>
                    </div>
                  </div>

                  {/* Error state */}
                  {aiError && !loadingAi && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>{aiError}</span>
                    </div>
                  )}

                  {/* Loading state */}
                  {loadingAi && !aiSuggestion && (
                    <div className="flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/20 p-4 text-xs text-violet-600 dark:text-violet-300">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
                      กำลังวิเคราะห์ด้วย AI... อาจใช้เวลาสักครู่
                    </div>
                  )}

                  {/* Result card */}
                  {aiSuggestion && aiSuggestion.status === 'SUCCESS' && (
                    <div className="rounded-lg border border-violet-200/80 dark:border-violet-800/50 bg-linear-to-br from-violet-50/80 via-white to-fuchsia-50/40 dark:from-violet-950/30 dark:via-card dark:to-fuchsia-950/20 p-3 space-y-3">
                      {/* Header: provider + cache badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-violet-300 dark:border-violet-700 text-violet-600 dark:text-violet-300">
                            {aiSuggestion.provider} / {aiSuggestion.model}
                          </Badge>
                          {aiCached && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Cached
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            'text-lg font-bold tabular-nums',
                            aiSuggestion.recommendation.confidenceScore >= 70
                              ? 'text-green-600 dark:text-green-400'
                              : aiSuggestion.recommendation.confidenceScore >= 40
                                ? 'text-yellow-600 dark:text-yellow-400'
                                : 'text-red-500 dark:text-red-400',
                          )}
                        >
                          {aiSuggestion.recommendation.confidenceScore}
                          <span className="text-[10px] font-normal text-foreground/50 ml-0.5">%</span>
                        </div>
                      </div>

                      {/* Recommended protocol */}
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground/60">แนะนำ:</span>
                          <span className="font-mono font-semibold text-violet-700 dark:text-violet-300">
                            {aiSuggestion.recommendation.recommendedProtocolCode}
                          </span>
                          {aiSuggestion.recommendation.recommendedRegimenCode && (
                            <>
                              <span className="text-foreground/40">/</span>
                              <span className="font-mono text-foreground/80">
                                {aiSuggestion.recommendation.recommendedRegimenCode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Reasoning */}
                      <div className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                        {aiSuggestion.recommendation.reasoning}
                      </div>

                      {/* Alternative protocols */}
                      {aiSuggestion.recommendation.alternativeProtocols.length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-foreground/60 hover:text-foreground transition-colors select-none">
                            ทางเลือกอื่น ({aiSuggestion.recommendation.alternativeProtocols.length})
                          </summary>
                          <div className="mt-1.5 space-y-1 pl-2 border-l-2 border-violet-200 dark:border-violet-800">
                            {aiSuggestion.recommendation.alternativeProtocols.map((alt, i) => (
                              <div key={i} className="text-foreground/70">
                                <span className="font-mono font-medium text-foreground/80">{alt.protocolCode}</span>
                                <span className="mx-1">—</span>
                                <span>{alt.reason}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Clinical notes */}
                      {aiSuggestion.recommendation.clinicalNotes && (
                        <div className="text-[11px] text-foreground/50 border-t border-dashed border-violet-200 dark:border-violet-800 pt-2">
                          {aiSuggestion.recommendation.clinicalNotes}
                        </div>
                      )}

                      {/* Footer: latency + tokens + timestamp */}
                      <div className="flex items-center gap-3 text-[10px] text-foreground/40 pt-1">
                        {aiSuggestion.latencyMs && (
                          <span>{(aiSuggestion.latencyMs / 1000).toFixed(1)}s</span>
                        )}
                        {aiSuggestion.tokensUsed && (
                          <span>{aiSuggestion.tokensUsed.toLocaleString()} tokens</span>
                        )}
                        <span>
                          {new Date(aiSuggestion.createdAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Error result from AI */}
                  {aiSuggestion && aiSuggestion.status !== 'SUCCESS' && (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-800/50 bg-red-50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-300">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>AI ไม่สามารถวิเคราะห์ได้: {aiSuggestion.status}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              <p className="text-sm">ไม่พบข้อมูล VN นี้</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      <ConfirmProtocolDialog
        open={!!confirmingMatch}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmingMatch(null)}
        loading={confirmLoading}
        match={confirmingMatch}
        selectedVn={selectedVn}
        patientId={visitDetail?.patient?.id ?? null}
        viewMode={viewMode}
      />

    </div>
  );
}
