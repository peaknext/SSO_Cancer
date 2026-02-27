'use client';

import { useState, useMemo } from 'react';
import { Search, AlertCircle, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CancerSiteMultiSelect } from '@/components/shared/cancer-site-multi-select';
import { DrugMultiSelect } from '@/components/shared/drug-multi-select';
import { PatientSearchResults, HisPatient } from './patient-search-results';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HisAdvancedSearchProps {
  onSelectPatient: (patient: HisPatient) => void;
  previewing: boolean;
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

export function HisAdvancedSearch({ onSelectPatient, previewing }: HisAdvancedSearchProps) {
  const defaults = getDefaultDateRange();

  // Filter state
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);
  const [cancerSiteIds, setCancerSiteIds] = useState<string[]>([]);
  const [z510, setZ510] = useState(false);
  const [z511, setZ511] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);

  // Search state
  const [results, setResults] = useState<HisPatient[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

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
    const today = new Date();
    const firstOfPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOfPrev = new Date(today.getFullYear(), today.getMonth(), 0);
    setDateFrom(formatDate(firstOfPrev));
    setDateTo(formatDate(lastOfPrev));
  };

  const canSearch = dateValidation.valid && !searching;

  const handleSearch = async () => {
    if (!canSearch) return;
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);

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
      <CardContent className="space-y-5">
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
              <span className="text-sm">Z510 — เคมีบำบัด</span>
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
              <span className="text-sm">Z511 — รังสีรักษา</span>
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

        {/* Results */}
        <PatientSearchResults
          results={results}
          onSelect={onSelectPatient}
          disabled={previewing}
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
