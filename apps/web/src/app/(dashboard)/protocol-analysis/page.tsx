'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePersistedState } from '@/hooks/use-persisted-state';
import Link from 'next/link';
import {
  Upload,
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
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

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
  medicationName: string | null;
  quantity: string | null;
  unit: string | null;
  resolvedDrug: {
    id: number;
    genericName: string;
    tradeNames: { tradeName: string | null; drugCode: string }[];
  } | null;
}

interface VisitDetail {
  id: number;
  hn: string;
  vn: string;
  visitDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  medicationsRaw: string | null;
  resolvedSite: { id: number; siteCode: string; nameThai: string; nameEnglish: string } | null;
  medications: VisitMedication[];
  import: { id: number; filename: string; createdAt: string } | null;
  confirmedProtocolId: number | null;
  confirmedRegimenId: number | null;
  confirmedAt: string | null;
  confirmedProtocol: { id: number; protocolCode: string; nameEnglish: string; nameThai: string | null } | null;
  confirmedRegimen: { id: number; regimenCode: string; regimenName: string } | null;
  confirmedByUser: { id: number; fullName: string; fullNameThai: string | null } | null;
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
}

interface MatchResponse {
  results: MatchResult[];
  stageInference: StageInference;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface ConfirmationResponse {
  confirmedProtocolId: number;
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
  const [filterHasZ51, setFilterHasZ51, h6] = usePersistedState('pa:filterZ51', false);
  const filtersHydrated = h1 && h2 && h3 && h4 && h5 && h6;

  // Transient state (not persisted)
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [vnSearch, setVnSearch] = useState('');
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [visitDetail, setVisitDetail] = useState<VisitDetail | null>(null);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [stageInference, setStageInference] = useState<StageInference | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);
  const [cancerSites, setCancerSites] = useState<CancerSite[]>([]);
  const [confirmingMatch, setConfirmingMatch] = useState<MatchResult | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const hasActiveFilters = !!filterSiteId || filterHasMeds || filterHasZ51;

  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestionResponse | null>(null);
  const [aiCached, setAiCached] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);
  const [clearStats, setClearStats] = useState<{
    imports: number; visits: number; medications: number; aiSuggestions: number;
  } | null>(null);

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
      if (filterHasZ51) params.set('hasZ51', 'true');
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
  }, [patientSearch, filterSiteId, filterHasMeds, filterHasZ51, hasActiveFilters, filtersHydrated]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

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
    const params = new URLSearchParams({ limit: '100', sortOrder: 'desc' });
    if (filterSiteId) params.set('cancerSiteId', filterSiteId);
    if (filterHasMeds) params.set('hasMedications', 'true');
    if (filterHasZ51) params.set('hasZ51', 'true');
    apiClient
      .get<PaginatedResponse<VisitSummary>>(
        `/protocol-analysis/patients/${selectedHn}/visits?${params}`,
      )
      .then((res) => setVisits(res.data))
      .catch(() => setVisits([]))
      .finally(() => setLoadingVisits(false));
  }, [selectedHn, filterSiteId, filterHasMeds, filterHasZ51, filtersHydrated]);

  // ─── Fetch visit detail + match ────────────────────────────
  useEffect(() => {
    if (!selectedVn) {
      setVisitDetail(null);
      setMatchResults([]);
      setStageInference(null);
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
      })
      .catch(() => {
        setMatchResults([]);
        setStageInference(null);
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
    setFilterHasZ51(false);
  };

  // ─── Filtered visits (client-side VN search) ──────────────
  const filteredVisits = vnSearch
    ? visits.filter(
        (v) =>
          v.vn.includes(vnSearch) ||
          v.primaryDiagnosis.toLowerCase().includes(vnSearch.toLowerCase()),
      )
    : visits;

  // ─── Confirmation handlers ─────────────────────────────────
  const handleConfirmClick = (match: MatchResult) => {
    if (
      visitDetail?.confirmedProtocolId === match.protocolId &&
      visitDetail?.confirmedRegimenId === (match.matchedRegimen?.regimenId || null)
    ) {
      handleUnconfirm();
      return;
    }
    setConfirmingMatch(match);
  };

  const handleConfirm = async () => {
    if (!confirmingMatch || !selectedVn) return;
    setConfirmLoading(true);
    try {
      const result = await apiClient.patch<ConfirmationResponse>(
        `/protocol-analysis/visits/${selectedVn}/confirm`,
        {
          protocolId: confirmingMatch.protocolId,
          regimenId: confirmingMatch.matchedRegimen?.regimenId || undefined,
        },
      );
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
      setVisits((prev) =>
        prev.map((v) =>
          v.vn === selectedVn
            ? { ...v, confirmedProtocolId: result.confirmedProtocolId, confirmedAt: result.confirmedAt }
            : v,
        ),
      );
      setConfirmingMatch(null);
    } catch {
      // silently fail — user sees no change
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleUnconfirm = async () => {
    if (!selectedVn) return;
    try {
      await apiClient.delete(`/protocol-analysis/visits/${selectedVn}/confirm`);
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
            }
          : prev,
      );
      setVisits((prev) =>
        prev.map((v) =>
          v.vn === selectedVn ? { ...v, confirmedProtocolId: null, confirmedAt: null } : v,
        ),
      );
    } catch {
      // silently fail
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

  // ─── Clear all visit data handlers ────────────────────────────
  const handleClearClick = async () => {
    try {
      const stats = await apiClient.get<{
        imports: number; visits: number; medications: number; aiSuggestions: number;
      }>('/protocol-analysis/imports/stats');
      setClearStats(stats);
      setClearDialogOpen(true);
    } catch {
      toast.error('ไม่สามารถดึงข้อมูลสถิติได้');
    }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const result = await apiClient.delete<{
        deletedImports: number; deletedVisits: number; deletedMedications: number; deletedAiSuggestions: number;
      }>('/protocol-analysis/imports/all');
      toast.success(`ลบสำเร็จ — ${result.deletedImports} ชุดนำเข้า, ${result.deletedVisits} visits`);
      setClearDialogOpen(false);
      setPatients([]);
      setVisits([]);
      setSelectedHn(null);
      setSelectedVn(null);
      setVisitDetail(null);
      setMatchResults([]);
      setStageInference(null);
      setAiSuggestion(null);
      setIsEmpty(true);
      fetchPatients();
    } catch (err: unknown) {
      const msg = (err as { error?: { message?: string } })?.error?.message || 'ลบข้อมูลไม่สำเร็จ';
      toast.error(msg);
    } finally {
      setClearLoading(false);
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
          เริ่มต้นโดยนำเข้าข้อมูลผู้ป่วยจากไฟล์ Excel เพื่อวิเคราะห์
          และจับคู่กับโปรโตคอลการรักษาในระบบ
        </p>
        <Button asChild>
          <Link href="/protocol-analysis/import">
            <Upload className="h-4 w-4 mr-2" />
            นำเข้าข้อมูล
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <SearchCheck className="h-6 w-6 text-primary" />
            วิเคราะห์โปรโตคอล
          </h1>
          <p className="text-sm text-muted-foreground">
            เลือก HN &rarr; VN เพื่อดูรายละเอียดและจับคู่โปรโตคอล
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'SUPER_ADMIN' && patients.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearClick}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              ล้างข้อมูล
            </Button>
          )}
          <Button asChild size="sm">
            <Link href="/protocol-analysis/import">
              <Upload className="h-4 w-4 mr-1" />
              นำเข้าข้อมูล
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap rounded-lg border bg-card px-3 py-2">
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
            checked={filterHasZ51}
            onChange={(e) => setFilterHasZ51(e.target.checked)}
            className="rounded border-input accent-primary h-3.5 w-3.5"
          />
          Z51x (รักษา)
        </label>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
          >
            <X className="h-3 w-3" />
            ล้าง
          </button>
        )}
      </div>

      {/* 3-Column layout */}
      <div className="flex gap-0 border rounded-xl overflow-hidden bg-card" style={{ height: 'calc(100vh - 260px)' }}>
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
                className="w-full rounded-md border bg-transparent py-1.5 pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-primary"
              />
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
                placeholder="ค้นหา VN..."
                value={vnSearch}
                onChange={(e) => setVnSearch(e.target.value)}
                disabled={!selectedHn}
                className="w-full rounded-md border bg-transparent py-1.5 pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
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
                {vnSearch ? 'ไม่พบ VN ที่ค้นหา' : 'ไม่มี VN'}
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
                    <span className="font-mono font-medium">{v.vn}</span>
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
              <p className="text-sm">&larr; เลือก VN เพื่อดูรายละเอียด</p>
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
                  <h2 className="font-heading text-base font-bold">VN: {visitDetail.vn}</h2>
                  {visitDetail.resolvedSite && (
                    <Badge variant="outline" className="text-xs">
                      {visitDetail.resolvedSite.nameThai}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground/60">
                  <span>HN: <span className="font-mono text-foreground/80">{visitDetail.hn}</span></span>
                  <span>วันที่: {new Date(visitDetail.visitDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span>วินิจฉัยหลัก: <span className="font-mono text-foreground">{visitDetail.primaryDiagnosis}</span></span>
                </div>
                {visitDetail.secondaryDiagnoses && (
                  <p className="text-xs text-foreground/60 mt-1">
                    วินิจฉัยรอง: <span className="font-mono text-foreground/80">{visitDetail.secondaryDiagnoses.replace(/\|/g, ', ')}</span>
                  </p>
                )}
              </div>

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
                        </tr>
                      </thead>
                      <tbody>
                        {visitDetail.medications.map((med) => (
                          <tr key={med.id} className="border-b last:border-0">
                            <td className="py-1.5 px-2">
                              <div className="font-medium">{med.medicationName || med.rawLine}</div>
                              {med.hospitalCode && (
                                <span className="text-[10px] text-foreground/50 font-mono">
                                  รหัส: {med.hospitalCode}
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 tabular-nums">
                              {med.quantity ? `${med.quantity} ${med.unit || ''}` : '—'}
                            </td>
                            <td className="py-1.5 px-2">
                              {med.resolvedDrug ? (
                                <div className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400 shrink-0" />
                                  <span className="text-green-700 dark:text-green-400">
                                    {med.resolvedDrug.genericName}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-foreground/40">
                                  <XCircle className="h-3.5 w-3.5 shrink-0" />
                                  <span>ไม่พบ</span>
                                </div>
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
                ) : matchResults[0]?.protocolId === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-warning-subtle border border-warning/20 p-3 text-xs">
                    <AlertTriangle className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>{matchResults[0].reasons[0]}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {matchResults.map((match, idx) => {
                      const isConfirmed =
                        visitDetail?.confirmedProtocolId === match.protocolId &&
                        visitDetail?.confirmedRegimenId === (match.matchedRegimen?.regimenId || null);

                      return (
                      <div
                        key={`${match.protocolId}-${match.matchedRegimen?.regimenId ?? idx}`}
                        onClick={() => canConfirm && match.protocolId !== 0 && handleConfirmClick(match)}
                        className={cn(
                          'rounded-lg border p-3 text-xs transition-all',
                          isConfirmed
                            ? 'border-green-400/60 dark:border-green-600/50 bg-green-50/80 dark:bg-green-950/30 ring-1 ring-green-300/30 dark:ring-green-700/30'
                            : idx === 0
                              ? 'border-primary/40 bg-primary/5'
                              : 'hover:bg-primary/4',
                          canConfirm && match.protocolId !== 0 && 'cursor-pointer hover:shadow-sm',
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
                                isConfirmed ? 'text-green-700 dark:text-green-400' : 'text-primary',
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
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
      <ConfirmDialog
        open={!!confirmingMatch}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmingMatch(null)}
        title="ยืนยันโปรโตคอล"
        description={
          confirmingMatch
            ? `ยืนยัน ${confirmingMatch.protocolCode} — ${confirmingMatch.protocolName}${confirmingMatch.matchedRegimen ? ` (สูตร ${confirmingMatch.matchedRegimen.regimenCode})` : ''} สำหรับ VN ${selectedVn}?`
            : ''
        }
        loading={confirmLoading}
      />

      {/* Clear all visit data dialog */}
      <ConfirmDialog
        open={clearDialogOpen}
        onConfirm={handleClearAll}
        onCancel={() => setClearDialogOpen(false)}
        title="ล้างข้อมูล Visit ทั้งหมด"
        description={
          clearStats
            ? `คุณกำลังจะลบข้อมูลทั้งหมด:\n• ${clearStats.imports} ชุดนำเข้า\n• ${clearStats.visits} visits\n• ${clearStats.medications} รายการยา\n• ${clearStats.aiSuggestions} AI suggestions\n\nข้อมูลที่ลบไปจะไม่สามารถกู้คืนได้`
            : ''
        }
        confirmText="ลบทั้งหมด"
        variant="destructive"
        loading={clearLoading}
      />
    </div>
  );
}
