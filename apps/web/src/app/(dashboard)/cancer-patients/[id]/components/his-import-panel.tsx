'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, CloudDownload, Stethoscope, BedDouble } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { HisVisitTimeline } from '../../components/his-visit-timeline';
import { HisAdmissionSummary } from '../../components/his-admission-summary';
import type { HisPreviewVisit, SummaryStats } from '../../components/his-visit-timeline';
import type { IpdPreviewResult } from '../../components/his-admission-summary';

// ─── Types ──────────────────────────────────────────────────────────────────

interface HisSearchPreviewResult {
  patient: {
    hn: string;
    citizenId: string;
    fullName: string;
    gender?: string;
    dateOfBirth?: string;
  };
  existingPatientId: number | null;
  visits: HisPreviewVisit[];
  summary: SummaryStats;
}

interface Props {
  patientHn: string;
  patientId: number;
  existingVns: string[];
  onDataChanged: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HisImportPanel({ patientHn, patientId, existingVns, onDataChanged }: Props) {
  const [expanded, setExpanded] = usePersistedState('cp-detail-hisPanel', false);
  const [hisMode, setHisMode] = usePersistedState<'opd' | 'ipd'>('cp-his-mode', 'opd');

  // OPD state
  const [hisData, setHisData] = useState<HisSearchPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importingVn, setImportingVn] = useState<string | null>(null);
  const [importedVns, setImportedVns] = useState<Set<string>>(new Set());
  const [syncingVn, setSyncingVn] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);

  // IPD state
  const [ipdPreview, setIpdPreview] = useState<IpdPreviewResult | null>(null);
  const [ipdLoading, setIpdLoading] = useState(false);
  const [ipdError, setIpdError] = useState<string | null>(null);
  const [ipdImporting, setIpdImporting] = useState(false);

  // hydration gate for hisMode persisted state
  const [, , hisModeHydrated] = usePersistedState('cp-his-mode', 'opd');

  /** Fetch OPD data from HIS */
  const fetchHisData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<HisSearchPreviewResult>(
        `/his-integration/search-preview?q=${encodeURIComponent(patientHn)}&type=hn`,
      );
      setHisData(result);
      setImportedVns(new Set());
      if (!expanded) setExpanded(true);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถดึงข้อมูลจาก HIS ได้';
      setError(msg);
      toast.error('ดึงข้อมูล HIS ล้มเหลว', { description: msg });
    } finally {
      setLoading(false);
    }
  }, [patientHn, expanded, setExpanded]);

  /** Fetch IPD preview from HIS */
  const fetchIpdPreview = useCallback(async () => {
    setIpdLoading(true);
    setIpdError(null);
    try {
      const result = await apiClient.get<IpdPreviewResult>(
        `/his-integration/ipd/preview/${encodeURIComponent(patientHn)}`,
      );
      setIpdPreview(result);
      if (!expanded) setExpanded(true);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถดึงข้อมูล IPD จาก HIS ได้';
      setIpdError(msg);
      toast.error('ดึงข้อมูล IPD ล้มเหลว', { description: msg });
    } finally {
      setIpdLoading(false);
    }
  }, [patientHn, expanded, setExpanded]);

  /** Import single OPD visit */
  const handleImportVisit = useCallback(async (vn: string, forceIncomplete: boolean) => {
    setImportingVn(vn);
    try {
      await apiClient.post(
        `/his-integration/import-visit?q=${encodeURIComponent(patientHn)}&type=hn`,
        { vn, forceIncomplete },
      );
      setImportedVns((prev) => new Set(prev).add(vn));
      toast.success(`นำเข้า VN ${vn} สำเร็จ`);
      onDataChanged();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
      toast.error(`นำเข้า VN ${vn} ล้มเหลว`, { description: msg });
    } finally {
      setImportingVn(null);
    }
  }, [patientHn, onDataChanged]);

  /** Sync single OPD visit */
  const handleSyncVisit = useCallback(async (vn: string) => {
    setSyncingVn(vn);
    try {
      await apiClient.patch(
        `/his-integration/sync-visit?q=${encodeURIComponent(patientHn)}&type=hn`,
        { vn },
      );
      toast.success(`ซิงค์ VN ${vn} สำเร็จ`);
      onDataChanged();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถซิงค์ข้อมูลได้';
      toast.error(`ซิงค์ VN ${vn} ล้มเหลว`, { description: msg });
    } finally {
      setSyncingVn(null);
    }
  }, [patientHn, onDataChanged]);

  /** Bulk import all new OPD cancer visits */
  const handleImportAll = useCallback(
    async (options?: { from?: string; to?: string }) => {
      setImportingAll(true);
      try {
        const params = new URLSearchParams();
        if (options?.from) params.set('from', options.from);
        if (options?.to) params.set('to', options.to);
        const qs = params.toString();
        const url = `/his-integration/import/${encodeURIComponent(patientHn)}${qs ? `?${qs}` : ''}`;
        const result = await apiClient.post<{
          patientId: number;
          importedVisits: number;
        }>(url);
        if (result.importedVisits === 0) {
          toast.info('ไม่พบ visit ใหม่ที่ยังไม่เคยนำเข้า');
        } else {
          toast.success(`นำเข้า ${result.importedVisits} visits สำเร็จ`);
        }
        onDataChanged();
        await fetchHisData();
      } catch (err: any) {
        const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
        toast.error('นำเข้าล้มเหลว', { description: msg });
      } finally {
        setImportingAll(false);
      }
    },
    [patientHn, onDataChanged, fetchHisData],
  );

  /** Batch sync all imported OPD visits */
  const handleBatchSync = useCallback(async () => {
    if (!hisData) return;
    const importedVisitVns = hisData.visits
      .filter((v) => v.isAlreadyImported || importedVns.has(v.visit.vn))
      .map((v) => v.visit.vn);

    if (importedVisitVns.length === 0) return;
    setBatchSyncing(true);
    try {
      const result = await apiClient.post<{
        synced: number;
        failed: number;
        results: { vn: string; success: boolean; error?: string }[];
      }>(
        `/his-integration/batch-sync?q=${encodeURIComponent(patientHn)}&type=hn`,
        { hn: patientHn, vns: importedVisitVns },
      );
      if (result.failed > 0) {
        toast.warning(`ซิงค์สำเร็จ ${result.synced}/${importedVisitVns.length} visits`, {
          description: `${result.failed} visits ล้มเหลว`,
        });
      } else {
        toast.success(`ซิงค์ ${result.synced} visits สำเร็จ`);
      }
      onDataChanged();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถซิงค์ข้อมูลได้';
      toast.error('Batch sync ล้มเหลว', { description: msg });
    } finally {
      setBatchSyncing(false);
    }
  }, [hisData, importedVns, patientHn, onDataChanged]);

  /** Bulk import all IPD admissions */
  const handleImportIpd = useCallback(async () => {
    setIpdImporting(true);
    try {
      const result = await apiClient.post<{
        patientId: number;
        importedVisits: number;
      }>(`/his-integration/ipd/import/${encodeURIComponent(patientHn)}`);
      if (result.importedVisits === 0) {
        toast.info('ไม่พบ admission ใหม่ที่ยังไม่เคยนำเข้า');
      } else {
        toast.success(`นำเข้า ${result.importedVisits} admission สำเร็จ`);
      }
      onDataChanged();
      await fetchIpdPreview();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูล IPD ได้';
      toast.error('นำเข้า IPD ล้มเหลว', { description: msg });
    } finally {
      setIpdImporting(false);
    }
  }, [patientHn, onDataChanged, fetchIpdPreview]);

  /** Handle fetch based on active tab */
  const handleFetch = useCallback(() => {
    if (hisMode === 'ipd') {
      fetchIpdPreview();
    } else {
      fetchHisData();
    }
  }, [hisMode, fetchHisData, fetchIpdPreview]);

  const isLoading = hisMode === 'opd' ? loading : ipdLoading;

  // Summary line for collapsed state
  const opdSummary = hisData ? `${hisData.summary.newImportable} OPD` : null;
  const ipdSummary = ipdPreview ? `${ipdPreview.newAdmissionsToImport} IPD` : null;
  const summaryParts = [opdSummary, ipdSummary].filter(Boolean);
  const summaryLine = summaryParts.length > 0 ? `${summaryParts.join(' | ')} นำเข้าได้` : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className="text-base flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setExpanded(!expanded)}
          >
            <CloudDownload className="h-5 w-5 text-primary" />
            ข้อมูลจาก HIS
            {!expanded && summaryLine && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({summaryLine})
              </span>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={handleFetch}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            {isLoading
              ? 'กำลังดึง...'
              : (hisMode === 'opd' ? hisData : ipdPreview)
                ? 'รีเฟรช'
                : 'ดึงข้อมูลล่าสุด'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* OPD / IPD tab switcher */}
          <div className="inline-flex items-center rounded-lg bg-muted/50 p-1 gap-0.5">
            <button
              onClick={() => setHisMode('opd')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                hisMode === 'opd'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/8',
              )}
            >
              <Stethoscope className="h-3.5 w-3.5" />
              OPD ผู้ป่วยนอก
            </button>
            <button
              onClick={() => setHisMode('ipd')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                hisMode === 'ipd'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-white/8',
              )}
            >
              <BedDouble className="h-3.5 w-3.5" />
              IPD ผู้ป่วยใน
            </button>
          </div>

          {/* ── OPD Tab Content ────────────────────────────────────── */}
          {hisMode === 'opd' && (
            <>
              {error && (
                <div className="text-sm text-destructive py-2">{error}</div>
              )}

              {!hisData && !loading && !error && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  กดปุ่ม &quot;ดึงข้อมูลล่าสุด&quot; เพื่อตรวจสอบ visit ใหม่จาก HIS
                </p>
              )}

              {loading && !hisData && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  กำลังดึงข้อมูล OPD จาก HIS...
                </div>
              )}

              {hisData && (
                <HisVisitTimeline
                  visits={hisData.visits}
                  summary={hisData.summary}
                  importedVns={importedVns}
                  importingVn={importingVn}
                  onImportVisit={handleImportVisit}
                  syncingVn={syncingVn}
                  onSyncVisit={handleSyncVisit}
                  onImportAll={handleImportAll}
                  importingAll={importingAll}
                  onBatchSync={hisData.summary.alreadyImported > 0 ? handleBatchSync : undefined}
                  batchSyncing={batchSyncing}
                />
              )}
            </>
          )}

          {/* ── IPD Tab Content ────────────────────────────────────── */}
          {hisMode === 'ipd' && (
            <>
              {ipdError && (
                <div className="text-sm text-destructive py-2">{ipdError}</div>
              )}

              {!ipdPreview && !ipdLoading && !ipdError && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  กดปุ่ม &quot;ดึงข้อมูลล่าสุด&quot; เพื่อตรวจสอบ admission ผู้ป่วยในจาก HIS
                </p>
              )}

              {ipdLoading && !ipdPreview && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                  กำลังดึงข้อมูล IPD จาก HIS...
                </div>
              )}

              {ipdPreview && (
                <HisAdmissionSummary
                  preview={ipdPreview}
                  onImportAll={handleImportIpd}
                  importing={ipdImporting}
                />
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
