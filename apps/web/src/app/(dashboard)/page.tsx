'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Coins,
  Crown,
  Syringe,
  CircleCheckBig,
  Clock,
  ChevronDown,
  AlertCircle,
  Filter,
  X,
  Receipt,
  UserPlus,
  ScanSearch,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { apiClient } from '@/lib/api-client';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  VisitsBySiteChart,
  TopDrugsChart,
  BillingApprovalRateChart,
  ConfirmationRateChart,
} from '@/components/dashboard/charts';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { CodeBadge } from '@/components/shared/code-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { cn } from '@/lib/utils';
import { HelpButton } from '@/components/shared/help-button';

interface TopCancerSite {
  id: number;
  nameThai: string;
  nameEnglish: string;
  siteCode: string;
  visitCount: number;
  percentage: number;
}

interface VisitDateRange {
  minDate: string;
  maxDate: string;
}

interface DashboardOverview {
  cancerSites: number;
  protocols: number;
  regimens: number;
  totalVisits: number;
  topCancerSite: TopCancerSite | null;
  emptyRegimensCount: number;
  visitDateRange: VisitDateRange | null;
}

interface Z51BillingStats {
  totalZ51Visits: number;
  approvedZ51Visits: number;
  pendingZ51Visits: number;
  rejectedZ51Visits: number;
  billedZ51Visits: number;
}

interface Z51ActionableVisit {
  vn: string;
  hn: string;
  visitDate: string;
  patientId: number | null;
  fullName: string | null;
  caseNumber: string | null;
  protocolCode: string | null;
  protocolNameThai: string | null;
  billingStatus: string | null;
}

interface Z51ActionableResponse {
  data: Z51ActionableVisit[];
  total: number;
}

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  });
}

interface VisitBySite {
  id: number;
  siteCode: string;
  nameThai: string;
  nameEnglish: string;
  visitCount: number;
}

interface TopDrug {
  id: number;
  genericName: string;
  drugCategory: string | null;
  visitCount: number;
}

interface ConfirmationRate {
  totalVisits: number;
  confirmedVisits: number;
  unconfirmedVisits: number;
  confirmationRate: number;
}

interface EmptyRegimen {
  id: number;
  regimenCode: string;
  regimenName: string;
  regimenType: string | null;
  protocolCount: number;
}

interface AiStats {
  totalCalls: number;
  totalTokens: number;
  topUser: {
    userId: number;
    fullName: string;
    callCount: number;
  } | null;
}

interface PatientWithoutCase {
  id: number;
  hn: string;
  fullName: string;
  firstTreatmentDate: string | null;
  visitVn: string | null;
}

/* ═══════════════════════════════════════════
   TIME ELAPSED HELPER
   ═══════════════════════════════════════════ */

function getTimeElapsed(visitDateIso: string) {
  const visitDate = new Date(visitDateIso);
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysElapsed = Math.floor((now.getTime() - visitDate.getTime()) / msPerDay);
  const totalDays = 730; // 2 years
  const daysRemaining = totalDays - daysElapsed;

  let urgency: 'green' | 'amber' | 'orange' | 'red' | 'expired';
  if (daysRemaining <= 0) {
    urgency = 'expired';
  } else if (daysRemaining < 90) {
    urgency = 'red';
  } else if (daysRemaining < 180) {
    urgency = 'orange';
  } else if (daysRemaining < 365) {
    urgency = 'amber';
  } else {
    urgency = 'green';
  }

  let label: string;
  if (daysElapsed < 30) {
    label = `${daysElapsed} วัน`;
  } else if (daysElapsed < 365) {
    const months = Math.floor(daysElapsed / 30);
    const remainDays = daysElapsed % 30;
    label = remainDays > 0 ? `${months} เดือน ${remainDays} วัน` : `${months} เดือน`;
  } else {
    const years = Math.floor(daysElapsed / 365);
    const remainMonths = Math.floor((daysElapsed % 365) / 30);
    label = remainMonths > 0 ? `${years} ปี ${remainMonths} เดือน` : `${years} ปี`;
  }

  return { label, daysElapsed, daysRemaining, urgency };
}

