'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  RefreshCw,
  Minus,
  ChevronDown,
  ChevronRight,
  Loader2,
  Package,
  Pill,
  Wrench,
  ArrowRight,
  CalendarClock,
  Ban,
  GitBranch,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApi, usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { TableSkeleton, Skeleton } from '@/components/shared/loading-skeleton';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CatalogStats {
  total: number;
  uniqueCodes: number;
  drugCount: number;
  equipmentCount: number;
  priceStats: { _avg: { rate: number }; _max: { rate: number }; _min: { rate: number } };
}

interface AipnParsedRow {
  billingGroup: string;
  code: number;
  unit: string;
  rate: number;
  rate2: number;
  description: string;
  dateRevised: string;
  dateEffective: string;
  dateExpiry: string;
  lastUpdated: string;
  condition: string;
  note: string;
}

interface AipnFieldChange {
  old: string | number;
  new: string | number;
}

interface DiffResult {
  fileRowCount: number;
  filteredRowCount: number;
  newCodes: AipnParsedRow[];
  newVersions: AipnParsedRow[];
  changedItems: {
    current: {
      code: number;
      description: string;
      rate: number;
      unit: string;
      dateEffective: string;
      dateExpiry: string;
    };
    incoming: AipnParsedRow;
    changes: Record<string, AipnFieldChange>;
  }[];
  removedItems: { code: number; description: string; rate: number }[];
  unchangedCount: number;
}

interface ImportResult {
  created: number;
  updated: number;
  deactivated: number;
}

interface AipnItem {
  id: number;
  billingGroup: string;
  code: number;
  unit: string;
  rate: number;
  description: string;
  dateEffective: string;
  dateExpiry: string;
  isActive: boolean;
}

