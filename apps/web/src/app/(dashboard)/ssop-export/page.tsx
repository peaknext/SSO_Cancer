'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
  Eye,
  ChevronDown,
  Pill,
  Stethoscope,
  Receipt,
  Loader2,
  CreditCard,
  Clock,
  BadgeCheck,
  Settings,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePaginatedApi, useApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Modal } from '@/components/ui/modal';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { HelpButton } from '@/components/shared/help-button';
import { useAuthStore } from '@/stores/auth-store';

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

interface BillingClaimDetail {
  visitId: number;
  vn: string;
  patientName: string;
  action: 'CREATED' | 'SKIPPED';
  skipReason?: 'ALREADY_PENDING' | 'ALREADY_APPROVED';
  roundNumber?: number;
}

interface BillingClaimPreviewResult {
  created: number;
  skipped: number;
  details: BillingClaimDetail[];
}

// ─── SSOP Preview Types & Labels ──────────────────────────────────────────

interface SsopPreviewData {
  billtran: Record<string, string>;
  billItems: Record<string, string>[];
  opService: Record<string, string>;
  opDx: Record<string, string>[];
  dispensing: Record<string, string> | null;
  dispensedItems: Record<string, string>[];
  validation: { valid: boolean; issues: string[] };
}

const BILLTRAN_LABELS: [string, string][] = [
  ['station', '#1 Station'],
  ['authcode', '#2 AuthCode'],
  ['dtTran', '#3 DtTran (วันเวลาทำรายการ)'],
  ['hcode', '#4 HCode (รหัส รพ.)'],
  ['invno', '#5 Invno (VN)'],
  ['billno', '#6 BillNo'],
  ['hn', '#7 HN (เลข รพ.)'],
  ['memberNo', '#8 MemberNo (เลขเคส)'],
  ['amount', '#9 Amount (ยอดเรียกเก็บ)'],
  ['paid', '#10 Paid'],
  ['verCode', '#11 VerCode (QR Code)'],
  ['tflag', '#12 TFlag'],
  ['pid', '#13 PID (เลขบัตร ปชช.)'],
  ['name', '#14 Name (ชื่อ-สกุล)'],
  ['hMain', '#15 HMain (รพ.ตามสิทธิ)'],
  ['payPlan', '#16 PayPlan'],
  ['claimAmt', '#17 ClaimAmt (ยอดเบิก)'],
  ['otherPayplan', '#18 OtherPayplan'],
  ['otherPay', '#19 OtherPay'],
];

const BILLITEM_LABELS: [string, string][] = [
  ['invno', '#1 Invno'],
  ['svDate', '#2 SvDate'],
  ['billMuad', '#3 BillMuad'],
  ['lcCode', '#4 LcCode (รหัส รพ.)'],
  ['stdCode', '#5 StdCode (TMT/AIPN)'],
  ['desc', '#6 Desc (รายละเอียด)'],
  ['qty', '#7 QTY'],
  ['up', '#8 UP (ราคาขาย)'],
  ['chargeAmt', '#9 ChargeAmt'],
  ['claimUp', '#10 ClaimUP (ราคาเบิก)'],
  ['claimAmount', '#11 ClaimAmount'],
  ['svRefId', '#12 SvRefID'],
  ['claimCat', '#13 ClaimCat'],
];

const OPSERVICE_LABELS: [string, string][] = [
  ['invno', '#1 Invno (VN)'],
  ['svId', '#2 SvID'],
  ['class_', '#3 Class'],
  ['hcode', '#4 HCode'],
  ['hn', '#5 HN'],
  ['pid', '#6 PID'],
  ['careAccount', '#7 CareAccount'],
  ['typeServ', '#8 TypeServ'],
  ['typeIn', '#9 TypeIn'],
  ['typeOut', '#10 TypeOut'],
  ['dtAppoint', '#11 DtAppoint'],
  ['svPid', '#12 SvPID (เลข ว.)'],
  ['clinic', '#13 Clinic'],
  ['begDt', '#14 BegDT (เริ่มบริการ)'],
  ['endDt', '#15 EndDT (สิ้นสุดบริการ)'],
  ['lcCode', '#16 LcCode'],
  ['codeSet', '#17 CodeSet'],
  ['stdCode', '#18 StdCode'],
  ['svCharge', '#19 SvCharge'],
  ['completion', '#20 Completion'],
  ['svTxCode', '#21 SvTxCode'],
  ['claimCat', '#22 ClaimCat'],
];

