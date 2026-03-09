'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, Download, CloudDownload } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { HisVisitTimeline } from '../../components/his-visit-timeline';
import type { HisPreviewVisit, SummaryStats } from '../../components/his-visit-timeline';
import type { VisitCompleteness } from '../../components/his-completeness-badge';

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
  const [hisData, setHisData] = useState<HisSearchPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Import/sync states
  const [importingVn, setImportingVn] = useState<string | null>(null);
  const [importedVns, setImportedVns] = useState<Set<string>>(new Set());
  const [syncingVn, setSyncingVn] = useState<string | null>(null);
  const [importingAll, setImportingAll] = useState(false);
  const [batchSyncing, setBatchSyncing] = useState(false);

  /** Fetch latest data from HIS */
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

  /** Import single visit */
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

  /** Sync single visit */
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

  /** Bulk import all new cancer visits */
  const handleImportAll = useCallback(async () => {
    setImportingAll(true);
    try {
      const result = await apiClient.post<{
        patientId: number;
        importedVisits: number;
      }>(`/his-integration/import/${encodeURIComponent(patientHn)}`);
      toast.success(`นำเข้า ${result.importedVisits} visits สำเร็จ`);
      onDataChanged();
      // Refresh HIS data to update summary
      await fetchHisData();
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถนำเข้าข้อมูลได้';
      toast.error('นำเข้าล้มเหลว', { description: msg });
    } finally {
      setImportingAll(false);
    }
  }, [patientHn, onDataChanged, fetchHisData]);

  /** Batch sync all imported visits */
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

  // Summary line for collapsed state
  const summaryLine = hisData
    ? `${hisData.summary.newImportable} visits นำเข้าได้ | ${hisData.summary.alreadyImported} visits ซิงค์ได้`
    : null;

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
            onClick={fetchHisData}
            disabled={loading}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            {loading ? 'กำลังดึง...' : hisData ? 'รีเฟรช' : 'ดึงข้อมูลล่าสุด'}
          </Button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
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
              กำลังดึงข้อมูลจาก HIS...
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
              onImportAll={hisData.summary.newImportable > 0 ? handleImportAll : undefined}
              importingAll={importingAll}
              onBatchSync={hisData.summary.alreadyImported > 0 ? handleBatchSync : undefined}
              batchSyncing={batchSyncing}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
