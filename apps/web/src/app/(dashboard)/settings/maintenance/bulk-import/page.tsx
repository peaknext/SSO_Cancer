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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { CancerSiteMultiSelect } from '@/components/shared/cancer-site-multi-select';
import { DrugMultiSelect } from '@/components/shared/drug-multi-select';
import { PatientSearchResults, HisPatient } from '@/app/(dashboard)/cancer-patients/components/patient-search-results';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useAuthStore } from '@/stores/auth-store';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportPhase = 'idle' | 'searching' | 'results' | 'importing' | 'completed';

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

const isAlreadyImportedError = (msg: string) =>
  msg.includes('นำเข้าแล้ว') || msg.includes('ไม่พบ visit') || msg.includes('ไม่พบ admission');

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const user = useAuthStore((s) => s.user);
  const defaults = getDefaultDateRange();

  // Filter state (persisted)
  const [dateFrom, setDateFrom, dfH] = usePersistedState('bulk-import:dateFrom', defaults.from);
  const [dateTo, setDateTo, dtH] = usePersistedState('bulk-import:dateTo', defaults.to);
  const [cancerSiteIds, setCancerSiteIds, csH] = usePersistedState<string[]>('bulk-import:sites', []);
  const [z510, setZ510, z0H] = usePersistedState('bulk-import:z510', false);
  const [z511, setZ511, z1H] = usePersistedState('bulk-import:z511', false);
  const [selectedDrugs, setSelectedDrugs, sdH] = usePersistedState<string[]>('bulk-import:drugs', []);
  const filtersHydrated = dfH && dtH && csH && z0H && z1H && sdH;

  // Phase + search state
  const [phase, setPhase] = useState<ImportPhase>('idle');
  const [results, setResults] = useState<HisPatient[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Selection
  const [selectedHns, setSelectedHns] = useState<Set<string>>(new Set());

  // Import tracking
  const cancelRef = useRef(false);
  const [progress, setProgress] = useState<BulkImportProgress | null>(null);
  const [patientLogs, setPatientLogs] = useState<PatientImportLog[]>([]);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  // Date validation
  const dateValidation = useMemo(() => {
    if (!dateFrom || !dateTo) return { valid: false, error: 'กรุณาเลือกวันที่' };
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { valid: false, error: 'วันเริ่มต้นต้องก่อนวันสิ้นสุด' };
    if (diff > 31) return { valid: false, error: 'ช่วงวันที่ต้องไม่เกิน 31 วัน' };
    return { valid: true, error: null };
  }, [dateFrom, dateTo]);

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

  // ─── Selection handlers ──────────────────────────────────────────────

  const toggleSelect = useCallback((hn: string) => {
    setSelectedHns((prev) => {
      const next = new Set(prev);
      if (next.has(hn)) next.delete(hn);
      else next.add(hn);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((pageHns: string[]) => {
    setSelectedHns((prev) => {
      const allSelected = pageHns.every((hn) => prev.has(hn));
      const next = new Set(prev);
      if (allSelected) pageHns.forEach((hn) => next.delete(hn));
      else pageHns.forEach((hn) => next.add(hn));
      return next;
    });
  }, []);

  // ─── Search handler ──────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!canSearch) return;
    setPhase('searching');
    setSearchError(null);
    setSelectedHns(new Set());
    setSummary(null);
    setPatientLogs([]);

    try {
      const secondaryDiagCodes: string[] = [];
      if (z510) secondaryDiagCodes.push('Z510');
      if (z511) secondaryDiagCodes.push('Z511');

      const body: Record<string, unknown> = { from: dateFrom, to: dateTo };
      if (cancerSiteIds.length > 0) body.cancerSiteIds = cancerSiteIds;
      if (secondaryDiagCodes.length > 0) body.secondaryDiagCodes = secondaryDiagCodes;
      if (selectedDrugs.length > 0) body.drugNames = selectedDrugs;

      const data = await apiClient.post<HisPatient[]>('/his-integration/search/advanced', body);
      setResults(data);
      setPhase('results');
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถค้นหาจาก HIS ได้';
      setSearchError(msg);
      setResults([]);
      setPhase('idle');
    }
  }, [canSearch, dateFrom, dateTo, cancerSiteIds, z510, z511, selectedDrugs]);

  // ─── Bulk import handler ─────────────────────────────────────────────

  const handleBulkImport = useCallback(async () => {
    const patients = results.filter((p) => selectedHns.has(p.hn));
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
        total: patients.length, completed: i, currentHn: p.hn,
        currentName: p.fullName, step: 'OPD', startedAt,
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
      setProgress((prev) => prev ? { ...prev, step: 'IPD' } : prev);

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
        errors.push({ hn: p.hn, fullName: p.fullName, opdError: opdError || undefined, ipdError: ipdError || undefined });
      }

      // Log
      setPatientLogs((prev) => [
        ...prev,
        {
          hn: p.hn, fullName: p.fullName,
          status: bothFail ? 'failed' : bothOk ? 'success' : 'partial',
          opdVisits, ipdAdmissions,
          opdError: opdError || undefined, ipdError: ipdError || undefined,
          durationMs: Date.now() - patientStart,
        },
      ]);

      // Update running avg
      const totalElapsed = Date.now() - startedAt;
      setProgress((prev) => prev ? { ...prev, completed: i + 1, avgTimePerPatient: totalElapsed / (i + 1) } : prev);

      // Rate-limit delay
      if (i < patients.length - 1 && !cancelRef.current) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
      }
    }

    const cancelled = cancelRef.current;
    const processed = cancelled ? patientLogs.length + 1 : patients.length;

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
  }, [results, selectedHns, dateFrom, dateTo]);

  // ─── Reset ──────────────────────────────────────────────────────────

  const handleReset = useCallback(() => {
    setPhase('idle');
    setResults([]);
    setSelectedHns(new Set());
    setSummary(null);
    setPatientLogs([]);
    setProgress(null);
    setSearchError(null);
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
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
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
          ค้นหาผู้ป่วยจากระบบ HIS แล้วนำเข้าข้อมูล OPD + IPD พร้อมกัน สำหรับตั้งค่าระบบใหม่
        </p>
      </div>

      {/* Filter Card */}
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
                <ThaiDatePicker value={dateFrom} onChange={setDateFrom} placeholder="วันเริ่มต้น" className="flex-1 min-w-[140px]" />
                <span className="text-sm text-muted-foreground shrink-0">ถึง</span>
                <ThaiDatePicker value={dateTo} onChange={setDateTo} placeholder="วันสิ้นสุด" className="flex-1 min-w-[140px]" />
                <Button type="button" variant="outline" size="sm" onClick={setPreviousMonth} className="shrink-0 text-xs">เดือนก่อนหน้า</Button>
                <Button type="button" variant="outline" size="sm" onClick={setCurrentMonth} className="shrink-0 text-xs">เดือนปัจจุบัน</Button>
                <Button type="button" variant="outline" size="sm" onClick={setNextMonth} className="shrink-0 text-xs">เดือนถัดไป</Button>
              </div>
              {dateValidation.error && <p className="text-xs text-destructive">{dateValidation.error}</p>}
              <p className="text-xs text-muted-foreground">ค้นหาครั้งละไม่เกิน 31 วัน</p>
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
                  <input type="checkbox" checked={z510} onChange={(e) => setZ510(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2" />
                  <span className="text-sm">Z510 — รังสีรักษา</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={z511} onChange={(e) => setZ511(e.target.checked)} className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2" />
                  <span className="text-sm">Z511 — เคมีบำบัด</span>
                </label>
              </div>
            </div>

            {/* Drug names */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">ยาในโปรโตคอล (ชื่อสามัญ)</Label>
              <DrugMultiSelect value={selectedDrugs} onChange={setSelectedDrugs} />
            </div>

            {/* Search button */}
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

            {searchError && (
              <div className="text-sm text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                {searchError}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results phase */}
      {phase === 'results' && (
        <>
          {/* Action bar */}
          {results.length > 0 && (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 text-sm">
                {selectedHns.size > 0 && (
                  <span className="font-medium text-foreground">เลือกแล้ว {selectedHns.size} ราย</span>
                )}
                <span className="text-xs text-muted-foreground">
                  ระบบจะนำเข้าทีละ 1 ราย (OPD+IPD) พร้อมหน่วงเวลาเพื่อไม่ให้เกินอัตราจำกัด
                </span>
              </div>
              {selectedHns.size > 0 && (
                <Button size="sm" className="gap-1.5" onClick={handleBulkImport}>
                  <Download className="h-3.5 w-3.5" />
                  นำเข้า OPD+IPD ที่เลือกไว้ ({selectedHns.size})
                </Button>
              )}
            </div>
          )}

          <PatientSearchResults
            results={results}
            onSelect={() => {}}
            showNewOnlyFilter
            selectable
            selectedHns={selectedHns}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
          />

          {results.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              ไม่พบผู้ป่วยจากระบบ HIS ตามเงื่อนไขที่กำหนด
            </p>
          )}
        </>
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
                  {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.completed / progress.total) * 100 : 0}%` }}
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
                  onClick={() => { cancelRef.current = true; }}
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
                  <div key={log.hn} className={cn(
                    'flex items-center gap-3 px-3 py-2',
                    log.status === 'failed' && 'bg-destructive/5',
                    log.status === 'partial' && 'bg-amber-50 dark:bg-amber-950/20',
                  )}>
                    {log.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    {log.status === 'partial' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    {log.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="font-mono text-muted-foreground w-16 shrink-0">{log.hn}</span>
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
              <span>OPD: <strong className="text-foreground">{summary.totalOpdVisits}</strong> visits</span>
              <span>IPD: <strong className="text-foreground">{summary.totalIpdAdmissions}</strong> admissions</span>
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
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showErrors && 'rotate-180')} />
                  ดูรายละเอียดข้อผิดพลาด ({summary.errors.length})
                </button>
                {showErrors && (
                  <div className="max-h-[200px] overflow-y-auto rounded-lg border divide-y text-xs">
                    {summary.errors.map((e) => (
                      <div key={e.hn} className="px-3 py-2 space-y-0.5">
                        <p className="font-medium">HN: {e.hn} — {e.fullName}</p>
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
                  <div key={log.hn} className={cn(
                    'flex items-center gap-3 px-3 py-2',
                    log.status === 'failed' && 'bg-destructive/5',
                    log.status === 'partial' && 'bg-amber-50 dark:bg-amber-950/20',
                  )}>
                    {log.status === 'success' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                    {log.status === 'partial' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    {log.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />}
                    <span className="font-mono text-muted-foreground w-16 shrink-0">{log.hn}</span>
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
    </div>
  );
}