const OPDX_LABELS: [string, string][] = [
  ['class_', '#1 Class'],
  ['svId', '#2 SvID'],
  ['sl', '#3 SL (ลำดับ)'],
  ['codeSet', '#4 CodeSet'],
  ['code', '#5 Code (ICD-10)'],
  ['desc', '#6 Desc'],
];

const DISPENSING_LABELS: [string, string][] = [
  ['providerID', '#1 ProviderID'],
  ['dispId', '#2 DispID'],
  ['invno', '#3 Invno (VN)'],
  ['hn', '#4 HN'],
  ['pid', '#5 PID'],
  ['prescdt', '#6 PrescDT (สั่งยา)'],
  ['dispdt', '#7 DispDT (จ่ายยา)'],
  ['prescb', '#8 PrescB (เลข ว.)'],
  ['itemcnt', '#9 ItemCnt'],
  ['chargeAmt', '#10 ChargeAmt'],
  ['claimAmt', '#11 ClaimAmt'],
  ['paid', '#12 Paid'],
  ['otherPay', '#13 OtherPay'],
  ['reimburser', '#14 Reimburser'],
  ['benefitPlan', '#15 BenefitPlan'],
  ['dispeStat', '#16 DispeStat'],
  ['svId', '#17 SvID'],
  ['dayCover', '#18 DayCover'],
];

const DISPENSED_ITEM_LABELS: [string, string][] = [
  ['dispId', '#1 DispID'],
  ['prdCat', '#2 PrdCat'],
  ['hospdrgid', '#3 HospDrgID (รหัส รพ.)'],
  ['drgId', '#4 DrgID (TMT code)'],
  ['dfsCode', '#5 DfsCode'],
  ['dfsText', '#6 DfsText (ชื่อยา)'],
  ['packsize', '#7 PackSize'],
  ['sigCode', '#8 SigCode'],
  ['sigText', '#9 SigText (วิธีใช้)'],
  ['quantity', '#10 Quantity'],
  ['unitPrice', '#11 UnitPrice (ราคาขาย)'],
  ['chargeAmt', '#12 ChargeAmt'],
  ['reimbPrice', '#13 ReimbPrice (ราคาเบิก)'],
  ['reimbAmt', '#14 ReimbAmt'],
  ['prdSeCode', '#15 PrdSeCode'],
  ['claimcont', '#16 ClaimCont'],
  ['claimCat', '#17 ClaimCat'],
  ['multiDisp', '#18 MultiDisp'],
  ['supplyFor', '#19 SupplyFor'],
];

// ─── Admin Session Settings Panel ────────────────────────────────────────────

