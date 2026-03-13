'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Search,
  AlertCircle,
  Calendar,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Ban,
  ChevronDown,
  Users,
  Info,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { CancerSiteMultiSelect } from '@/components/shared/cancer-site-multi-select';
import { DrugMultiSelect } from '@/components/shared/drug-multi-select';
import { type HisPatient } from '@/app/(dashboard)/cancer-patients/components/patient-search-results';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportPhase = 'idle' | 'searching' | 'preview' | 'importing' | 'completed';

interface BulkImportProgress {
  total: number;
  completed: number;
  currentHn?: string;
  currentName?: string;
  step?: 'OPD' | 'IPD';
  startedAt: number;
  avgTimePerPatient: number;
}

interface PatientImportLog {
  hn: string;
  fullName: string;
  status: 'success' | 'partial' | 'failed';
  opdVisits: number;
  ipdAdmissions: number;
  opdError?: string;
  ipdError?: string;
  durationMs: number;
}

interface ImportSummary {
  totalPatients: number;
  successPatients: number;
  partialPatients: number;
  failedPatients: number;
  totalOpdVisits: number;
  totalIpdAdmissions: number;
  elapsedMs: number;
  cancelled: boolean;
  errors: { hn: string; fullName: string; opdError?: string; ipdError?: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultDateRange(): { from: string; to: string } {
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setDate(monthAgo.getDate() - 30);
  return { from: formatDate(monthAgo), to: formatDate(today) };
}

/** Split a date range into ≤31-day chunks for backend compliance */
function splitDateRange(from: string, to: string): { from: string; to: string }[] {
  const chunks: { from: string; to: string }[] = [];
  let cursor = new Date(from);
  const end = new Date(to);
  while (cursor <= end) {
    const chunkEnd = new Date(cursor);
    chunkEnd.setDate(chunkEnd.getDate() + 30); // 31-day window (inclusive)
    const actualEnd = chunkEnd > end ? end : chunkEnd;
    chunks.push({ from: formatDate(cursor), to: formatDate(actualEnd) });
    cursor = new Date(actualEnd);
    cursor.setDate(cursor.getDate() + 1);
  }
  return chunks;
}

/** Merge multiple search results by HN — deduplicate, sum matchingVisitCount */
function mergePatientResults(batches: HisPatient[][]): HisPatient[] {
  const map = new Map<string, HisPatient>();
  for (const batch of batches) {
    for (const p of batch) {
      const existing = map.get(p.hn);
      if (existing) {
        // Sum visit counts across chunks
        existing.matchingVisitCount =
          (existing.matchingVisitCount ?? 0) + (p.matchingVisitCount ?? 0);
        existing.totalVisitCount =
          (existing.totalVisitCount ?? 0) + (p.totalVisitCount ?? 0);
        // Keep latest importedVisitCount / existsInSystem (same across chunks)
        if (p.existsInSystem) existing.existsInSystem = true;
        if ((p.importedVisitCount ?? 0) > (existing.importedVisitCount ?? 0)) {
          existing.importedVisitCount = p.importedVisitCount;
        }
      } else {
        map.set(p.hn, { ...p });
      }
    }
  }
  // Sort by matchingVisitCount descending
  return [...map.values()].sort(
    (a, b) => (b.matchingVisitCount ?? 0) - (a.matchingVisitCount ?? 0),
  );
}

function formatThaiMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const thaiMonths = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];
  return `${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function formatEta(progress: BulkImportProgress): string {
  if (progress.completed === 0) return 'กำลังประมาณ...';
  const remaining = progress.total - progress.completed;
  const etaMs = remaining * progress.avgTimePerPatient;
  const etaSec = Math.ceil(etaMs / 1000);
  if (etaSec < 60) return `ประมาณ ${etaSec} วินาที`;
  const etaMin = Math.ceil(etaMs / 60000);
  if (etaMin === 1) return 'ประมาณ 1 นาที';
  return `ประมาณ ${etaMin} นาที`;
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} วินาที`;
  const min = Math.floor(sec / 60);
  const remSec = sec % 60;
  return `${min} นาที ${remSec} วินาที`;
}

function formatEstimatedTime(count: number): string {
  const totalSec = Math.ceil(count * 2.4);
  if (totalSec < 60) return `~${totalSec} วินาที`;
  const min = Math.ceil(totalSec / 60);
  return `~${min} นาที`;
}

