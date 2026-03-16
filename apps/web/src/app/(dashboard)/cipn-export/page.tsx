'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  BedDouble,
  Search,
  CheckCircle2,
  AlertTriangle,
  Download,
  History,
  ChevronRight,
  Calendar,
  Info,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { SearchInput } from '@/components/shared/search-input';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Pagination } from '@/components/shared/pagination';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { HelpButton } from '@/components/shared/help-button';

// ─── Types ──────────────────────────────────────────────────────────────

interface ExportableAdmission {
  id: number;
  an: string | null;
  hn: string;
  vn: string;
  visitDate: string;
  primaryDiagnosis: string;
  dischargeDate: string | null;
  patient: { id: number; fullName: string; citizenId: string | null } | null;
  case: {
    caseNumber: string;
    protocol: { protocolCode: string; nameThai: string } | null;
    sourceHospital: { hcode5: string | null } | null;
  } | null;
  _count: { visitBillingItems: number; diagnoses: number; procedures: number };
}

interface AdmissionsResponse {
  data: ExportableAdmission[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface PreviewResult {
  valid: { visitId: number; an: string; amount: number }[];
  invalid: { visitId: number; an: string; issues: string[] }[];
  totalAmount: number;
}

interface ExportBatch {
  id: number;
  sessionNo: number;
  hcode: string;
  exportDate: string;
  visitCount: number;
  totalAmount: number;
  fileName: string;
  createdAt: string;
  createdByUser: { fullName: string } | null;
}

interface BatchesResponse {
  data: ExportBatch[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type Tab = 'select' | 'history';
type Step = 'select' | 'preview' | 'generating';

// ─── Component ──────────────────────────────────────────────────────────

export default function CipnExportPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>('select');

  // Admission selection filters
  const [dateFrom, setDateFrom, h1] = usePersistedState('cipn-from', '');
  const [dateTo, setDateTo, h2] = usePersistedState('cipn-to', '');
  const [search, setSearch, h3] = usePersistedState('cipn-search', '');
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
  const queryParams = useMemo(
    () => ({
      page,
      limit: 50,
      from: dateFrom || undefined,
      to: dateTo || undefined,
      search: search || undefined,
    }),
    [page, dateFrom, dateTo, search],
  );

  const { data: admissionsResponse, isLoading: admissionsLoading } =
    usePaginatedApi<AdmissionsResponse>('/cipn-export/admissions', queryParams, {
      enabled: filtersHydrated && activeTab === 'select',
    });

  const {
    data: batchesResponse,
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = usePaginatedApi<BatchesResponse>(
    '/cipn-export/batches',
    {
      page: batchPage,
      limit: 20,
    },
    { enabled: activeTab === 'history' },
  );

  const admissions = admissionsResponse?.data ?? [];
  const admissionTotal = admissionsResponse?.meta?.total ?? 0;
  const batches = batchesResponse?.data ?? [];
  const batchTotal = batchesResponse?.meta?.total ?? 0;

  // ─── Handlers ─────────────────────────────────────────────────────────
  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = admissions.map((a) => a.id);
    setSelectedIds((prev) => {
      const allSelected = currentPageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) currentPageIds.forEach((id) => next.delete(id));
      else currentPageIds.forEach((id) => next.add(id));
      return next;
    });
  }, [admissions]);

  const handlePreview = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 admission');
      return;
    }
    setIsLoading(true);
    try {
      const result = await apiClient.post<PreviewResult>('/cipn-export/preview', {
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
      const url = `/api/v1/cipn-export/generate`;
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
      const fileName =
        contentDisposition?.match(/filename="?([^"]+)"?/)?.[1] ||
        `CIPN_export_${new Date().toISOString().split('T')[0]}.zip`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);

      toast.success(`ส่งออก CIPN สำเร็จ — ${previewResult.valid.length} admissions`);
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
      const url = `/api/v1/cipn-export/batches/${batchId}/download`;
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

  // Derived
  const allCurrentSelected =
    admissions.length > 0 && admissions.every((a) => selectedIds.has(a.id));
  const totalPages = Math.ceil(admissionTotal / 50);

  // Format date helper
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <BedDouble className="h-6 w-6 text-primary" />
          ส่งออก CIPN
          <HelpButton section="cipn-export" />
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          CIPN Electronic Claims — สร้างไฟล์เบิกค่ารักษาพยาบาลผู้ป่วยใน
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border glass-light rounded-t-xl px-1">
        <button
          onClick={() => setActiveTab('select')}
          className={cn(
            'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
            activeTab === 'select'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <BedDouble className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          สร้าง Export ใหม่
        </button>
        <button
          onClick={() => {
            setActiveTab('history');
            refetchBatches();
          }}
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

      {/* Tab: Create Export */}
      {activeTab === 'select' && (
        <>
          {step === 'select' && (
            <>
              {/* Info */}
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/15 px-4 py-3">
                <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm text-foreground/80">
                  แสดงเฉพาะ admissions ที่มี AN, ข้อมูลผู้ป่วย, และรายการเรียกเก็บ —
                  เลือก admissions แล้วกด &quot;ตรวจสอบข้อมูล&quot;
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3 glass-light rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <ThaiDatePicker
                    value={dateFrom}
                    onChange={(v) => {
                      setDateFrom(v);
                      setPage(1);
                    }}
                    placeholder="จากวันที่"
                    className="h-9 w-52 text-sm"
                  />
                  <span className="text-muted-foreground text-sm">—</span>
                  <ThaiDatePicker
                    value={dateTo}
                    onChange={(v) => {
                      setDateTo(v);
                      setPage(1);
                    }}
                    placeholder="ถึงวันที่"
                    className="h-9 w-52 text-sm"
                  />
                </div>
                <SearchInput
                  value={search}
                  onChange={(v) => {
                    setSearch(v);
                    setPage(1);
                  }}
                  placeholder="ค้นหา AN / HN / VN / ชื่อ..."
                  className="w-full sm:w-72"
                />
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  พบ {admissionTotal.toLocaleString()} admissions
                  {selectedIds.size > 0 && (
                    <> — เลือกแล้ว <span className="font-semibold text-primary">{selectedIds.size}</span> รายการ</>
                  )}
                </span>
                <Button onClick={handlePreview} disabled={selectedIds.size === 0 || isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  ตรวจสอบข้อมูล ({selectedIds.size})
                </Button>
              </div>

              {/* Table */}
              {admissionsLoading ? (
                <TableSkeleton rows={10} cols={6} />
              ) : admissions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BedDouble className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">ไม่พบ admissions ที่พร้อมส่งออก</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/60 text-muted-foreground">
                        <th className="w-10 px-3 py-2.5">
                          <input
                            type="checkbox"
                            checked={allCurrentSelected}
                            onChange={toggleSelectAll}
                            className="rounded border-muted-foreground/40 text-primary focus:ring-primary"
                          />
                        </th>
                        <th className="px-3 py-2.5 text-left font-medium">AN</th>
                        <th className="px-3 py-2.5 text-left font-medium">HN / ผู้ป่วย</th>
                        <th className="px-3 py-2.5 text-left font-medium">วันที่ Admit</th>
                        <th className="px-3 py-2.5 text-left font-medium">วินิจฉัย</th>
                        <th className="px-3 py-2.5 text-center font-medium">Dx/Op/Items</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {admissions.map((a) => (
                        <tr
                          key={a.id}
                          onClick={() => toggleSelect(a.id)}
                          className={cn(
                            'cursor-pointer transition-colors',
                            selectedIds.has(a.id) ? 'bg-primary/5' : 'hover:bg-muted/40',
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(a.id)}
                              onChange={() => toggleSelect(a.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-muted-foreground/40 text-primary focus:ring-primary"
                            />
                          </td>
                          <td className="px-3 py-2.5">
                            <CodeBadge code={a.an || '—'} />
                          </td>
                          <td className="px-3 py-2.5">
                            <div>
                              <span className="font-mono text-xs text-muted-foreground">
                                {a.hn}
                              </span>
                              <span className="mx-1.5 text-muted-foreground/40">·</span>
                              <span className="font-medium text-foreground">
                                {a.patient?.fullName || '—'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {formatDate(a.visitDate)}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono text-xs">
                              {a.primaryDiagnosis || '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-mono tabular-nums">
                              <span
                                className="text-blue-600 dark:text-blue-400"
                                title="Diagnoses"
                              >
                                {a._count?.diagnoses ?? 0}
                              </span>
                              <span className="text-muted-foreground/40">/</span>
                              <span
                                className="text-emerald-600 dark:text-emerald-400"
                                title="Procedures"
                              >
                                {a._count?.procedures ?? 0}
                              </span>
                              <span className="text-muted-foreground/40">/</span>
                              <span className="text-primary" title="Billing Items">
                                {a._count?.visitBillingItems ?? 0}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-end">
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    totalItems={admissionTotal}
                    pageSize={50}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}

          {/* Preview step */}
          {step === 'preview' && previewResult && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {previewResult.valid.length}
                      </p>
                      <p className="text-xs text-muted-foreground">ผ่านการตรวจสอบ</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {previewResult.invalid.length}
                      </p>
                      <p className="text-xs text-muted-foreground">ไม่ผ่าน</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <BedDouble className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold font-mono tabular-nums text-foreground">
                        {formatAmount(previewResult.totalAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">ยอดรวม (บาท)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Valid admissions */}
              {previewResult.valid.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Admissions ที่พร้อมส่งออก
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {previewResult.valid.map((v) => (
                        <Badge key={v.visitId} variant="success" className="font-mono text-xs">
                          {v.an} — {formatAmount(v.amount)}฿
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Invalid admissions */}
              {previewResult.invalid.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Admissions ที่ไม่ผ่าน
                    </p>
                    <div className="space-y-1">
                      {previewResult.invalid.map((inv) => (
                        <div key={inv.visitId}>
                          <button
                            onClick={() =>
                              setExpandedInvalid(
                                expandedInvalid === inv.visitId ? null : inv.visitId,
                              )
                            }
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
                          >
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 text-muted-foreground transition-transform',
                                expandedInvalid === inv.visitId && 'rotate-180',
                              )}
                            />
                            <CodeBadge code={inv.an} />
                            <span className="text-xs text-rose-600 dark:text-rose-400">
                              {inv.issues.length} ปัญหา
                            </span>
                          </button>
                          {expandedInvalid === inv.visitId && (
                            <div className="ml-8 mt-1 mb-2 space-y-1">
                              {inv.issues.map((issue, i) => (
                                <p
                                  key={i}
                                  className="text-xs text-muted-foreground flex items-start gap-1.5"
                                >
                                  <ChevronRight className="h-3 w-3 mt-0.5 text-rose-400 shrink-0" />
                                  {issue}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3">
                <Button variant="outline" onClick={resetFlow}>
                  ← กลับ
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={previewResult.valid.length === 0}
                  className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-600 dark:hover:bg-teal-700"
                >
                  <Download className="h-4 w-4 mr-2" />
                  สร้างไฟล์ CIPN ({previewResult.valid.length} admissions)
                </Button>
              </div>
            </div>
          )}

          {/* Generating step */}
          {step === 'generating' && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  กำลังสร้างไฟล์ CIPN ZIP...
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <>
          {batchesLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : batches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">ยังไม่มีประวัติการส่งออก CIPN</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/60 text-muted-foreground">
                      <th className="px-3 py-2.5 text-left font-medium">งวดที่</th>
                      <th className="px-3 py-2.5 text-left font-medium">วันที่ส่งออก</th>
                      <th className="px-3 py-2.5 text-center font-medium">จำนวน</th>
                      <th className="px-3 py-2.5 text-right font-medium">ยอดรวม</th>
                      <th className="px-3 py-2.5 text-left font-medium">ไฟล์</th>
                      <th className="px-3 py-2.5 text-left font-medium">ผู้ส่งออก</th>
                      <th className="px-3 py-2.5 w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {batches.map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <Badge variant="secondary" className="font-mono">
                            {String(b.sessionNo).padStart(5, '0')}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatDate(b.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-center font-mono tabular-nums">
                          {b.visitCount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums">
                          {formatAmount(Number(b.totalAmount))}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {b.fileName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground text-xs">
                          {b.createdByUser?.fullName || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => handleDownloadBatch(b.id, b.fileName)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {Math.ceil(batchTotal / 20) > 1 && (
                <div className="flex justify-end">
                  <Pagination
                    page={batchPage}
                    totalPages={Math.ceil(batchTotal / 20)}
                    totalItems={batchTotal}
                    pageSize={20}
                    onPageChange={setBatchPage}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