const URGENCY_STYLES: Record<string, string> = {
  green: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  orange: 'text-orange-600 dark:text-orange-400',
  red: 'text-red-600 dark:text-red-400',
  expired: 'text-red-700 dark:text-red-300 font-bold',
};

/* ═══════════════════════════════════════════
   SECTION HEADER
   ═══════════════════════════════════════════ */

function SectionLabel({ children, dot }: { children: React.ReactNode; dot?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dot || 'bg-primary'}`} />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {children}
      </span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  );
}

/* ═══════════════════════════════════════════
   NIGHTLY SCAN TYPES
   ═══════════════════════════════════════════ */

interface NightlyScanLastResult {
  date: string;
  startedAt: string;
  finishedAt?: string;
  status: 'success' | 'error';
  totalScanned: number;
  newPatients: number;
  newVisits: number;
  skipped: number;
  errors: number;
  error?: string;
}

interface NightlyScanImport {
  id: number;
  hn: string;
  importedVisits: number;
  patient: { id: number; hn: string; fullName: string } | null;
}

interface NightlyScanSummary {
  enabled: boolean;
  lastScan: NightlyScanLastResult | null;
  recentImports: NightlyScanImport[];
}

/* ═══════════════════════════════════════════
   NIGHTLY SCAN WIDGET
   ═══════════════════════════════════════════ */

function NightlyScanWidget() {
  const { data: scanData, refetch: refetchScan } = useApi<NightlyScanSummary>('/dashboard/nightly-scan');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    if (!isAdmin || toggling || !scanData) return;
    setToggling(true);
    try {
      const newValue = scanData.enabled ? 'false' : 'true';
      await apiClient.patch('/app-settings/his_nightly_scan_enabled', { settingValue: newValue });
      refetchScan();
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  if (!scanData) {
    return (
      <div className="space-y-3">
        <SectionLabel dot="bg-slate-400">การสแกน HIS อัตโนมัติ</SectionLabel>
        <div className="glass glass-noise relative overflow-hidden rounded-xl p-4">
          <div className="h-5 w-48 animate-pulse rounded bg-muted/50" />
          <div className="mt-2 h-3 w-72 animate-pulse rounded bg-muted/30" />
        </div>
      </div>
    );
  }

  const { enabled, lastScan, recentImports } = scanData;
  const dotColor = enabled ? 'bg-emerald-500' : 'bg-slate-400';

  return (
    <div className="space-y-3">
      <SectionLabel dot={dotColor}>การสแกน HIS อัตโนมัติ</SectionLabel>

      <div className="glass glass-noise relative overflow-hidden rounded-xl">
        {/* Header */}
        <div className="p-4 border-b border-glass-border-subtle">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <ScanSearch className={cn('h-4 w-4', enabled ? 'text-primary' : 'text-muted-foreground')} />
              <div>
                <h2 className="font-heading text-sm font-semibold">การสแกน HIS อัตโนมัติ</h2>
                {lastScan ? (
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      สแกนล่าสุด:{' '}
                      <span className="text-foreground font-medium">
                        {new Date(lastScan.date).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </span>
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatShortDate(lastScan.startedAt)}
                    </span>
                    {lastScan.status === 'success' ? (
                      <Badge variant="success" className="text-[10px] px-1.5 py-0">สำเร็จ</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">ข้อผิดพลาด</Badge>
                    )}
                  </div>
                ) : enabled ? (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ยังไม่มีผลการสแกน — ระบบจะสแกนอัตโนมัติทุกคืน 01.00 น.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ปิดใช้งานอยู่ — เปิดใช้งานเพื่อสแกนหา visit ใหม่จาก HIS อัตโนมัติทุกคืน 01.00 น.
                  </p>
                )}
              </div>
            </div>

            {/* Admin toggle */}
            {isAdmin && (
              <button
                onClick={handleToggle}
                disabled={toggling}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all shrink-0',
                  'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  enabled
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50',
                  toggling && 'opacity-50 cursor-not-allowed',
                )}
              >
                {enabled ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
                {enabled ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </button>
            )}
          </div>
        </div>

        {/* Stats row — only when there's a last scan */}
        {lastScan && (
          <div className="px-4 py-3 border-b border-glass-border-subtle">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/30 px-3 py-1.5">
                <ScanSearch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">พบจาก HIS</span>
                <span className="text-sm font-bold tabular-nums text-foreground">{lastScan.totalScanned}</span>
                <span className="text-xs text-muted-foreground">ราย</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5">
                <CircleCheckBig className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300">นำเข้าใหม่</span>
                <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{lastScan.newPatients}</span>
                <span className="text-xs text-emerald-700 dark:text-emerald-300">ราย</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-primary/80">visit ใหม่</span>
                <span className="text-sm font-bold tabular-nums text-primary">{lastScan.newVisits}</span>
                <span className="text-xs text-primary/80">ครั้ง</span>
              </div>
              {lastScan.errors > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-3 py-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  <span className="text-xs text-destructive">ข้อผิดพลาด</span>
                  <span className="text-sm font-bold tabular-nums text-destructive">{lastScan.errors}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error banner */}
        {lastScan?.status === 'error' && lastScan.error && (
          <div className="mx-4 mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <span className="font-medium">ข้อผิดพลาด: </span>{lastScan.error}
          </div>
        )}

        {/* Patient list */}
        {lastScan && recentImports.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border-subtle">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                      HN
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ชื่อ-สกุล
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                      Visit ใหม่
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                      ดูข้อมูล
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentImports.map((imp) => (
                    <tr
                      key={imp.id}
                      className="border-b border-glass-border-subtle last:border-0 transition-colors hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04]"
                    >
                      <td className="px-4 py-3">
                        <CodeBadge code={imp.patient?.hn ?? imp.hn} />
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {imp.patient?.fullName ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          <CalendarDays className="h-3 w-3" />
                          {imp.importedVisits} visit
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {imp.patient ? (
                          <Link
                            href={`/cancer-patients/${imp.patient.id}`}
                            className="text-xs font-medium text-primary hover:underline transition-colors"
                          >
                            ดูข้อมูล →
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-glass-border-subtle">
              {recentImports.map((imp) => (
                <div key={imp.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CodeBadge code={imp.patient?.hn ?? imp.hn} />
                      <span className="font-medium text-sm">{imp.patient?.fullName ?? '—'}</span>
                    </div>
                    {imp.patient && (
                      <Link
                        href={`/cancer-patients/${imp.patient.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        ดูข้อมูล →
                      </Link>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <CalendarDays className="h-3 w-3" />
                    {imp.importedVisits} visit ใหม่
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : lastScan && lastScan.newPatients === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            ไม่พบผู้ป่วยหรือ visit ใหม่จากการสแกนล่าสุด
          </div>
        ) : !lastScan ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {enabled
              ? 'ระบบจะเริ่มสแกนอัตโนมัติในคืนถัดไปเวลา 01.00 น.'
              : 'เปิดใช้งานการสแกนอัตโนมัติในปุ่มด้านบน'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Z51 FILTER CONSTANTS
   ═══════════════════════════════════════════ */

const Z51_FILTERS = [
  { key: '', label: 'ทั้งหมด' },
  { key: 'Z510', label: 'Z510' },
  { key: 'Z511', label: 'Z511' },
] as const;

const Z51_BILLING_FILTERS = [
  { key: '', label: 'ทั้งหมด' },
  { key: 'none', label: 'ยังไม่เรียกเก็บ' },
  { key: 'pending', label: 'รอผล' },
  { key: 'rejected', label: 'ถูกปฏิเสธ' },
] as const;

/* ═══════════════════════════════════════════
   DASHBOARD PAGE
   ═══════════════════════════════════════════ */

export default function DashboardPage() {
  const router = useRouter();

  // ─── State hooks first (so derived paths are available before API hooks) ───
  const [drugFilter, setDrugFilter] = useState('all');
  const [extraVisits, setExtraVisits] = useState<Z51ActionableVisit[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);

  // ─── Global period (date range) — filters Z51 stats + actionable table ───
  const [periodFrom, setPeriodFrom, h2] = usePersistedState('dashboard_period_from', '');
  const [periodTo, setPeriodTo, h3] = usePersistedState('dashboard_period_to', '');
  const hasPeriod = periodFrom !== '' || periodTo !== '';

  // ─── Z51 table filters (persisted) ───
  const [z51DiagCode, setZ51DiagCode, h1] = usePersistedState('dashboard_z51_diag', '');
  const [z51BillingStatus, setZ51BillingStatus, h4] = usePersistedState('dashboard_z51_billing', '');
  const filtersHydrated = h1 && h2 && h3 && h4;

  const hasZ51Filters = z51DiagCode !== '' || z51BillingStatus !== '';

  // ─── Derived API paths (computed before hooks) ───
  const z51StatsParams = new URLSearchParams();
  if (periodFrom) z51StatsParams.set('dateFrom', periodFrom);
  if (periodTo) z51StatsParams.set('dateTo', periodTo);
  const z51StatsPath = `/dashboard/z51-billing-stats${z51StatsParams.size ? `?${z51StatsParams}` : ''}`;

  const z51Params = new URLSearchParams({ offset: '0', limit: '20' });
  if (z51DiagCode) z51Params.set('diagnosisCode', z51DiagCode);
  if (periodFrom) z51Params.set('dateFrom', periodFrom);
  if (periodTo) z51Params.set('dateTo', periodTo);
  if (z51BillingStatus) z51Params.set('billingStatus', z51BillingStatus);

  // ─── API hooks ───
  const { data: overview, isLoading: loadingOverview } =
    useApi<DashboardOverview>('/dashboard/overview');
  const { data: z51Stats } =
    useApi<Z51BillingStats>(z51StatsPath, { enabled: filtersHydrated });
  const { data: visitsBySite } =
    useApi<VisitBySite[]>('/dashboard/visits-by-site');
  const { data: topDrugs, isLoading: loadingTopDrugs } = useApi<TopDrug[]>(
    `/dashboard/top-drugs?category=${encodeURIComponent(drugFilter)}`,
  );
  const { data: confirmationRate } =
    useApi<ConfirmationRate>('/dashboard/confirmation-rate');
  const { data: emptyRegimens } =
    useApi<EmptyRegimen[]>('/dashboard/empty-regimens');
  const { data: aiStats } =
    useApi<AiStats>('/dashboard/ai-stats');
  const { data: patientsWithoutCases } =
    useApi<PatientWithoutCase[]>('/dashboard/patients-without-cases');
  const { data: z51Response, isLoading: loadingZ51 } =
    useApi<Z51ActionableResponse>(`/dashboard/z51-actionable-visits?${z51Params}`, {
      enabled: filtersHydrated,
    });

  // Reset pagination when filters change (only after hydration)
  useEffect(() => {
    if (!filtersHydrated) return;
    setExtraVisits([]);
    setLoadedAll(false);
  }, [z51DiagCode, periodFrom, periodTo, z51BillingStatus, filtersHydrated]);

  const allVisits = [...(z51Response?.data ?? []), ...extraVisits];
  const filteredTotal = z51Response?.total ?? 0;

  // Stat card: derive from cached z51Stats (unaffected by table filters)
  // Actionable = total - approved (includes: none, pending, rejected)
  const statCardActionable =
    (z51Stats?.totalZ51Visits ?? 0) - (z51Stats?.approvedZ51Visits ?? 0);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextOffset = allVisits.length;
      const loadMoreParams = new URLSearchParams({
        offset: String(nextOffset),
        limit: '20',
      });
      if (z51DiagCode) loadMoreParams.set('diagnosisCode', z51DiagCode);
      if (periodFrom) loadMoreParams.set('dateFrom', periodFrom);
      if (periodTo) loadMoreParams.set('dateTo', periodTo);
      if (z51BillingStatus) loadMoreParams.set('billingStatus', z51BillingStatus);

      const res = await apiClient.get<Z51ActionableResponse>(
        `/dashboard/z51-actionable-visits?${loadMoreParams}`,
      );
      if (res.data.length === 0 || nextOffset + res.data.length >= res.total) {
        setLoadedAll(true);
      }
      setExtraVisits((prev) => [...prev, ...res.data]);
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [allVisits.length, loadingMore, z51DiagCode, periodFrom, periodTo, z51BillingStatus]);

  if (loadingOverview) {
    return <DashboardSkeleton />;
  }

  const stats = overview;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            แดชบอร์ด
            <HelpButton section="dashboard" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ภาพรวมข้อมูลโปรโตคอลรักษามะเร็ง — Protocol Data Overview
          </p>
        </div>

        {/* Global period picker — filters Z51 stats cards + actionable visits */}
        <div className="flex items-center gap-2 rounded-xl bg-card border border-glass-border-subtle px-3 py-2 shadow-sm shrink-0">
          <CalendarDays className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">ช่วงวันที่:</span>
          <ThaiDatePicker
            value={periodFrom}
            onChange={setPeriodFrom}
            placeholder="จากวันที่"
            className="h-7 w-37 text-xs border-border/50"
          />
          <span className="text-muted-foreground text-xs">—</span>
          <ThaiDatePicker
            value={periodTo}
            onChange={setPeriodTo}
            placeholder="ถึงวันที่"
            className="h-7 w-37 text-xs border-border/50"
          />
          {hasPeriod && (
            <button
              onClick={() => { setPeriodFrom(''); setPeriodTo(''); }}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
              title="ล้างช่วงวันที่"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Period context note */}
      {hasPeriod && (
        <p className="text-xs text-muted-foreground -mt-4">
          <span className="text-primary font-medium">กรองอยู่:</span> Z51x Billing Stats และตาราง Visit ที่ต้องดำเนินการ ถูกกรองตามช่วงวันที่ที่เลือก
        </p>
      )}

      {/* ─── Nightly HIS Auto-Scan ─── */}
      <NightlyScanWidget />

      {/* ─── Z51x Billing Stats ─── */}
      <div className="space-y-3">
        <SectionLabel dot="bg-teal-500">Z51x Billing</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Visit Z51x ทั้งหมด"
            value={z51Stats?.totalZ51Visits ?? 0}
            icon={<Syringe className="h-5 w-5" />}
            theme="teal"
            suffix="visits"
          />
          <StatCard
            label="Z51x เรียกเก็บสำเร็จ"
            value={z51Stats?.approvedZ51Visits ?? 0}
            icon={<CircleCheckBig className="h-5 w-5" />}
            theme="emerald"
            suffix="visits"
          />
          <StatCard
            label="Z51x รอดำเนินการ"
            value={statCardActionable}
            icon={<Clock className="h-5 w-5" />}
            theme="amber"
            suffix="visits"
          />
        </div>
      </div>

      {/* ─── Overview Stats ─── */}
      <div className="space-y-3">
        <SectionLabel dot="bg-orange-500">ภาพรวมข้อมูล</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Visit ทั้งหมด"
            value={stats?.totalVisits ?? 0}
            icon={<ClipboardList className="h-5 w-5" />}
            theme="teal"
          />
          <StatCard
            label="มะเร็งอันดับ 1 (โดย Visit)"
            value={stats?.topCancerSite?.visitCount ?? 0}
            icon={<TrendingUp className="h-5 w-5" />}
            theme="orange"
            subtitle={
              stats?.topCancerSite
                ? stats.topCancerSite.nameThai
                : 'ยังไม่มีข้อมูล Visit'
            }
            subtitleHighlight={
              stats?.topCancerSite
                ? `${stats.topCancerSite.percentage}%`
                : undefined
            }
          />
          <StatCard
            label="สูตรยาที่ไม่มียา"
            value={stats?.emptyRegimensCount ?? 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            theme={stats?.emptyRegimensCount ? 'rose' : 'emerald'}
          />
        </div>
      </div>

      {/* ─── AI Analytics ─── */}
      <div className="space-y-3">
        <SectionLabel dot="bg-violet-500">AI Analytics</SectionLabel>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="AI Suggestion ทั้งหมด"
            value={aiStats?.totalCalls ?? 0}
            icon={<Sparkles className="h-5 w-5" />}
            theme="violet"
            suffix="ครั้ง"
          />
          <StatCard
            label="Token ที่ใช้ทั้งหมด"
            value={aiStats?.totalTokens ?? 0}
            icon={<Coins className="h-5 w-5" />}
            theme="violet"
            suffix="tokens"
          />
          <StatCard
            label="ผู้ใช้ AI สูงสุด"
            value={aiStats?.topUser?.callCount ?? 0}
            icon={<Crown className="h-5 w-5" />}
            theme="violet"
            subtitle={aiStats?.topUser?.fullName ?? 'ยังไม่มีการใช้งาน'}
            suffix="ครั้ง"
          />
        </div>
      </div>

      {/* ─── Charts ─── */}
      <div className="space-y-3">
        <SectionLabel>แผนภูมิ</SectionLabel>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <VisitsBySiteChart
            data={(visitsBySite ?? []).map((d) => ({
              name: d.nameThai || d.nameEnglish,
              value: d.visitCount,
            }))}
          />
          <TopDrugsChart
            data={(topDrugs ?? []).map((d) => ({
              name: d.genericName,
              value: d.visitCount,
            }))}
            activeFilter={drugFilter}
            onFilterChange={setDrugFilter}
            isLoading={loadingTopDrugs}
          />
          <BillingApprovalRateChart
            data={{
              approved: z51Stats?.approvedZ51Visits ?? 0,
              pending: z51Stats?.pendingZ51Visits ?? 0,
              rejected: z51Stats?.rejectedZ51Visits ?? 0,
              rate:
                z51Stats && z51Stats.billedZ51Visits > 0
                  ? Math.round(
                      (z51Stats.approvedZ51Visits / z51Stats.billedZ51Visits) * 1000,
                    ) / 10
                  : 0,
            }}
          />
          <ConfirmationRateChart
            data={{
              confirmed: confirmationRate?.confirmedVisits ?? 0,
              unconfirmed: confirmationRate?.unconfirmedVisits ?? 0,
              rate: confirmationRate?.confirmationRate ?? 0,
            }}
          />
        </div>
      </div>

      {/* ─── Empty Regimens Table ─── */}
      {emptyRegimens && emptyRegimens.length > 0 && (
        <div className="space-y-3">
          <SectionLabel dot="bg-amber-500">สูตรยาที่ต้องตรวจสอบ</SectionLabel>
          <div className="glass glass-noise relative overflow-hidden rounded-xl">
            <div className="p-4 border-b border-glass-border-subtle">
              <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                สูตรยาที่ไม่มียา ({emptyRegimens.length} รายการ)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Regimens with no drugs assigned — consider adding drugs or deactivating
              </p>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border-subtle">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      รหัส
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ชื่อสูตรยา
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ประเภท
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      โปรโตคอลที่ใช้
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider" />
                  </tr>
                </thead>
                <tbody>
                  {emptyRegimens.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-glass-border-subtle last:border-0 transition-colors hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04]"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary">
                        {r.regimenCode}
                      </td>
                      <td className="px-4 py-3 font-medium">{r.regimenName}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-[11px]">
                          {r.regimenType || 'N/A'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{r.protocolCount}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/regimens/${r.id}/edit`}
                          className="text-xs font-medium text-primary hover:underline transition-colors"
                        >
                          เพิ่มยา →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-glass-border-subtle">
              {emptyRegimens.map((r) => (
                <div key={r.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-primary">{r.regimenCode}</span>
                    <Link
                      href={`/regimens/${r.id}/edit`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      เพิ่มยา →
                    </Link>
                  </div>
                  <p className="text-sm font-medium">{r.regimenName}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Patients Without Cases ─── */}
      {patientsWithoutCases && patientsWithoutCases.length > 0 && (
        <div className="space-y-3">
          <SectionLabel dot="bg-orange-500">ผู้ป่วยที่ต้องสร้างเคส</SectionLabel>
          <div className="glass glass-noise relative overflow-hidden rounded-xl">
            <div className="p-4 border-b border-glass-border-subtle">
              <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-warning" />
                ผู้ป่วยที่ยังไม่มี Case Number ({patientsWithoutCases.length} ราย)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                ผู้ป่วยที่มี visit แต่ยังไม่ได้สร้าง Case — คลิกชื่อเพื่อดำเนินการ
              </p>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border-subtle">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                      HN
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      ชื่อ-สกุล
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
                      วันที่เริ่มรักษา
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
                      VN
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {patientsWithoutCases.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-glass-border-subtle last:border-0 transition-colors hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04] cursor-pointer"
                      onClick={() => router.push(`/cancer-patients/${p.id}`)}
                    >
                      <td className="px-4 py-3">
                        <CodeBadge code={p.hn} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-primary hover:underline">
                          {p.fullName}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {p.firstTreatmentDate ? formatShortDate(p.firstTreatmentDate) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.visitVn ? <CodeBadge code={p.visitVn} /> : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-glass-border-subtle">
              {patientsWithoutCases.map((p) => (
                <div
                  key={p.id}
                  className="p-4 space-y-1 cursor-pointer transition-colors active:bg-primary/[0.04]"
                  onClick={() => router.push(`/cancer-patients/${p.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CodeBadge code={p.hn} />
                      <span className="font-medium text-sm text-primary">{p.fullName}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {p.firstTreatmentDate && <span>{formatShortDate(p.firstTreatmentDate)}</span>}
                    {p.visitVn && <CodeBadge code={p.visitVn} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Z51x Actionable Visits ─── */}
      {(filteredTotal > 0 || hasZ51Filters || statCardActionable > 0) && (
        <div className="space-y-3">
          <SectionLabel dot="bg-rose-500">Visit ที่ต้องดำเนินการ</SectionLabel>
          <div className="glass glass-noise relative overflow-hidden rounded-xl">
            <div className="p-4 border-b border-glass-border-subtle">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading text-sm font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    Visit Z51x ที่ต้องดำเนินการ
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Visits ที่มีรหัส Z51x แต่ยังไม่มีการเรียกเก็บ หรือถูกปฏิเสธ —{' '}
                    <span className="font-semibold text-foreground tabular-nums">
                      {filteredTotal}
                    </span>{' '}
                    รายการ
                    {hasZ51Filters && (
                      <span className="text-muted-foreground"> (กรองอยู่)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter bar */}
            <div className="px-4 py-3 border-b border-glass-border-subtle">
              <div className="flex flex-wrap items-center gap-3">
                {/* Z51 sub-code toggle */}
                <div className="flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                  {Z51_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setZ51DiagCode(f.key)}
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        z51DiagCode === f.key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Separator */}
                <div className="h-5 w-px bg-border/60 hidden sm:block" />

                {/* Billing status toggle */}
                <div className="flex items-center gap-1">
                  <Receipt className="h-3.5 w-3.5 text-muted-foreground mr-1" />
                  {Z51_BILLING_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setZ51BillingStatus(f.key)}
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        z51BillingStatus === f.key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {/* Clear table filters button */}
                {hasZ51Filters && (
                  <button
                    onClick={() => {
                      setZ51DiagCode('');
                      setZ51BillingStatus('');
                    }}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all"
                  >
                    <X className="h-3 w-3" />
                    ล้าง
                  </button>
                )}
              </div>
            </div>

            {/* Content: loading / empty / table */}
            {loadingZ51 && allVisits.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/20 border-t-primary mr-2 align-middle" />
                กำลังโหลดข้อมูล...
              </div>
            ) : allVisits.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                ไม่พบ visit ที่ตรงกับเงื่อนไข
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-glass-border-subtle">
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                          HN
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          ชื่อ-สกุล
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          เคส/โปรโตคอล
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">
                          VN
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                          วันที่
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                          เวลาที่ผ่านไป
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-36">
                          สถานะ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {allVisits.map((v) => {
                        const elapsed = getTimeElapsed(v.visitDate);
                        return (
                          <tr
                            key={v.vn}
                            className="border-b border-glass-border-subtle last:border-0 transition-colors hover:bg-primary/[0.02] dark:hover:bg-primary/[0.04] cursor-pointer"
                            onClick={() => {
                              if (v.patientId) {
                                router.push(`/cancer-patients/${v.patientId}`);
                              }
                            }}
                          >
                            <td className="px-4 py-3">
                              <CodeBadge code={v.hn} />
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-foreground">
                                {v.fullName || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {v.caseNumber ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="success" className="text-[11px]">
                                    {v.caseNumber}
                                  </Badge>
                                  {v.protocolNameThai && (
                                    <span className="text-xs text-muted-foreground truncate max-w-40">
                                      {v.protocolNameThai}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <CodeBadge code={v.vn} />
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatShortDate(v.visitDate)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span
                                  className={cn(
                                    'text-xs font-medium tabular-nums',
                                    URGENCY_STYLES[elapsed.urgency],
                                  )}
                                >
                                  {elapsed.label}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {elapsed.daysRemaining > 0
                                    ? `เหลือ ${elapsed.daysRemaining} วัน`
                                    : `เกิน ${Math.abs(elapsed.daysRemaining)} วัน`}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {v.billingStatus === 'REJECTED' ? (
                                <Badge variant="destructive" className="text-[11px]">
                                  ถูกปฏิเสธ
                                </Badge>
                              ) : v.billingStatus === 'PENDING' ? (
                                <Badge variant="secondary" className="text-[11px]">
                                  รอผล
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="text-[11px]">
                                  ยังไม่เรียกเก็บ
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-glass-border-subtle">
                  {allVisits.map((v) => {
                    const elapsed = getTimeElapsed(v.visitDate);
                    return (
                      <div
                        key={v.vn}
                        className="p-4 space-y-2 cursor-pointer transition-colors active:bg-primary/[0.04]"
                        onClick={() => {
                          if (v.patientId) {
                            router.push(`/cancer-patients/${v.patientId}`);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CodeBadge code={v.hn} />
                            <span className="font-medium text-sm">
                              {v.fullName || '—'}
                            </span>
                          </div>
                          {v.billingStatus === 'REJECTED' ? (
                            <Badge variant="destructive" className="text-[11px]">
                              ถูกปฏิเสธ
                            </Badge>
                          ) : v.billingStatus === 'PENDING' ? (
                            <Badge variant="secondary" className="text-[11px]">
                              รอผล
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[11px]">
                              ยังไม่เรียกเก็บ
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CodeBadge code={v.vn} />
                          <span>{formatShortDate(v.visitDate)}</span>
                          <span
                            className={cn(
                              'text-[11px] font-medium',
                              URGENCY_STYLES[elapsed.urgency],
                            )}
                          >
                            ({elapsed.label})
                          </span>
                        </div>
                        {v.caseNumber && (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="success" className="text-[11px]">
                              {v.caseNumber}
                            </Badge>
                            {v.protocolNameThai && (
                              <span className="text-xs text-muted-foreground truncate">
                                {v.protocolNameThai}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Load more */}
            {!loadedAll && allVisits.length > 0 && allVisits.length < filteredTotal && (
              <div className="p-4 border-t border-glass-border-subtle flex items-center justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-full px-5"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                      กำลังโหลด...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <ChevronDown className="h-3.5 w-3.5" />
                      โหลดเพิ่ม ({filteredTotal - allVisits.length} รายการ)
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