const isAlreadyImportedError = (msg: string) =>
  msg.includes('นำเข้าแล้ว') || msg.includes('ไม่พบ visit') || msg.includes('ไม่พบ admission');

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const user = useAuthStore((s) => s.user);
  const defaults = getDefaultDateRange();

  // Filter state (persisted)
  const [dateFrom, setDateFrom, dfH] = usePersistedState('bulk-import:dateFrom', defaults.from);
  const [dateTo, setDateTo, dtH] = usePersistedState('bulk-import:dateTo', defaults.to);
  const [cancerSiteIds, setCancerSiteIds, csH] = usePersistedState<string[]>(
    'bulk-import:sites',
    [],
  );
  const [z510, setZ510, z0H] = usePersistedState('bulk-import:z510', false);
  const [z511, setZ511, z1H] = usePersistedState('bulk-import:z511', false);
  const [selectedDrugs, setSelectedDrugs, sdH] = usePersistedState<string[]>(
    'bulk-import:drugs',
    [],
  );
  const filtersHydrated = dfH && dtH && csH && z0H && z1H && sdH;

  // Phase + search state
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [results, setResults] = useState<HisPatient[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Search progress (for multi-chunk)
  const [searchProgress, setSearchProgress] = useState<{
    current: number;
    total: number;
    chunkLabel: string;
  } | null>(null);

  // Preview state
  const [showNewOnly, setShowNewOnly] = useState(true);
  const [showPatientList, setShowPatientList] = useState(false);

  // Import tracking
  const cancelRef = useRef(false);
  const [progress, setProgress] = useState<BulkImportProgress | null>(null);
  const [patientLogs, setPatientLogs] = useState<PatientImportLog[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Derived: patients to import
  const importTargets = useMemo(() => {
    if (!showNewOnly) return results;
    return results.filter(
      (p) => !p.existsInSystem || (p.matchingVisitCount ?? 0) > (p.importedVisitCount ?? 0),
    );
  }, [results, showNewOnly]);

  const alreadyImportedCount = useMemo(() => {
    return results.filter(
      (p) => p.existsInSystem && (p.matchingVisitCount ?? 0) <= (p.importedVisitCount ?? 0),
    ).length;
  }, [results]);

  // Date validation (no 31-day limit — auto-chunking handles long ranges)
  const dateValidation = useMemo(() => {
    if (!dateFrom || !dateTo) return { valid: false, error: 'กรุณาเลือกวันที่', days: 0 };
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { valid: false, error: 'วันเริ่มต้นต้องก่อนวันสิ้นสุด', days: 0 };
    return { valid: true, error: null, days: Math.ceil(diff) };
  }, [dateFrom, dateTo]);

  const dateChunks = useMemo(() => {
    if (!dateValidation.valid || !dateFrom || !dateTo) return [];
    return splitDateRange(dateFrom, dateTo);
  }, [dateValidation.valid, dateFrom, dateTo]);

  const canSearch = dateValidation.valid && phase !== 'searching' && phase !== 'importing';

  // Month shortcuts
  const setCurrentMonth = () => {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(formatDate(firstOfMonth));
    setDateTo(formatDate(today));
  };
  const setPreviousMonth = () => {
    const ref = dateFrom ? new Date(dateFrom) : new Date();
    const firstOfPrev = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
    const lastOfPrev = new Date(ref.getFullYear(), ref.getMonth(), 0);
    setDateFrom(formatDate(firstOfPrev));
    setDateTo(formatDate(lastOfPrev));
  };
  const setNextMonth = () => {
    const ref = dateFrom ? new Date(dateFrom) : new Date();
    const firstOfNext = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
    const lastOfNext = new Date(ref.getFullYear(), ref.getMonth() + 2, 0);
    setDateFrom(formatDate(firstOfNext));
    setDateTo(formatDate(lastOfNext));
  };
  const setCurrentYear = () => {
    const today = new Date();
    const firstOfYear = new Date(today.getFullYear(), 0, 1);
    setDateFrom(formatDate(firstOfYear));
    setDateTo(formatDate(today));
  };
  const setPreviousYear = () => {
    const ref = dateFrom ? new Date(dateFrom) : new Date();
    const y = ref.getFullYear() - 1;
    setDateFrom(formatDate(new Date(y, 0, 1)));
    setDateTo(formatDate(new Date(y, 11, 31)));
  };

  // ─── Search handler (auto-chunks long date ranges) ─────────────────

  const handleSearch = useCallback(async () => {
    if (!canSearch || dateChunks.length === 0) return;
    setPhase('searching');
    setSearchError(null);
    setSummary(null);
    setPatientLogs([]);
    setShowPatientList(false);
    setSearchProgress(null);

    try {
      const secondaryDiagCodes: string[] = [];
      if (z510) secondaryDiagCodes.push('Z510');
      if (z511) secondaryDiagCodes.push('Z511');

      const allBatches: HisPatient[][] = [];

      for (let i = 0; i < dateChunks.length; i++) {
        const chunk = dateChunks[i];
        setSearchProgress({
          current: i + 1,
          total: dateChunks.length,
          chunkLabel: `${formatThaiMonth(chunk.from)}`,
        });

        const body: Record<string, unknown> = { from: chunk.from, to: chunk.to };
        if (cancerSiteIds.length > 0) body.cancerSiteIds = cancerSiteIds;
        if (secondaryDiagCodes.length > 0) body.secondaryDiagCodes = secondaryDiagCodes;
        if (selectedDrugs.length > 0) body.drugNames = selectedDrugs;

        const data = await apiClient.post<HisPatient[]>(
          '/his-integration/search/advanced',
          body,
        );
        allBatches.push(data);
      }

      setSearchProgress(null);

      // Merge & deduplicate across all chunks
      const merged = mergePatientResults(allBatches);
      setResults(merged);
      setPhase(merged.length > 0 ? 'preview' : 'idle');
      if (merged.length === 0) {
        toast.info('ไม่พบผู้ป่วยจากระบบ HIS ตามเงื่อนไขที่กำหนด');
      }
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถค้นหาจาก HIS ได้';
      setSearchError(msg);
      setSearchProgress(null);
      setResults([]);
      setPhase('idle');
    }
  }, [canSearch, dateChunks, cancerSiteIds, z510, z511, selectedDrugs]);

  // ─── Bulk import handler ─────────────────────────────────────────────

  const handleBulkImport = useCallback(async () => {
    const patients = importTargets;
    if (patients.length === 0) return;

    setPhase('importing');
    cancelRef.current = false;
    setPatientLogs([]);
    setShowErrors(false);
    const startedAt = Date.now();

    let successCount = 0;
    let partialCount = 0;
    let failCount = 0;
    let totalOpd = 0;
    let totalIpd = 0;
    const errors: ImportSummary['errors'] = [];
    const DELAY_MS = 1200;

    for (let i = 0; i < patients.length; i++) {
      if (cancelRef.current) break;

      const p = patients[i];
      const patientStart = Date.now();
      let opdVisits = 0;
      let ipdAdmissions = 0;
      let opdOk = false;
      let ipdOk = false;
      let opdError = '';
      let ipdError = '';

      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const qs = params.toString();
      const suffix = qs ? `?${qs}` : '';

      // OPD
      setProgress({
        total: patients.length,
        completed: i,
        currentHn: p.hn,
        currentName: p.fullName,
        step: 'OPD',
        startedAt,
        avgTimePerPatient: i > 0 ? (Date.now() - startedAt) / i : 8000,
      });

      try {
        const r = await apiClient.post<{ patientId: number; importedVisits: number }>(
          `/his-integration/import/${encodeURIComponent(p.hn)}${suffix}`,
        );
        opdVisits = r.importedVisits;
        totalOpd += r.importedVisits;
        opdOk = true;
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || '';
        if (isAlreadyImportedError(msg)) opdOk = true;
        else opdError = msg;
      }

      // IPD
      setProgress((prev) => (prev ? { ...prev, step: 'IPD' } : prev));

      try {
        const r = await apiClient.post<{ patientId: number; importedVisits: number }>(
          `/his-integration/ipd/import/${encodeURIComponent(p.hn)}${suffix}`,
        );
        ipdAdmissions = r.importedVisits;
        totalIpd += r.importedVisits;
        ipdOk = true;
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || '';
        if (isAlreadyImportedError(msg)) ipdOk = true;
        else ipdError = msg;
      }

      // Classify
      const bothOk = opdOk && ipdOk;
      const bothFail = !opdOk && !ipdOk;
      if (bothOk) successCount++;
      else if (bothFail) {
        failCount++;
        errors.push({ hn: p.hn, fullName: p.fullName, opdError, ipdError });
      } else {
        partialCount++;
        errors.push({
          hn: p.hn,
          fullName: p.fullName,
          opdError: opdError || undefined,
          ipdError: ipdError || undefined,
        });
      }

      // Log
      setPatientLogs((prev) => [
        ...prev,
        {
          hn: p.hn,
          fullName: p.fullName,
          status: bothFail ? 'failed' : bothOk ? 'success' : 'partial',
          opdVisits,
          ipdAdmissions,
          opdError: opdError || undefined,
          ipdError: ipdError || undefined,
          durationMs: Date.now() - patientStart,
        },
      ]);

      // Update running avg
      const totalElapsed = Date.now() - startedAt;
      setProgress((prev) =>
        prev ? { ...prev, completed: i + 1, avgTimePerPatient: totalElapsed / (i + 1) } : prev,
      );

      // Rate-limit delay
      if (i < patients.length - 1 && !cancelRef.current) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    const cancelled = cancelRef.current;
    const processed = successCount + partialCount + failCount;

    setSummary({
      totalPatients: processed,
      successPatients: successCount,
      partialPatients: partialCount,
      failedPatients: failCount,
      totalOpdVisits: totalOpd,
      totalIpdAdmissions: totalIpd,
      elapsedMs: Date.now() - startedAt,
      cancelled,
      errors,
    });
    setProgress(null);
    setPhase('completed');

    if (cancelled) {
      toast.info(`ยกเลิกการนำเข้า — ดำเนินการแล้ว ${processed} ราย`);
    }
  }, [importTargets, dateFrom, dateTo]);

  // ─── Reset ──────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setPhase('idle');
    setResults([]);
    setSummary(null);
    setPatientLogs([]);
    setProgress(null);
    setSearchProgress(null);
    setSearchError(null);
    setShowPatientList(false);
  }, []);

  // ─── Access control ─────────────────────────────────────────────────

  if (!user || user.role !== 'SUPER_ADMIN') {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        <Ban className="h-5 w-5 mr-2" />
        เฉพาะ SUPER_ADMIN เท่านั้น
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2 text-muted-foreground"
        >
          <Link href="/settings/maintenance">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ดูแลระบบ
          </Link>
        </Button>
        <h1 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          นำเข้าข้อมูลจำนวนมาก (Bulk Import)
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          กำหนดเงื่อนไข &rarr; ดูสรุป &rarr; นำเข้าทั้งหมดในคลิกเดียว (OPD + IPD)
        </p>
      </div>

      {/* Filter Card — visible in idle, searching, preview */}
      {phase !== 'importing' && phase !== 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              เงื่อนไขการค้นหา
            </CardTitle>
          </CardHeader>
          <CardContent className={cn('space-y-5', !filtersHydrated && 'opacity-0')}>
            {/* Date range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                ช่วงวันที่รับบริการ <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2 flex-wrap">
                <ThaiDatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="วันเริ่มต้น"
                  className="flex-1 min-w-[140px]"
                />
                <span className="text-sm text-muted-foreground shrink-0">ถึง</span>
                <ThaiDatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder="วันสิ้นสุด"
                  className="flex-1 min-w-[140px]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setPreviousMonth}
                  className="shrink-0 text-xs"
                >
                  เดือนก่อนหน้า
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setCurrentMonth}
                  className="shrink-0 text-xs"
                >
                  เดือนปัจจุบัน
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setNextMonth}
                  className="shrink-0 text-xs"
                >
                  เดือนถัดไป
                </Button>
                <span className="text-muted-foreground text-xs">|</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setCurrentYear}
                  className="shrink-0 text-xs"
                >
                  ปีปัจจุบัน
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={setPreviousYear}
                  className="shrink-0 text-xs"
                >
                  ปีก่อนหน้า
                </Button>
              </div>
              {dateValidation.error && (
                <p className="text-xs text-destructive">{dateValidation.error}</p>
              )}
              {dateChunks.length > 1 && (
                <p className="text-xs text-muted-foreground">
                  ช่วง {dateValidation.days} วัน — ระบบจะแบ่งค้นหาอัตโนมัติ {dateChunks.length}{' '}
                  รอบ (รอบละไม่เกิน 31 วัน)
                </p>
              )}
            </div>

            {/* Cancer site */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ตำแหน่งมะเร็ง</Label>
              <CancerSiteMultiSelect value={cancerSiteIds} onChange={setCancerSiteIds} />
            </div>

            {/* Secondary diagnosis */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">การวินิจฉัยรอง</Label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={z510}
                    onChange={(e) => setZ510(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                  <span className="text-sm">Z510 — รังสีรักษา</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={z511}
                    onChange={(e) => setZ511(e.target.checked)}
                    className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  />
                  <span className="text-sm">Z511 — เคมีบำบัด</span>
                </label>
              </div>
            </div>

            {/* Drug names */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ยาในโปรโตคอล (ชื่อสามัญ)</Label>
              <DrugMultiSelect value={selectedDrugs} onChange={setSelectedDrugs} />
            </div>

            {/* Search button + progress */}
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button onClick={handleSearch} disabled={!canSearch}>
                  {phase === 'searching' ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="ml-1.5">ค้นหาจาก HIS</span>
                </Button>
              </div>
              {phase === 'searching' && searchProgress && searchProgress.total > 1 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      กำลังค้นหา {searchProgress.current}/{searchProgress.total} รอบ
                      <span className="ml-1.5">({searchProgress.chunkLabel})</span>
                    </span>
                    <span className="font-mono">
                      {Math.round((searchProgress.current / searchProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${(searchProgress.current / searchProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {searchError && (
              <div className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {searchError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preview phase — summary card */}
      {phase === 'preview' && results.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              สรุปผลการค้นหา
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{results.length}</p>
                <p className="text-xs text-muted-foreground">พบทั้งหมด</p>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/[0.03] p-3 text-center">
                <p className="text-2xl font-bold text-primary">{importTargets.length}</p>
                <p className="text-xs text-muted-foreground">
                  {showNewOnly ? 'รายใหม่/มีข้อมูลใหม่' : 'จะนำเข้า'}
                </p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-muted-foreground">
                  {alreadyImportedCount}
                </p>
                <p className="text-xs text-muted-foreground">นำเข้าครบแล้ว</p>
              </div>
            </div>

            {/* New only toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showNewOnly}
                onChange={(e) => setShowNewOnly(e.target.checked)}
                className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <span className="text-sm">เฉพาะรายใหม่/มีข้อมูลใหม่</span>
              {showNewOnly && alreadyImportedCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  (ข้าม {alreadyImportedCount} รายที่นำเข้าครบแล้ว)
                </span>
              )}
            </label>

            {/* Time estimate + info */}
            <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>
                  ประมาณเวลา:{' '}
                  <strong>{formatEstimatedTime(importTargets.length)}</strong>
                  <span className="text-muted-foreground ml-1">
                    ({importTargets.length} ราย)
                  </span>
                </span>
              </div>
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  ระบบจะนำเข้าทีละ 1 ราย (OPD+IPD) พร้อมหน่วงเวลาเพื่อไม่ให้ HIS server
                  ทำงานหนักเกินไป
                </span>
              </div>
            </div>

            {/* Collapsible patient list */}
            <div>
              <button
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPatientList(!showPatientList)}
              >
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform',
                    showPatientList && 'rotate-180',
                  )}
                />
                ดูรายชื่อ ({importTargets.length} ราย)
              </button>
              {showPatientList && (
                <div className="mt-2 max-h-[400px] overflow-y-auto rounded-lg border divide-y text-xs">
                  {importTargets.map((p) => (
                    <div key={p.hn} className="flex items-center gap-3 px-3 py-2">
                      <span className="font-mono text-muted-foreground w-16 shrink-0">
                        {p.hn}
                      </span>
                      <span className="min-w-0 truncate flex-1">{p.fullName}</span>
                      <span className="text-muted-foreground shrink-0">
                        {p.matchingVisitCount ?? p.totalVisitCount ?? '?'} visits
                      </span>
                      {(p.importedVisitCount ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          นำเข้าแล้ว {p.importedVisitCount}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between pt-1">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                ค้นหาใหม่
              </Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleBulkImport}
                disabled={importTargets.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                นำเข้าทั้งหมด ({importTargets.length} ราย)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Importing phase */}
      {phase === 'importing' && progress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              กำลังนำเข้าข้อมูล
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Overall progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {progress.completed}/{progress.total} ราย
                  {progress.currentHn && (
                    <span className="ml-2 text-muted-foreground">
                      HN: {progress.currentHn}
                      {progress.currentName && ` — ${progress.currentName}`}
                      {progress.step && (
                        <Badge variant="outline" className="ml-1.5 text-[10px] py-0">
                          {progress.step}
                        </Badge>
                      )}
                    </span>
                  )}
                </span>
                <span className="font-mono text-sm">
                  {progress.total > 0
                    ? Math.round((progress.completed / progress.total) * 100)
                    : 0}
                  %
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{
                    width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatEta(progress)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    cancelRef.current = true;
                  }}
                >
                  <Ban className="h-3 w-3" />
                  ยกเลิก
                </Button>
              </div>
            </div>

            {/* Per-patient log */}
            {patientLogs.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border divide-y text-xs">
                {patientLogs.map((log) => (
                  <div
                    key={log.hn}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2',
                      log.status === 'failed' && 'bg-destructive/5',
                      log.status === 'partial' && 'bg-amber-50 dark:bg-amber-950/20',
                    )}
                  >
                    {log.status === 'success' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    {log.status === 'partial' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    {log.status === 'failed' && (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className="font-mono text-muted-foreground w-16 shrink-0">
                      {log.hn}
                    </span>
                    <span className="min-w-0 truncate flex-1">{log.fullName}</span>
                    <span className="text-muted-foreground shrink-0">
                      OPD: {log.opdVisits} | IPD: {log.ipdAdmissions}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed phase */}
      {phase === 'completed' && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {summary.failedPatients === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              {summary.cancelled ? 'ยกเลิกการนำเข้า' : 'นำเข้าเสร็จสิ้น'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{summary.totalPatients}</p>
                <p className="text-xs text-muted-foreground">ผู้ป่วยทั้งหมด</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{summary.successPatients}</p>
                <p className="text-xs text-muted-foreground">สำเร็จ</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{summary.partialPatients}</p>
                <p className="text-xs text-muted-foreground">บางส่วน</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-destructive">{summary.failedPatients}</p>
                <p className="text-xs text-muted-foreground">ล้มเหลว</p>
              </div>
            </div>

            {/* Visit counts + time */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
              <span>
                OPD: <strong className="text-foreground">{summary.totalOpdVisits}</strong> visits
              </span>
              <span>
                IPD:{' '}
                <strong className="text-foreground">{summary.totalIpdAdmissions}</strong>{' '}
                admissions
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatDuration(summary.elapsedMs)}
              </span>
            </div>

            {/* Error details */}
            {summary.errors.length > 0 && (
              <div className="space-y-2">
                <button
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowErrors(!showErrors)}
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      showErrors && 'rotate-180',
                    )}
                  />
                  ดูรายละเอียดข้อผิดพลาด ({summary.errors.length})
                </button>
                {showErrors && (
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border divide-y text-xs">
                    {summary.errors.map((e) => (
                      <div key={e.hn} className="px-3 py-2 space-y-0.5">
                        <p className="font-medium">
                          HN: {e.hn} — {e.fullName}
                        </p>
                        {e.opdError && <p className="text-destructive">OPD: {e.opdError}</p>}
                        {e.ipdError && <p className="text-destructive">IPD: {e.ipdError}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Per-patient log */}
            {patientLogs.length > 0 && (
              <div className="max-h-[300px] overflow-y-auto rounded-lg border divide-y text-xs">
                {patientLogs.map((log) => (
                  <div
                    key={log.hn}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2',
                      log.status === 'failed' && 'bg-destructive/5',
                      log.status === 'partial' && 'bg-amber-50 dark:bg-amber-950/20',
                    )}
                  >
                    {log.status === 'success' && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    )}
                    {log.status === 'partial' && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    {log.status === 'failed' && (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <span className="font-mono text-muted-foreground w-16 shrink-0">
                      {log.hn}
                    </span>
                    <span className="min-w-0 truncate flex-1">{log.fullName}</span>
                    <span className="text-muted-foreground shrink-0">
                      OPD: {log.opdVisits} | IPD: {log.ipdAdmissions}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleReset} className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                ค้นหาใหม่
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Purge by Import Date (SUPER_ADMIN only) ──────────────────────── */}
      {user?.role === 'SUPER_ADMIN' && <PurgeByDateSection />}
    </div>
  );
}

// ─── Purge by Import Date Section ─────────────────────────────────────────────

interface PurgePreview {
  date: string;
  visitCount: number;
  importCount: number;
  patientCount: number;
  batchCount: number;
}

function PurgeByDateSection() {
  const [expanded, setExpanded] = useState(false);
  const [purgeDate, setPurgeDate] = useState('');
  const [preview, setPreview] = useState<PurgePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [purgeLoading, setPurgeLoading] = useState(false);
  const [purgeResult, setPurgeResult] = useState<{
    deletedVisits: number;
    deletedImports: number;
    deletedPatients: number;
  } | null>(null);

  const handlePreview = useCallback(async () => {
    if (!purgeDate) return;
    setPreviewLoading(true);
    setPreview(null);
    setPurgeResult(null);
    try {
      const data = await apiClient.get<PurgePreview>(
        `/his-integration/purge-by-date/preview?date=${purgeDate}`,
      );
      setPreview(data);
    } catch {
      toast.error('ไม่สามารถดึงข้อมูล preview ได้');
    } finally {
      setPreviewLoading(false);
    }
  }, [purgeDate]);

  const handlePurge = useCallback(async () => {
    if (!purgeDate) return;
    setPurgeLoading(true);
    try {
      const data = await apiClient.post<{
        deletedVisits: number;
        deletedImports: number;
        deletedPatients: number;
      }>('/his-integration/purge-by-date', { date: purgeDate });
      setPurgeResult(data);
      setPreview(null);
      setShowConfirm(false);
      toast.success(
        `ลบสำเร็จ: ${data.deletedVisits} visits, ${data.deletedPatients} ผู้ป่วย`,
      );
    } catch {
      toast.error('ไม่สามารถลบข้อมูลได้');
    } finally {
      setPurgeLoading(false);
    }
  }, [purgeDate]);

  const formatPurgeDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear() + 543;
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-destructive">
          <Trash2 className="h-4 w-4" />
          ล้างข้อมูลนำเข้า
          <ChevronDown
            className={cn(
              'h-4 w-4 ml-auto transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <p className="text-xs text-muted-foreground">
            ลบ visits และผู้ป่วยที่นำเข้าจาก HIS ในวันที่ระบุ (เฉพาะข้อมูลที่ไม่มี case)
          </p>

          {/* Date picker */}
          <div className="flex items-end gap-3">
            <div className="flex-1 max-w-xs">
              <Label className="text-xs mb-1">วันที่นำเข้า</Label>
              <ThaiDatePicker
                value={purgeDate}
                onChange={(v) => {
                  setPurgeDate(v);
                  setPreview(null);
                  setPurgeResult(null);
                }}
                placeholder="เลือกวันที่"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePreview}
              disabled={!purgeDate || previewLoading}
            >
              {previewLoading ? (
                <Clock className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5 mr-1" />
              )}
              ค้นหา
            </Button>
          </div>

          {/* Preview results */}
          {preview && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">
                ข้อมูลที่จะถูกลบ (วันที่ {formatPurgeDate(purgeDate)})
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.visitCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Visits</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.patientCount}
                  </p>
                  <p className="text-xs text-muted-foreground">ผู้ป่วย (orphan)</p>
                </div>
                <div className="rounded-md border p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {preview.importCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Import batches</p>
                </div>
              </div>

              {preview.visitCount === 0 && preview.patientCount === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  ไม่พบข้อมูลที่นำเข้าจาก HIS ในวันนี้
                </p>
              ) : (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowConfirm(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    ลบข้อมูลนำเข้าวันที่ {formatPurgeDate(purgeDate)}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Purge result */}
          {purgeResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-2">
                ลบข้อมูลสำเร็จ
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Visits ที่ลบ: {purgeResult.deletedVisits}</p>
                <p>Import batches ที่ลบ: {purgeResult.deletedImports}</p>
                <p>ผู้ป่วย (orphan) ที่ลบ: {purgeResult.deletedPatients}</p>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={showConfirm}
            onConfirm={handlePurge}
            onCancel={() => setShowConfirm(false)}
            title="ลบข้อมูลนำเข้า"
            description={`ลบข้อมูลที่นำเข้าจาก HIS วันที่ ${formatPurgeDate(purgeDate)} ทั้งหมด (${preview?.visitCount ?? 0} visits, ${preview?.patientCount ?? 0} ผู้ป่วย)? การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
            confirmText="ลบถาวร"
            variant="destructive"
            loading={purgeLoading}
          />
        </CardContent>
      )}
    </Card>
  );
}
