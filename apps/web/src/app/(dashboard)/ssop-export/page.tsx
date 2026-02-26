'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  FileArchive,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  History,
  ChevronRight,
  Calendar,
  Info,
  X,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaginatedApi, useApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ExportableVisit {
  id: number;
  vn: string;
  hn: string;
  visitDate: string;
  primaryDiagnosis: string;
  physicianLicenseNo: string | null;
  clinicCode: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  patient: { id: number; fullName: string; citizenId: string | null } | null;
  case: {
    caseNumber: string;
    vcrCode: string | null;
    protocol: { protocolCode: string; nameThai: string } | null;
    sourceHospital: { hcode5: string | null } | null;
  } | null;
  _count: { visitBillingItems: number };
}

interface VisitsResponse {
  data: ExportableVisit[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface PreviewResult {
  valid: { visitId: number; vn: string; amount: number }[];
  invalid: { visitId: number; vn: string; issues: string[] }[];
  totalAmount: number;
}

interface ExportBatch {
  id: number;
  sessionNo: number;
  hcode: string;
  subUnit: string;
  exportDate: string;
  visitCount: number;
  totalAmount: number;
  fileName: string;
  visitIds: number[];
  createdAt: string;
  createdByUser: { fullName: string } | null;
}

interface BatchesResponse {
  data: ExportBatch[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type Tab = 'select' | 'history';
type Step = 'select' | 'preview' | 'generating';

// ─── Component ──────────────────────────────────────────────────────────────

export default function SsopExportPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('select');

  // Visit selection filters
  const [dateFrom, setDateFrom, h1] = usePersistedState('ssop-from', '');
  const [dateTo, setDateTo, h2] = usePersistedState('ssop-to', '');
  const [search, setSearch, h3] = usePersistedState('ssop-search', '');
  const [page, setPage] = useState(1);
  const filtersHydrated = h1 && h2 && h3;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Flow state
  const [step, setStep] = useState<Step>('select');
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedInvalid, setExpandedInvalid] = useState<number | null>(null);

  // Batch history
  const [batchPage, setBatchPage] = useState(1);

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const queryParams = useMemo(() => ({
    page,
    limit: 50,
    from: dateFrom || undefined,
    to: dateTo || undefined,
    search: search || undefined,
  }), [page, dateFrom, dateTo, search]);

  const { data: visitsResponse, isLoading: visitsLoading } =
    usePaginatedApi<VisitsResponse>('/ssop-export/visits', queryParams, {
      enabled: filtersHydrated && activeTab === 'select',
    });

  const { data: batchesResponse, isLoading: batchesLoading, refetch: refetchBatches } =
    usePaginatedApi<BatchesResponse>('/ssop-export/batches', {
      page: batchPage,
      limit: 20,
    }, { enabled: activeTab === 'history' });

  const visits = visitsResponse?.data ?? [];
  const visitTotal = visitsResponse?.meta?.total ?? 0;

  const batches = batchesResponse?.data ?? [];
  const batchTotal = batchesResponse?.meta?.total ?? 0;

  // ─── Handlers ───────────────────────────────────────────────────────────

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = visits.map((v) => v.id);
    setSelectedIds((prev) => {
      const allSelected = currentPageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        currentPageIds.forEach((id) => next.delete(id));
      } else {
        currentPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [visits]);

  const handlePreview = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 visit');
      return;
    }

    setIsLoading(true);
    try {
      const result = await apiClient.post<PreviewResult>('/ssop-export/preview', {
        visitIds: Array.from(selectedIds),
      });
      setPreviewResult(result);
      setStep('preview');
    } catch (err: unknown) {
      const apiErr = err as { error?: { message?: string } };
      toast.error(apiErr?.error?.message || 'ไม่สามารถตรวจสอบข้อมูลได้');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIds]);

  const handleGenerate = useCallback(async () => {
    if (!previewResult || previewResult.valid.length === 0) return;

    setStep('generating');
    try {
      const validIds = previewResult.valid.map((v) => v.visitId);
      const url = `/api/v1/ssop-export/generate`;
      const token = apiClient.getAccessToken();

      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ visitIds: validIds }),
        credentials: 'include',
      });

      if (!resp.ok) {
        const error = await resp.json().catch(() => null);
        throw new Error(error?.error?.message || error?.message || 'Export failed');
      }

