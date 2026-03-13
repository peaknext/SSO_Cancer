'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, AlertCircle, Calendar, Filter, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancerSiteMultiSelect } from '@/components/shared/cancer-site-multi-select';
import { DrugMultiSelect } from '@/components/shared/drug-multi-select';
import { PatientSearchResults, HisPatient } from '../components/patient-search-results';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { usePersistedState } from '@/hooks/use-persisted-state';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HisAdvancedSearchProps {
  onSelectPatient: (patient: HisPatient) => void;
  onImportAll?: (patient: HisPatient) => void;
  importingHn?: string | null;
  previewing: boolean;
  /** HN → patientId map of patients imported from this session */
  importedPatients?: Map<string, number>;
  /** Called after bulk import completes with HN → patientId map */
  onBulkImportComplete?: (importedMap: Map<string, number>) => void;
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
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return { from: formatDate(weekAgo), to: formatDate(today) };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HisAdvancedSearch({
  onSelectPatient,
  onImportAll,
  importingHn,
  previewing,
  importedPatients,
  onBulkImportComplete,
}: HisAdvancedSearchProps) {
  const defaults = getDefaultDateRange();

  // Filter state (persisted)
  const [dateFrom, setDateFrom, dfH] = usePersistedState('his-adv:dateFrom', defaults.from);
  const [dateTo, setDateTo, dtH] = usePersistedState('his-adv:dateTo', defaults.to);
  const [cancerSiteIds, setCancerSiteIds, csH] = usePersistedState<string[]>('his-adv:sites', []);
  const [z510, setZ510, z0H] = usePersistedState('his-adv:z510', false);
  const [z511, setZ511, z1H] = usePersistedState('his-adv:z511', false);
  const [selectedDrugs, setSelectedDrugs, sdH] = usePersistedState<string[]>(
    'his-adv:drugs',
    [],
  );
  const filtersHydrated = dfH && dtH && csH && z0H && z1H && sdH;

  // Search state (not persisted)
  const [results, setResults] = useState<HisPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Selection + bulk import state
  const [selectedHns, setSelectedHns] = useState<Set<string>>(new Set());
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{
    total: number;
    completed: number;
    current?: string;
  } | null>(null);

  // Apply imported patient updates to results
  const effectiveResults = useMemo(() => {
    if (!importedPatients || importedPatients.size === 0) return results;
    return results.map((p) => {
      const patientId = importedPatients.get(p.hn);
      if (patientId != null) {
        return { ...p, existsInSystem: true, existingPatientId: patientId };
      }
      return p;
    });
  }, [results, importedPatients]);

  // Validate date range
  const dateValidation = useMemo(() => {
    if (!dateFrom || !dateTo) return { valid: false, error: 'กรุณาเลือกวันที่' };
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return { valid: false, error: 'วันเริ่มต้นต้องก่อนวันสิ้นสุด' };
    if (diff > 31) return { valid: false, error: 'ช่วงวันที่ต้องไม่เกิน 31 วัน' };
    return { valid: true, error: null };
  }, [dateFrom, dateTo]);

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

  const canSearch = dateValidation.valid && !searching;

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
      if (allSelected) {
        pageHns.forEach((hn) => next.delete(hn));
      } else {
        pageHns.forEach((hn) => next.add(hn));
      }
      return next;
    });
  }, []);

  // ─── Bulk import handler ─────────────────────────────────────────────

  const handleBulkImport = useCallback(async () => {
    const hns = Array.from(selectedHns);
    if (hns.length === 0) return;

    setBulkImporting(true);
    const importedMap = new Map<string, number>();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < hns.length; i++) {
      const hn = hns[i];
      setBulkProgress({ total: hns.length, completed: i, current: hn });
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);
        const qs = params.toString();
        const result = await apiClient.post<{
          patientId: number;
          importedVisits: number;
        }>(`/his-integration/import/${encodeURIComponent(hn)}${qs ? `?${qs}` : ''}`);
        importedMap.set(hn, result.patientId);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setBulkProgress({ total: hns.length, completed: hns.length });

    if (failCount > 0) {
      toast.warning(`นำเข้าสำเร็จ ${successCount}/${hns.length} ราย`, {
        description: `${failCount} ราย ล้มเหลว`,
      });
    } else {
      toast.success(`นำเข้า ${successCount} ราย สำเร็จ`);
    }

    // Notify parent + clear selection
    onBulkImportComplete?.(importedMap);
    setSelectedHns(new Set());
    setBulkImporting(false);
    setBulkProgress(null);
  }, [selectedHns, dateFrom, dateTo, onBulkImportComplete]);

  // ─── Search handler ──────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setSelectedHns(new Set()); // Clear selection on new search

    try {
      const secondaryDiagCodes: string[] = [];
      if (z510) secondaryDiagCodes.push('Z510');
      if (z511) secondaryDiagCodes.push('Z511');

      const body: Record<string, unknown> = {
        from: dateFrom,
        to: dateTo,
      };
      if (cancerSiteIds.length > 0) body.cancerSiteIds = cancerSiteIds;
      if (secondaryDiagCodes.length > 0) body.secondaryDiagCodes = secondaryDiagCodes;
      if (selectedDrugs.length > 0) body.drugNames = selectedDrugs;

      const data = await apiClient.post<HisPatient[]>(
        '/his-integration/search/advanced',
        body,
      );
      setResults(data);
    } catch (err: any) {
      const msg = err?.error?.message || err?.message || 'ไม่สามารถค้นหาจาก HIS ได้';
      setSearchError(msg);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          ค้นหาขั้นสูงจากระบบ HIS
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-5', !filtersHydrated && 'opacity-0')}>
        {/* Date range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            ช่วงวันที่รับบริการ <span className="text-destructive">*</span>
          </Label>
          <div className="flex items-center gap-2">
            <ThaiDatePicker
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="วันเริ่มต้น"
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground shrink-0">ถึง</span>
            <ThaiDatePicker
              value={dateTo}
              onChange={setDateTo}
              placeholder="วันสิ้นสุด"
              className="flex-1"
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
          </div>
          {dateValidation.error && (
            <p className="text-xs text-destructive">{dateValidation.error}</p>
          )}
          <p className="text-xs text-muted-foreground">ค้นหาครั้งละไม่เกิน 31 วัน</p>
        </div>

        {/* Cancer site — multi-select */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">ตำแหน่งมะเร็ง</Label>
          <CancerSiteMultiSelect value={cancerSiteIds} onChange={setCancerSiteIds} />
        </div>

        {/* Secondary diagnosis checkboxes */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">การวินิจฉัยรอง</Label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={z510}
                onChange={(e) => setZ510(e.target.checked)}
                className={cn(
                  'h-4 w-4 rounded border-input text-primary',
                  'focus:ring-2 focus:ring-primary focus:ring-offset-2',
                )}
              />
              <span className="text-sm">Z510 — รังสีรักษา</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={z511}
                onChange={(e) => setZ511(e.target.checked)}
                className={cn(
                  'h-4 w-4 rounded border-input text-primary',
                  'focus:ring-2 focus:ring-primary focus:ring-offset-2',
                )}
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

        {/* Search button */}
        <div className="flex justify-end">
          <Button onClick={handleSearch} disabled={!canSearch}>
            {searching ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-1.5">ค้นหาจาก HIS</span>
          </Button>
        </div>

        {/* Search error */}
        {searchError && (
          <div className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            {searchError}
          </div>
        )}

        {/* Action bar: selection count + bulk import button */}
        {effectiveResults.length > 0 && (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground">
              {selectedHns.size > 0 && (
                <span className="font-medium text-foreground">
                  เลือกแล้ว {selectedHns.size} ราย
                </span>
              )}
            </div>
            {selectedHns.size > 0 && (
              <Button
                size="sm"
                className="gap-1.5"
                onClick={handleBulkImport}
                disabled={bulkImporting || previewing}
              >
                {bulkImporting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                นำเข้าข้อมูลที่เลือกไว้ ({selectedHns.size})
              </Button>
            )}
          </div>
        )}

        {/* Bulk import progress */}
        {bulkProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                กำลังนำเข้า {bulkProgress.completed}/{bulkProgress.total}
                {bulkProgress.current && (
                  <span className="ml-1.5 text-foreground">(HN: {bulkProgress.current})</span>
                )}
              </span>
              <span>{Math.round((bulkProgress.completed / bulkProgress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(bulkProgress.completed / bulkProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        <PatientSearchResults
          results={effectiveResults}
          onSelect={onSelectPatient}
          onImportAll={onImportAll}
          importingHn={importingHn}
          disabled={previewing || bulkImporting}
          showNewOnlyFilter
          selectable
          selectedHns={selectedHns}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
        />

        {/* No results */}
        {hasSearched && !searching && results.length === 0 && !searchError && (
          <p className="text-sm text-muted-foreground text-center py-4">
            ไม่พบผู้ป่วยจากระบบ HIS ตามเงื่อนไขที่กำหนด
          </p>
        )}

        {/* Loading overlay for patient preview */}
        {previewing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            กำลังดึงข้อมูลจาก HIS...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