interface AipnListResponse {
  data: AipnItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

type ImportStep = 'idle' | 'preview' | 'result';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const billingGroupOptions = [
  { value: '03', label: '03 — ยา' },
  { value: '12', label: '12 — ค่าผสมยาฯ' },
];

function formatRate(rate: number): string {
  return rate.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatThaiDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getItemStatus(item: AipnItem): {
  label: string;
  variant: 'default' | 'warning' | 'destructive' | 'secondary';
} {
  if (!item.isActive) return { label: 'ปิดใช้งาน', variant: 'secondary' };
  const now = new Date();
  const eff = new Date(item.dateEffective);
  const exp = new Date(item.dateExpiry);
  if (eff > now) return { label: 'ยังไม่มีผล', variant: 'warning' };
  if (exp < now) return { label: 'หมดอายุ', variant: 'destructive' };
  return { label: 'ใช้งาน', variant: 'default' };
}

const FIELD_LABELS: Record<string, string> = {
  rate: 'อัตราเบิก',
  rate2: 'อัตราเบิก 2',
  description: 'รายละเอียด',
  unit: 'หน่วย',
  billingGroup: 'กลุ่ม',
  dateEffective: 'วันมีผล',
  dateExpiry: 'วันหมดอายุ',
  dateRevised: 'วันแก้ไข',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AipnCatalogPage() {
  // Import state
  const [importStep, setImportStep] = useState<ImportStep>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Collapsible sections
  const [showNew, setShowNew] = useState(true);
  const [showNewVersions, setShowNewVersions] = useState(true);
  const [showChanged, setShowChanged] = useState(true);
  const [showRemoved, setShowRemoved] = useState(true);

  // Data table state
  const [page, setPage, h1] = usePersistedState('sso-aipn-page', 1);
  const [search, setSearch, h2] = usePersistedState('sso-aipn-search', '');
  const [billingGroup, setBillingGroup, h3] = usePersistedState('sso-aipn-bg', '');
  const filtersHydrated = h1 && h2 && h3;

  // API calls
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useApi<CatalogStats>('/sso-aipn-catalog/stats');

  const {
    data: listResponse,
    isLoading: listLoading,
    refetch: refetchList,
  } = usePaginatedApi<AipnListResponse>(
    '/sso-aipn-catalog',
    { page, limit: 25, search: search || undefined, billingGroup: billingGroup || undefined },
    { enabled: filtersHydrated },
  );

  // ─── Import handlers ────────────────────────────────────────────────────

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', f);
      const data = await apiClient.upload<DiffResult>(
        '/sso-aipn-catalog/import/preview',
        formData,
      );
      setDiff(data);
      setImportStep('preview');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'เกิดข้อผิดพลาดในการอ่านไฟล์';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleConfirm = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await apiClient.upload<ImportResult>(
        '/sso-aipn-catalog/import/confirm',
        formData,
      );
      setImportResult(data);
      setImportStep('result');
      toast.success('อัปเดตบัญชี AIPN สำเร็จ');
      refetchStats();
      refetchList();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'error' in err
          ? (err as { error: { message: string } }).error.message
          : 'เกิดข้อผิดพลาดในการนำเข้า';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setImportStep('idle');
    setFile(null);
    setDiff(null);
    setImportResult(null);
    setError(null);
  };

  const handleSearch = useCallback(
    (v: string) => {
      setSearch(v);
      setPage(1);
    },
    [setSearch, setPage],
  );

  // Check if diff has any changes
  const hasChanges = diff
    ? diff.newCodes.length > 0 || diff.newVersions.length > 0 ||
      diff.changedItems.length > 0 || diff.removedItems.length > 0
    : false;

  // ─── Data table columns ─────────────────────────────────────────────────

  const columns: Column<AipnItem>[] = useMemo(
    () => [
      {
        key: 'code',
        header: 'รหัส',
        className: 'w-[80px]',
        render: (row) => (
          <span className="font-mono text-sm font-medium tabular-nums">{row.code}</span>
        ),
      },
      {
        key: 'description',
        header: 'รายละเอียด',
        render: (row) => (
          <span className="text-sm line-clamp-1" title={row.description}>
            {row.description}
          </span>
        ),
      },
      {
        key: 'billingGroup',
        header: 'กลุ่ม',
        className: 'w-[70px]',
        render: (row) => (
          <Badge variant="secondary" className="text-[10px] font-mono">
            {row.billingGroup}
          </Badge>
        ),
      },
      {
        key: 'rate',
        header: 'อัตราเบิก',
        className: 'w-[110px] text-right',
        render: (row) => (
          <span className="font-mono text-sm tabular-nums">{formatRate(Number(row.rate))}</span>
        ),
      },
      {
        key: 'unit',
        header: 'หน่วย',
        className: 'w-[80px]',
        render: (row) => <span className="text-xs text-muted-foreground">{row.unit}</span>,
      },
      {
        key: 'dateEffective',
        header: 'วันมีผล',
        className: 'w-[110px]',
        render: (row) => (
          <span className="text-xs text-muted-foreground">{formatThaiDate(row.dateEffective)}</span>
        ),
      },
      {
        key: 'dateExpiry',
        header: 'วันหมดอายุ',
        className: 'w-[110px]',
        render: (row) => (
          <span className="text-xs text-muted-foreground">{formatThaiDate(row.dateExpiry)}</span>
        ),
      },
      {
        key: 'status',
        header: 'สถานะ',
        className: 'w-[100px]',
        render: (row) => {
          const s = getItemStatus(row);
          return (
            <Badge variant={s.variant} className="text-[10px]">
              {s.label}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-heading text-xl font-bold">บัญชียา/อุปกรณ์ AIPN</h1>
        <p className="text-sm text-muted-foreground mt-1">
          อัปเดตบัญชี EquipdevAIPN จาก สปส. และดูรายการที่มีอยู่ในระบบ
        </p>
      </div>

      {/* ── UPPER SECTION: Import Flow ────────────────────────────────────── */}

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="รหัสยา/อุปกรณ์"
          value={stats?.uniqueCodes}
          loading={statsLoading}
        />
        <StatCard
          icon={<Pill className="h-4 w-4" />}
          label="ยา (กลุ่ม 03)"
          value={stats?.drugCount}
          loading={statsLoading}
          color="text-teal-600 dark:text-teal-400"
        />
        <StatCard
          icon={<Wrench className="h-4 w-4" />}
          label="อุปกรณ์/อื่นๆ"
          value={stats?.equipmentCount}
          loading={statsLoading}
          color="text-amber-600 dark:text-amber-400"
        />
        <StatCard
          icon={<Pill className="h-4 w-4" />}
          label="ราคาเฉลี่ย"
          value={
            stats?.priceStats?._avg?.rate != null
              ? formatRate(Number(stats.priceStats._avg.rate))
              : undefined
          }
          loading={statsLoading}
          suffix="฿"
          color="text-emerald-600 dark:text-emerald-400"
        />
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Step 1: Upload (idle) */}
      {importStep === 'idle' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              นำเข้าบัญชี AIPN ล่าสุด
              <span className="text-xs font-normal text-muted-foreground">Import</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors',
                dragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">กำลังวิเคราะห์ไฟล์...</p>
                </>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <FileSpreadsheet className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">ลากไฟล์ EquipdevAIPN (.xlsx) มาวางที่นี่</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      หรือคลิกเพื่อเลือกไฟล์ (สูงสุด 10 MB)
                    </p>
                  </div>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>เลือกไฟล์</span>
                    </Button>
                    <input
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                  </label>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Diff Preview */}
      {importStep === 'preview' && diff && (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center gap-3 text-sm">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="font-medium">{file?.name}</span>
            <span className="text-muted-foreground">
              ({diff.filteredRowCount.toLocaleString()} รายการ จาก {diff.fileRowCount.toLocaleString()} แถว)
            </span>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryCard
              count={diff.newCodes.length}
              label="รหัสใหม่"
              icon={<Plus className="h-3.5 w-3.5" />}
              color="text-emerald-600 dark:text-emerald-400"
              bgColor="bg-emerald-50 dark:bg-emerald-950/30"
              borderColor="border-emerald-200 dark:border-emerald-800/40"
            />
            <SummaryCard
              count={diff.newVersions.length}
              label="เวอร์ชันใหม่"
              icon={<GitBranch className="h-3.5 w-3.5" />}
              color="text-sky-600 dark:text-sky-400"
              bgColor="bg-sky-50 dark:bg-sky-950/30"
              borderColor="border-sky-200 dark:border-sky-800/40"
            />
            <SummaryCard
              count={diff.changedItems.length}
              label="เปลี่ยนแปลง"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              color="text-amber-600 dark:text-amber-400"
              bgColor="bg-amber-50 dark:bg-amber-950/30"
              borderColor="border-amber-200 dark:border-amber-800/40"
            />
            <SummaryCard
              count={diff.removedItems.length}
              label="จะปิดใช้งาน"
              icon={<Minus className="h-3.5 w-3.5" />}
              color="text-rose-600 dark:text-rose-400"
              bgColor="bg-rose-50 dark:bg-rose-950/30"
              borderColor="border-rose-200 dark:border-rose-800/40"
            />
            <SummaryCard
              count={diff.unchangedCount}
              label="ไม่เปลี่ยนแปลง"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              color="text-muted-foreground"
              bgColor="bg-muted/30"
              borderColor="border-border/60"
            />
          </div>

          {/* No changes notice */}
          {!hasChanges && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              ข้อมูลในไฟล์ตรงกับฐานข้อมูลทั้งหมด — ไม่มีการเปลี่ยนแปลง
            </div>
          )}

          {/* New codes */}
          {diff.newCodes.length > 0 && (
            <CollapsibleSection
              title={`รหัสใหม่ (${diff.newCodes.length})`}
              open={showNew}
              onToggle={() => setShowNew(!showNew)}
              color="text-emerald-600 dark:text-emerald-400"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">รหัส</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">รายละเอียด</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">อัตราเบิก</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">หน่วย</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">วันมีผล</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.newCodes.map((item) => {
                      const isFuture = new Date(item.dateEffective) > new Date();
                      return (
                        <tr key={`${item.code}-${item.dateEffective}`} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono tabular-nums">{item.code}</td>
                          <td className="px-3 py-2 max-w-[300px] truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {formatRate(item.rate)}
                          </td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1">
                              {formatThaiDate(item.dateEffective)}
                              {isFuture && (
                                <Badge variant="warning" className="text-[9px] ml-1">
                                  <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                                  อนาคต
                                </Badge>
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* New versions (existing code, new date range) */}
          {diff.newVersions.length > 0 && (
            <CollapsibleSection
              title={`เวอร์ชันใหม่ — ราคา/ช่วงเวลาใหม่ของรหัสที่มีอยู่ (${diff.newVersions.length})`}
              open={showNewVersions}
              onToggle={() => setShowNewVersions(!showNewVersions)}
              color="text-sky-600 dark:text-sky-400"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">รหัส</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">รายละเอียด</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">อัตราเบิก</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">หน่วย</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">วันมีผล</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">วันหมดอายุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.newVersions.map((item) => {
                      const isFuture = new Date(item.dateEffective) > new Date();
                      return (
                        <tr key={`${item.code}-${item.dateEffective}`} className="border-b last:border-0">
                          <td className="px-3 py-2 font-mono tabular-nums">{item.code}</td>
                          <td className="px-3 py-2 max-w-[300px] truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums">
                            {formatRate(item.rate)}
                          </td>
                          <td className="px-3 py-2">{item.unit}</td>
                          <td className="px-3 py-2">
                            <span className="flex items-center gap-1">
                              {formatThaiDate(item.dateEffective)}
                              {isFuture && (
                                <Badge variant="warning" className="text-[9px] ml-1">
                                  <CalendarClock className="h-2.5 w-2.5 mr-0.5" />
                                  อนาคต
                                </Badge>
                              )}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatThaiDate(item.dateExpiry)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Changed items */}
          {diff.changedItems.length > 0 && (
            <CollapsibleSection
              title={`รายการที่เปลี่ยนแปลง (${diff.changedItems.length})`}
              open={showChanged}
              onToggle={() => setShowChanged(!showChanged)}
              color="text-amber-600 dark:text-amber-400"
            >
              <div className="divide-y divide-border/50">
                {diff.changedItems.map((item) => (
                  <div key={item.current.code} className="px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium tabular-nums">
                        {item.current.code}
                      </span>
                      <span className="text-xs truncate max-w-[400px]" title={item.incoming.description}>
                        {item.incoming.description}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {Object.entries(item.changes).map(([field, change]) => (
                        <div key={field} className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-muted-foreground">
                            {FIELD_LABELS[field] || field}:
                          </span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 line-through">
                            {field === 'rate' || field === 'rate2'
                              ? formatRate(Number(change.old))
                              : String(change.old)}
                          </span>
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            {field === 'rate' || field === 'rate2'
                              ? formatRate(Number(change.new))
                              : String(change.new)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Removed items */}
          {diff.removedItems.length > 0 && (
            <CollapsibleSection
              title={`รายการที่จะปิดใช้งาน (${diff.removedItems.length})`}
              open={showRemoved}
              onToggle={() => setShowRemoved(!showRemoved)}
              color="text-rose-600 dark:text-rose-400"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">รหัส</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">รายละเอียด</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">อัตราเบิก</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diff.removedItems.map((item) => (
                      <tr key={item.code} className="border-b last:border-0 text-muted-foreground">
                        <td className="px-3 py-2 font-mono tabular-nums">{item.code}</td>
                        <td className="px-3 py-2 max-w-[400px] truncate">{item.description}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {formatRate(item.rate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CollapsibleSection>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={resetImport}>
              ยกเลิก
            </Button>
            <Button onClick={handleConfirm} disabled={loading || !hasChanges}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  กำลังอัปเดต...
                </>
              ) : (
                'ยืนยันการอัปเดต'
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {importStep === 'result' && importResult && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold">อัปเดตบัญชี AIPN สำเร็จ</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  เพิ่ม {importResult.created} รายการ, แก้ไข {importResult.updated} รายการ,
                  ปิดใช้งาน {importResult.deactivated} รายการ
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
                <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {importResult.created}
                </p>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">เพิ่มใหม่</p>
              </div>
              <div className="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-center">
                <p className="text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {importResult.updated}
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80">แก้ไข</p>
              </div>
              <div className="rounded-lg border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30 p-3 text-center">
                <p className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                  {importResult.deactivated}
                </p>
                <p className="text-xs text-rose-600/80 dark:text-rose-400/80">ปิดใช้งาน</p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 px-3.5 py-2.5 text-xs text-blue-800 dark:text-blue-200">
              <CalendarClock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              รายการที่มีวันมีผลบังคับใช้ในอนาคต จะถูกนำมาใช้โดยอัตโนมัติเมื่อถึงวันที่กำหนด
            </div>

            <Button variant="outline" onClick={resetImport} className="w-full">
              เสร็จสิ้น
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── LOWER SECTION: Data Table ─────────────────────────────────────── */}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold">
            รายการในระบบ
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {listResponse?.meta?.total?.toLocaleString() ?? '...'} รายการ
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="ค้นหารหัสหรือชื่อยา..."
            className="w-full sm:w-[280px]"
          />
          <Select
            value={billingGroup}
            onChange={(v) => {
              setBillingGroup(v);
              setPage(1);
            }}
            options={billingGroupOptions}
            placeholder="กลุ่มทั้งหมด"
            className="w-full sm:w-[180px]"
          />
        </div>

        {listLoading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <DataTable
            columns={columns}
            data={listResponse?.data ?? []}
            totalItems={listResponse?.meta?.total ?? 0}
            page={page}
            pageSize={25}
            onPageChange={setPage}
            rowKey={(r) => r.id}
            emptyTitle="ไม่พบรายการ"
            emptyDescription="ลองค้นหาด้วยคำค้นอื่น"
          />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  loading,
  suffix,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number | string;
  loading: boolean;
  suffix?: string;
  color?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
          <span className={color}>{icon}</span>
          <span className="text-xs">{label}</span>
        </div>
        {loading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <p className="text-lg font-bold tabular-nums font-mono">
            {typeof value === 'number' ? value.toLocaleString() : value ?? '—'}
            {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SummaryCard({
  count,
  label,
  icon,
  color,
  bgColor,
  borderColor,
}: {
  count: number;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', bgColor, borderColor)}>
      <div className={cn('flex items-center gap-1.5 text-xs', color)}>
        {icon}
        {label}
      </div>
      <p className={cn('text-xl font-bold tabular-nums mt-0.5', color)}>{count.toLocaleString()}</p>
    </div>
  );
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  color,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 text-left"
      >
        <span className={cn('text-sm font-medium', color)}>{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t">
          <div className="max-h-[400px] overflow-auto">{children}</div>
        </div>
      )}
    </Card>
  );
}