      const blob = await resp.blob();
      const contentDisposition = resp.headers.get('Content-Disposition');
      const fileName = contentDisposition
        ?.match(/filename="?([^"]+)"?/)?.[1]
        || `SSOP_export_${new Date().toISOString().split('T')[0]}.zip`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success(`ส่งออกสำเร็จ — ${previewResult.valid.length} visits`);
      setStep('select');
      setSelectedIds(new Set());
      setPreviewResult(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถส่งออกได้';
      toast.error(message);
      setStep('preview');
    }
  }, [previewResult]);

  const handleDownloadBatch = useCallback(async (batchId: number, fileName: string) => {
    try {
      const url = `/api/v1/ssop-export/batches/${batchId}/download`;
      const token = apiClient.getAccessToken();

      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!resp.ok) throw new Error('Download failed');

      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error('ไม่สามารถดาวน์โหลดได้');
    }
  }, []);

  const resetFlow = useCallback(() => {
    setStep('select');
    setPreviewResult(null);
  }, []);

  // ─── Derived ────────────────────────────────────────────────────────────

  const allCurrentSelected = visits.length > 0 && visits.every((v) => selectedIds.has(v.id));
  const totalPages = Math.ceil(visitTotal / 50);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <FileArchive className="h-6 w-6 text-primary" />
            ส่งออก SSOP 0.93
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            SSOP Electronic Claims — สร้างไฟล์เบิกค่ารักษาพยาบาลผู้ป่วยนอก
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('select')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'select'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <FileArchive className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          สร้าง Export ใหม่
        </button>
        <button
          onClick={() => { setActiveTab('history'); refetchBatches(); }}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <History className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          ประวัติ Export
        </button>
      </div>

      {/* ─── Tab: Create Export ──────────────────────────────────────────── */}
      {activeTab === 'select' && (
        <>
          {step === 'select' && (
            <SelectVisitsStep
              visits={visits}
              visitTotal={visitTotal}
              visitsLoading={visitsLoading}
              selectedIds={selectedIds}
              allCurrentSelected={allCurrentSelected}
              dateFrom={dateFrom}
              dateTo={dateTo}
              search={search}
              page={page}
              totalPages={totalPages}
              onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
              onDateToChange={(v) => { setDateTo(v); setPage(1); }}
              onSearchChange={(v) => { setSearch(v); setPage(1); }}
              onPageChange={setPage}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onPreview={handlePreview}
              isLoading={isLoading}
            />
          )}

          {step === 'preview' && previewResult && (
            <PreviewStep
              result={previewResult}
              expandedInvalid={expandedInvalid}
              onToggleExpand={(id) =>
                setExpandedInvalid((prev) => (prev === id ? null : id))
              }
              onGenerate={handleGenerate}
              onBack={resetFlow}
            />
          )}

          {step === 'generating' && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  กำลังสร้างไฟล์ SSOP 0.93 ZIP...
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ─── Tab: History ────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <BatchHistoryTab
          batches={batches}
          batchTotal={batchTotal}
          batchPage={batchPage}
          batchesLoading={batchesLoading}
          onPageChange={setBatchPage}
          onDownload={handleDownloadBatch}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════════

function SelectVisitsStep({
  visits,
  visitTotal,
  visitsLoading,
  selectedIds,
  allCurrentSelected,
  dateFrom,
  dateTo,
  search,
  page,
  totalPages,
  onDateFromChange,
  onDateToChange,
  onSearchChange,
  onPageChange,
  onToggleSelect,
  onToggleSelectAll,
  onPreview,
  isLoading,
}: {
  visits: ExportableVisit[];
  visitTotal: number;
  visitsLoading: boolean;
  selectedIds: Set<number>;
  allCurrentSelected: boolean;
  dateFrom: string;
  dateTo: string;
  search: string;
  page: number;
  totalPages: number;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onPreview: () => void;
  isLoading: boolean;
}) {
  return (
    <>
      {/* Info */}
      <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-foreground/80">
          แสดงเฉพาะ visits ที่มีข้อมูลค่ารักษาพยาบาล (Billing Items) จาก HIS — เลือก visits
          ที่ต้องการส่งออก แล้วกด &quot;ตรวจสอบข้อมูล&quot;
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-9 w-40 text-sm"
            placeholder="จากวันที่"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-9 w-40 text-sm"
            placeholder="ถึงวันที่"
          />
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหา VN / HN / ชื่อ..."
            className="pl-9 h-9 text-sm"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          พบ {visitTotal.toLocaleString()} visits
          {selectedIds.size > 0 && (
            <> — เลือกแล้ว <span className="font-semibold text-primary">{selectedIds.size}</span> รายการ</>
          )}
        </span>
        <Button
          onClick={onPreview}
          disabled={selectedIds.size === 0 || isLoading}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-1.5" />
              กำลังตรวจสอบ...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              ตรวจสอบข้อมูล ({selectedIds.size})
            </>
          )}
        </Button>
      </div>

      {/* Table */}
      {visitsLoading ? (
        <TableSkeleton rows={10} cols={7} />
      ) : visits.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileArchive className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {dateFrom || dateTo || search
                ? 'ไม่พบ visits ตามเงื่อนไขที่เลือก'
                : 'ยังไม่มี visits ที่มีข้อมูล billing items — นำเข้าจาก HIS ก่อน'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allCurrentSelected}
                      onChange={onToggleSelectAll}
                      className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
                    />
                  </th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">VN</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">ผู้ป่วย</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">ICD-10</th>
                  <th className="px-3 py-2.5 text-left font-medium text-muted-foreground">เคส/โปรโตคอล</th>
                  <th className="px-3 py-2.5 text-center font-medium text-muted-foreground">Bill Items</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => onToggleSelect(v.id)}
                    className={cn(
                      'border-b last:border-b-0 cursor-pointer transition-colors',
                      selectedIds.has(v.id)
                        ? 'bg-primary/5'
                        : 'hover:bg-muted/20',
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(v.id)}
                        onChange={() => onToggleSelect(v.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-input text-primary focus:ring-primary/30"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <CodeBadge code={v.vn} />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-foreground truncate max-w-48">
                        {v.patient?.fullName || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        HN: {v.hn}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-foreground whitespace-nowrap">
                      {new Date(v.visitDate).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="px-3 py-2.5">
                      <CodeBadge code={v.primaryDiagnosis} />
                    </td>
                    <td className="px-3 py-2.5">
                      {v.case ? (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="success" className="text-[11px]">
                            {v.case.caseNumber}
                          </Badge>
                          {v.case.protocol && (
                            <span className="text-xs text-muted-foreground truncate max-w-32">
                              {v.case.protocol.protocolCode}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Badge variant="secondary" className="tabular-nums font-mono text-xs">
                        {v._count.visitBillingItems}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
              <span className="text-xs text-muted-foreground">
                หน้า {page} / {totalPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  ก่อนหน้า
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  ถัดไป
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function PreviewStep({
  result,
  expandedInvalid,
  onToggleExpand,
  onGenerate,
  onBack,
}: {
  result: PreviewResult;
  expandedInvalid: number | null;
  onToggleExpand: (id: number) => void;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {result.valid.length}
              </p>
              <p className="text-xs text-muted-foreground">ผ่านการตรวจสอบ</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {result.invalid.length}
              </p>
              <p className="text-xs text-muted-foreground">ไม่ผ่าน (ข้อมูลไม่ครบ)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileArchive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground font-mono">
                {result.totalAmount.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <p className="text-xs text-muted-foreground">ยอดเบิกรวม (บาท)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Valid Visits */}
      {result.valid.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Visits ที่พร้อม export ({result.valid.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-60 overflow-y-auto">
              {result.valid.map((v) => (
                <div key={v.visitId} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <CodeBadge code={v.vn} />
                  </div>
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {v.amount.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} ฿
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invalid Visits */}
      {result.invalid.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Visits ที่ข้อมูลไม่ครบ — จะถูกข้ามไม่ export ({result.invalid.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-80 overflow-y-auto">
              {result.invalid.map((v) => (
                <div key={v.visitId}>
                  <button
                    onClick={() => onToggleExpand(v.visitId)}
                    className="px-4 py-2.5 flex items-center justify-between w-full hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <CodeBadge code={v.vn} />
                      <span className="text-xs text-muted-foreground">
                        {v.issues.length} ปัญหา
                      </span>
                    </div>
                    <ChevronRight
                      className={cn(
                        'h-4 w-4 text-muted-foreground transition-transform',
                        expandedInvalid === v.visitId && 'rotate-90',
                      )}
                    />
                  </button>
                  {expandedInvalid === v.visitId && (
                    <div className="px-4 pb-3 pl-12">
                      <ul className="space-y-1">
                        {v.issues.map((issue, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5"
                          >
                            <span className="mt-0.5">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          กลับไปเลือก visits
        </Button>
        <Button
          onClick={onGenerate}
          disabled={result.valid.length === 0}
        >
          <Download className="h-4 w-4 mr-1.5" />
          สร้างไฟล์ SSOP ({result.valid.length} visits)
        </Button>
      </div>
    </div>
  );
}

function BatchHistoryTab({
  batches,
  batchTotal,
  batchPage,
  batchesLoading,
  onPageChange,
  onDownload,
}: {
  batches: ExportBatch[];
  batchTotal: number;
  batchPage: number;
  batchesLoading: boolean;
  onPageChange: (p: number) => void;
  onDownload: (id: number, fileName: string) => void;
}) {
  const totalPages = Math.ceil(batchTotal / 20);

  if (batchesLoading) {
    return <TableSkeleton rows={5} cols={6} />;
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">ยังไม่มีประวัติการ export</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Session</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วันที่ Export</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ไฟล์</th>
              <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Visits</th>
              <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">ยอดรวม (฿)</th>
              <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ผู้ส่งออก</th>
              <th className="px-4 py-2.5 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-b last:border-b-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3">
                  <Badge variant="secondary" className="font-mono text-xs tabular-nums">
                    #{String(b.sessionNo).padStart(4, '0')}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-foreground whitespace-nowrap">
                  {new Date(b.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  <span className="text-muted-foreground ml-1 text-xs">
                    {new Date(b.createdAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-foreground/80 break-all">
                    {b.fileName}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant="secondary" className="tabular-nums font-mono text-xs">
                    {b.visitCount}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right font-mono tabular-nums text-foreground">
                  {Number(b.totalAmount).toLocaleString('th-TH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {b.createdByUser?.fullName || '—'}
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(b.id, b.fileName)}
                    className="text-primary"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
          <span className="text-xs text-muted-foreground">
            หน้า {batchPage} / {totalPages} — ทั้งหมด {batchTotal} รายการ
          </span>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={batchPage <= 1}
              onClick={() => onPageChange(batchPage - 1)}
            >
              ก่อนหน้า
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={batchPage >= totalPages}
              onClick={() => onPageChange(batchPage + 1)}
            >
              ถัดไป
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