function SsopSessionSettings() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const { data: settingsData, refetch } = useApi<{ [group: string]: Array<{ settingKey: string; settingValue: string }> }>('/app-settings');
  const currentValue = settingsData?.ssop?.find((s) => s.settingKey === 'ssop_session_no_start')?.settingValue ?? '1';

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    setEditValue(currentValue);
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveEdit = async () => {
    const parsed = parseInt(editValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error('กรุณากรอกหมายเลขงวดที่ถูกต้อง (≥ 1)');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/app-settings/ssop_session_no_start', {
        settingValue: String(parsed),
      });
      toast.success('บันทึกหมายเลขงวดเริ่มต้นสำเร็จ');
      setIsEditing(false);
      refetch();
    } catch {
      toast.error('ไม่สามารถบันทึกได้');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="relative border-l-4 border-l-primary bg-card rounded-r-lg shadow-sm overflow-hidden">
      {/* Subtle teal grid shimmer */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 15px, var(--color-primary) 15px, var(--color-primary) 16px), repeating-linear-gradient(90deg, transparent, transparent 15px, var(--color-primary) 15px, var(--color-primary) 16px)',
        }}
      />

      <div className="relative px-4 py-3">
        {/* Top row: label + admin badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-widest">
            <Settings className="h-3 w-3" />
            ตั้งค่าการส่งออก
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Admin
          </span>
        </div>

        {/* Main content row */}
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs text-muted-foreground shrink-0">หมายเลขงวดเริ่มต้น:</span>
              <input
                type="number"
                min="1"
                step="1"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                autoFocus
                className="w-28 rounded-md border border-primary/50 bg-background px-3 py-1.5 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 tabular-nums"
              />
              <Button size="sm" className="h-8 px-3 text-xs" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                บันทึก
              </Button>
              <Button size="sm" variant="ghost" className="h-8 px-3 text-xs" onClick={cancelEdit} disabled={saving}>
                ยกเลิก
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground italic pl-0">
              ระบบจะใช้หมายเลขงวดที่สูงกว่าเสมอ — ถ้ามี batch ก่อนหน้าสูงกว่าค่านี้ จะใช้ต่อจากนั้น
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground shrink-0">หมายเลขงวดเริ่มต้น:</span>
            <span className="font-mono text-2xl font-bold text-primary tabular-nums leading-none">
              {String(currentValue).padStart(4, '0')}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground ml-auto"
              onClick={openEdit}
            >
              <Pencil className="h-3 w-3" />
              แก้ไข
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

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

  // SSOP preview modal
  const [previewVisit, setPreviewVisit] = useState<{ visitId: number; vn: string } | null>(null);

  // Post-export billing claim dialog
  const [postExportBatch, setPostExportBatch] = useState<{ batchId: number; sessNo: string } | null>(null);

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

      const batchId = parseInt(resp.headers.get('X-Batch-Id') || '0', 10);
      const sessNo = resp.headers.get('X-Sess-No') || '';

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

      // Open billing claim dialog after successful export
      if (batchId) {
        setPostExportBatch({ batchId, sessNo });
      }
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
            <HelpButton section="ssop-export" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            SSOP Electronic Claims — สร้างไฟล์เบิกค่ารักษาพยาบาลผู้ป่วยนอก
          </p>
        </div>
      </div>

      {/* Admin Session Settings */}
      <SsopSessionSettings />

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
              onPreviewSsop={setPreviewVisit}
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

      {/* SSOP Preview Modal */}
      {previewVisit && (
        <SsopPreviewModal
          open={!!previewVisit}
          onClose={() => setPreviewVisit(null)}
          visitId={previewVisit.visitId}
          vn={previewVisit.vn}
        />
      )}

      {/* Post-Export Billing Claim Dialog */}
      {postExportBatch && (
        <PostExportBillingDialog
          open={!!postExportBatch}
          onClose={() => setPostExportBatch(null)}
          batchId={postExportBatch.batchId}
          sessNo={postExportBatch.sessNo}
        />
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════════

// ─── PostExportBillingDialog ─────────────────────────────────────────────────

function PostExportBillingDialog({
  open,
  onClose,
  batchId,
  sessNo,
}: {
  open: boolean;
  onClose: () => void;
  batchId: number;
  sessNo: string;
}) {
  const [preview, setPreview] = useState<BillingClaimPreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState<{ created: number } | null>(null);

  // Fetch preview (dryRun) when dialog opens
  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.post<BillingClaimPreviewResult>(
        `/ssop-export/batches/${batchId}/create-billing-claims?dryRun=true`,
        {},
      );
      setPreview(data);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลการเรียกเก็บได้');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [batchId, onClose]);

  // Auto-fetch on open
  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const handleConfirm = useCallback(async () => {
    setConfirming(true);
    try {
      const data = await apiClient.post<BillingClaimPreviewResult>(
        `/ssop-export/batches/${batchId}/create-billing-claims?dryRun=false`,
        {},
      );
      setResult({ created: data.created });
      setDone(true);
      toast.success(`สร้างรอบการเรียกเก็บ ${data.created} รายการเรียบร้อย`);
    } catch {
      toast.error('ไม่สามารถสร้างรอบการเรียกเก็บได้');
    } finally {
      setConfirming(false);
    }
  }, [batchId]);

  const sessLabel = sessNo ? `งวด ${sessNo}` : `Batch #${batchId}`;

  return (
    <Modal open={open} onClose={onClose} maxWidth="2xl">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3 pb-3 border-b border-border">
          <div className="flex-shrink-0 w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="font-semibold text-foreground">ส่งออกสำเร็จ — {sessLabel}</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              ต้องการบันทึกรอบการเรียกเก็บสำหรับ visits เหล่านี้ด้วยไหม?
            </p>
          </div>
        </div>

        {/* Body */}
        {loading && (
          <div className="flex items-center justify-center py-10 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">กำลังโหลดข้อมูล...</span>
          </div>
        )}

        {!loading && done && result && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 flex items-center gap-3">
            <BadgeCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-emerald-800 dark:text-emerald-300">
                สร้างรอบการเรียกเก็บ {result.created} รายการเรียบร้อย
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                ดูรายละเอียดได้ที่หน้า ผู้ป่วยมะเร็ง → รายการเรียกเก็บ
              </p>
            </div>
          </div>
        )}

        {!loading && !done && preview && preview.created === 0 && (
          <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-4 flex items-center gap-3">
            <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
            <p className="text-sm text-sky-800 dark:text-sky-300">
              visits ทั้งหมดมีรอบการเรียกเก็บอยู่แล้ว (PENDING หรืออนุมัติแล้ว)
            </p>
          </div>
        )}

        {!loading && !done && preview && preview.created > 0 && (
          <>
            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/60">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-36">VN</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">ชื่อผู้ป่วย</th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground w-40">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.details.map((d) => (
                    <tr key={d.visitId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{d.vn}</td>
                      <td className="px-3 py-2 text-foreground">{d.patientName}</td>
                      <td className="px-3 py-2">
                        {d.action === 'CREATED' ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                            <CreditCard className="h-3.5 w-3.5" />
                            สร้างรอบที่ {d.roundNumber}
                          </span>
                        ) : d.skipReason === 'ALREADY_PENDING' ? (
                          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            ข้าม — รอผลอยู่
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            ข้าม — อนุมัติแล้ว
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              จะสร้างการเรียกเก็บ{' '}
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{preview.created} รายการ</span>
              {preview.skipped > 0 && (
                <> / ข้าม <span className="font-semibold">{preview.skipped} รายการ</span></>
              )}
            </p>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
          {done ? (
            <Button onClick={onClose}>ปิด</Button>
          ) : preview?.created === 0 && !loading ? (
            <Button onClick={onClose}>ปิด</Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose} disabled={confirming}>
                ข้ามขั้นตอนนี้
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={confirming || loading || !preview || preview.created === 0}
                className="bg-teal-600 hover:bg-teal-700 text-white dark:bg-teal-600 dark:hover:bg-teal-700"
              >
                {confirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <CreditCard className="h-4 w-4 mr-2" />
                ยืนยันสร้างการเรียกเก็บ
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

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
      <div className="flex flex-wrap gap-3 glass-light rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <ThaiDatePicker
            value={dateFrom}
            onChange={onDateFromChange}
            placeholder="จากวันที่"
            className="h-9 w-52 text-sm"
          />
          <span className="text-muted-foreground text-sm">—</span>
          <ThaiDatePicker
            value={dateTo}
            onChange={onDateToChange}
            placeholder="ถึงวันที่"
            className="h-9 w-52 text-sm"
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
  onPreviewSsop,
}: {
  result: PreviewResult;
  expandedInvalid: number | null;
  onToggleExpand: (id: number) => void;
  onGenerate: () => void;
  onBack: () => void;
  onPreviewSsop: (visit: { visitId: number; vn: string }) => void;
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
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 text-primary hover:text-primary"
                      onClick={() => onPreviewSsop({ visitId: v.visitId, vn: v.vn })}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      ดูข้อมูล SSOP
                    </Button>
                    <span className="font-mono text-sm tabular-nums text-foreground">
                      {v.amount.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} ฿
                    </span>
                  </div>
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

// ═════════════════════════════════════════════════════════════════════════════
// SSOP Preview Modal
// ═════════════════════════════════════════════════════════════════════════════

function SsopPreviewModal({
  open,
  onClose,
  visitId,
  vn,
}: {
  open: boolean;
  onClose: () => void;
  visitId: number;
  vn: string;
}) {
  const { data, isLoading } = useApi<SsopPreviewData>(
    `/ssop-export/preview-ssop/${visitId}`,
    { enabled: open },
  );

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    billtran: true,
    billdisp: true,
    opservices: true,
  });

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="full">
      <div className="max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="shrink-0 px-6 py-4 border-b border-border bg-gradient-to-r from-teal-50/80 via-transparent to-blue-50/80 dark:from-teal-950/30 dark:via-transparent dark:to-blue-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold text-foreground">
                  ตัวอย่างข้อมูล SSOP 0.93
                </h2>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-muted-foreground">VN</span>
                  <code className="font-mono text-sm font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded">
                    {vn}
                  </code>
                  {data && (
                    <span className="text-xs text-muted-foreground">
                      {data.billItems.length} billing items
                      {data.dispensedItems.length > 0 &&
                        ` / ${data.dispensedItems.length} dispensed items`}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
              <p className="text-sm text-muted-foreground">กำลังโหลดข้อมูล SSOP...</p>
            </div>
          ) : !data ? (
            <div className="py-20 text-center">
              <AlertTriangle className="h-9 w-9 mx-auto text-amber-500 mb-3" />
              <p className="text-sm text-muted-foreground">ไม่สามารถโหลดข้อมูลได้</p>
            </div>
          ) : (
            <>
              {/* Notices row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[280px] flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 px-4 py-2.5">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    ข้อมูลตัวอย่าง — <strong>Session No.</strong> และ <strong>TFlag</strong>{' '}
                    จะถูกกำหนดตอน Export จริง
                  </p>
                </div>

                {!data.validation.valid && (
                  <div className="flex-1 min-w-[280px] rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/40 px-4 py-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                      <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                        พบปัญหา {data.validation.issues.length} รายการ
                      </span>
                    </div>
                    <ul className="space-y-0.5 pl-5">
                      {data.validation.issues.map((issue, i) => (
                        <li
                          key={i}
                          className="text-[11px] text-rose-700 dark:text-rose-400 list-disc"
                        >
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Section 1: BILLTRAN.txt */}
              <SsopFileSection
                title="BILLTRAN.txt"
                subtitle="ข้อมูลการเรียกเก็บ (Billing Transaction)"
                icon={<Receipt className="h-4 w-4" />}
                color="teal"
                expanded={expanded.billtran}
                onToggle={() => toggleSection('billtran')}
              >
                <div className="space-y-5">
                  <FieldGrid
                    heading="BILLTRAN Record"
                    fieldCount={19}
                    record={data.billtran}
                    labels={BILLTRAN_LABELS}
                    accentColor="teal"
                  />
                  {data.billItems.length > 0 && (
                    <DataTable
                      heading="BillItems"
                      recordCount={data.billItems.length}
                      records={data.billItems}
                      labels={BILLITEM_LABELS}
                      accentColor="teal"
                    />
                  )}
                </div>
              </SsopFileSection>

              {/* Section 2: BILLDISP.txt */}
              <SsopFileSection
                title="BILLDISP.txt"
                subtitle="ข้อมูลการจ่ายยา (Drug Dispensing)"
                icon={<Pill className="h-4 w-4" />}
                color="violet"
                expanded={expanded.billdisp}
                onToggle={() => toggleSection('billdisp')}
              >
                {data.dispensing ? (
                  <div className="space-y-5">
                    <FieldGrid
                      heading="Dispensing Record"
                      fieldCount={18}
                      record={data.dispensing}
                      labels={DISPENSING_LABELS}
                      accentColor="violet"
                    />
                    {data.dispensedItems.length > 0 && (
                      <DataTable
                        heading="DispensedItems"
                        recordCount={data.dispensedItems.length}
                        records={data.dispensedItems}
                        labels={DISPENSED_ITEM_LABELS}
                        accentColor="violet"
                      />
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <Pill className="h-6 w-6 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      ไม่มีรายการยา (billingGroup 3/5)
                    </p>
                  </div>
                )}
              </SsopFileSection>

              {/* Section 3: OPServices.txt */}
              <SsopFileSection
                title="OPServices.txt"
                subtitle="ข้อมูลบริการทางการแพทย์ (Outpatient Services)"
                icon={<Stethoscope className="h-4 w-4" />}
                color="blue"
                expanded={expanded.opservices}
                onToggle={() => toggleSection('opservices')}
              >
                <div className="space-y-5">
                  <FieldGrid
                    heading="OPServices Record"
                    fieldCount={22}
                    record={data.opService}
                    labels={OPSERVICE_LABELS}
                    accentColor="blue"
                  />
                  {data.opDx.length > 0 && (
                    <DataTable
                      heading="OPDx"
                      recordCount={data.opDx.length}
                      records={data.opDx}
                      labels={OPDX_LABELS}
                      accentColor="blue"
                    />
                  )}
                </div>
              </SsopFileSection>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 px-6 py-3 border-t border-border flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground/60">
            SSOP 0.93 &middot; Pipe-delimited &middot; Windows-874
          </p>
          <Button variant="outline" onClick={onClose} className="px-6">
            ปิด
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── SSOP File Section (collapsible) ────────────────────────────────────────

const FILE_SECTION_STYLES = {
  teal: {
    header: 'bg-teal-50/80 dark:bg-teal-950/20 border-teal-200/70 dark:border-teal-800/30',
    badge: 'bg-teal-600 dark:bg-teal-500 text-white',
    icon: 'text-teal-600 dark:text-teal-400',
    line: 'bg-teal-400/60 dark:bg-teal-500/40',
  },
  violet: {
    header: 'bg-violet-50/80 dark:bg-violet-950/20 border-violet-200/70 dark:border-violet-800/30',
    badge: 'bg-violet-600 dark:bg-violet-500 text-white',
    icon: 'text-violet-600 dark:text-violet-400',
    line: 'bg-violet-400/60 dark:bg-violet-500/40',
  },
  blue: {
    header: 'bg-blue-50/80 dark:bg-blue-950/20 border-blue-200/70 dark:border-blue-800/30',
    badge: 'bg-blue-600 dark:bg-blue-500 text-white',
    icon: 'text-blue-600 dark:text-blue-400',
    line: 'bg-blue-400/60 dark:bg-blue-500/40',
  },
} as const;

function SsopFileSection({
  title,
  subtitle,
  icon,
  color,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: keyof typeof FILE_SECTION_STYLES;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const s = FILE_SECTION_STYLES[color];

  return (
    <div className="rounded-xl border border-border/80 overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between px-5 py-3 transition-colors',
          s.header,
        )}
      >
        <div className="flex items-center gap-3">
          <span className={cn('shrink-0', s.icon)}>{icon}</span>
          <span
            className={cn(
              'text-[11px] font-bold font-mono px-2.5 py-1 rounded-md tracking-wide',
              s.badge,
            )}
          >
            {title}
          </span>
          <span className="text-sm text-foreground/60 hidden sm:inline">{subtitle}</span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200',
            !expanded && '-rotate-90',
          )}
        />
      </button>
      {expanded && (
        <div className="relative">
          {/* Left accent line */}
          <div className={cn('absolute left-0 top-0 bottom-0 w-[3px]', s.line)} />
          <div className="p-5 pl-6">{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── Field Grid (key-value pairs in 3-col ledger layout) ────────────────────

function FieldGrid({
  heading,
  fieldCount,
  record,
  labels,
  accentColor,
}: {
  heading: string;
  fieldCount: number;
  record: Record<string, string>;
  labels: [string, string][];
  accentColor: 'teal' | 'violet' | 'blue';
}) {
  const values = Object.values(record);
  const dotColor = {
    teal: 'bg-teal-500',
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
  }[accentColor];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
        <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
          {heading}
        </h4>
        <span className="text-[10px] text-muted-foreground/60 font-mono">({fieldCount} fields)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-0">
        {labels.map(([key, label], idx) => {
          const val = String(values[idx] ?? '');
          const isEmpty = !val;

          return (
            <div
              key={key}
              className={cn(
                'group flex items-baseline gap-3 py-1.5',
                'border-b border-dashed border-border/40',
              )}
            >
              <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0 tabular-nums">
                {label}
              </span>
              <span className="flex-1 border-b border-dotted border-border/30 min-w-[20px] h-3" />
              <span
                className={cn(
                  'font-mono text-xs shrink-0 max-w-[300px] truncate',
                  isEmpty
                    ? 'text-muted-foreground/30 italic'
                    : 'text-foreground font-medium group-hover:text-primary transition-colors',
                )}
                title={val}
              >
                {isEmpty ? '—' : val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Data Table (scrollable records table) ───────────────────────────────────

function DataTable({
  heading,
  recordCount,
  records,
  labels,
  accentColor,
}: {
  heading: string;
  recordCount: number;
  records: Record<string, string>[];
  labels: [string, string][];
  accentColor: 'teal' | 'violet' | 'blue';
}) {
  const dotColor = {
    teal: 'bg-teal-500',
    violet: 'bg-violet-500',
    blue: 'bg-blue-500',
  }[accentColor];

  const stripeColor = {
    teal: 'bg-teal-50/40 dark:bg-teal-950/10',
    violet: 'bg-violet-50/40 dark:bg-violet-950/10',
    blue: 'bg-blue-50/40 dark:bg-blue-950/10',
  }[accentColor];

  const theadBg = {
    teal: 'bg-teal-600 dark:bg-teal-700',
    violet: 'bg-violet-600 dark:bg-violet-700',
    blue: 'bg-blue-600 dark:bg-blue-700',
  }[accentColor];

  // Find the ClaimCat column index for OPR row highlighting
  const claimCatColIdx = labels.findIndex(([key]) => key === 'claimCat');

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
        <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
          {heading}
        </h4>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
          {recordCount}
        </Badge>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10">
              <tr className={theadBg}>
                <th className="px-2 py-2 text-center text-white/70 font-medium border-b border-r border-white/15 w-8">
                  #
                </th>
                {labels.map(([key, label]) => (
                  <th
                    key={key}
                    className="px-3 py-2 text-left font-medium text-white whitespace-nowrap border-b border-white/15"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, rowIdx) => {
                const rowValues = Object.values(rec);
                const isOpr =
                  claimCatColIdx >= 0 &&
                  String(rowValues[claimCatColIdx] ?? '').toUpperCase() === 'OPR';
                return (
                  <tr
                    key={rowIdx}
                    className={cn(
                      'border-b last:border-b-0 transition-colors',
                      isOpr
                        ? 'bg-amber-50/70 dark:bg-amber-950/25 hover:bg-amber-100/70 dark:hover:bg-amber-950/40 border-l-2 border-l-amber-500 dark:border-l-amber-400'
                        : cn('hover:bg-muted/30', rowIdx % 2 === 1 && stripeColor),
                    )}
                  >
                    <td
                      className={cn(
                        'px-2 py-1.5 text-center font-mono border-r border-border/30 tabular-nums',
                        isOpr
                          ? 'text-amber-700 dark:text-amber-300 font-semibold'
                          : 'text-muted-foreground/40',
                      )}
                    >
                      {rowIdx + 1}
                    </td>
                    {labels.map(([key], colIdx) => {
                      const val = String(rowValues[colIdx] ?? '');
                      const isClaimCatCell = key === 'claimCat';
                      return (
                        <td
                          key={colIdx}
                          className={cn(
                            'px-3 py-1.5 font-mono whitespace-nowrap',
                            isOpr ? 'text-amber-900 dark:text-amber-100' : 'text-foreground',
                          )}
                          title={val}
                        >
                          {isClaimCatCell && val === 'OPR' ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 dark:bg-amber-400/20 border border-amber-500/30 dark:border-amber-400/25 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 dark:text-amber-300">
                              <span className="w-1 h-1 rounded-full bg-amber-500 dark:bg-amber-400 animate-pulse" />
                              OPR
                            </span>
                          ) : val ? (
                            val
                          ) : (
                            <span className="text-muted-foreground/30">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
