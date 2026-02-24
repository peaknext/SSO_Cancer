'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
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

export default function DashboardPage() {
  const router = useRouter();
  const { data: overview, isLoading: loadingOverview } =
    useApi<DashboardOverview>('/dashboard/overview');
  const { data: z51Stats } =
    useApi<Z51BillingStats>('/dashboard/z51-billing-stats');
  const { data: visitsBySite } =
    useApi<VisitBySite[]>('/dashboard/visits-by-site');
  const { data: topDrugs } = useApi<TopDrug[]>('/dashboard/top-drugs');
  const { data: confirmationRate } =
    useApi<ConfirmationRate>('/dashboard/confirmation-rate');
  const { data: emptyRegimens } =
    useApi<EmptyRegimen[]>('/dashboard/empty-regimens');
  const { data: aiStats } =
    useApi<AiStats>('/dashboard/ai-stats');
  const { data: initialActionable } =
    useApi<Z51ActionableResponse>('/dashboard/z51-actionable-visits?offset=0&limit=20');

  // Actionable visits — local state for load-more
  const [extraVisits, setExtraVisits] = useState<Z51ActionableVisit[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);

  const allVisits = [...(initialActionable?.data ?? []), ...extraVisits];
  const totalActionable = initialActionable?.total ?? 0;

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const nextOffset = allVisits.length;
      const res = await apiClient.get<Z51ActionableResponse>(
        `/dashboard/z51-actionable-visits?offset=${nextOffset}&limit=20`,
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
  }, [allVisits.length, loadingMore]);

  if (loadingOverview) {
    return <DashboardSkeleton />;
  }

  const stats = overview;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            แดชบอร์ด
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ภาพรวมข้อมูลโปรโตคอลรักษามะเร็ง — Protocol Data Overview
          </p>
        </div>
        {stats?.visitDateRange && (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground shrink-0">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            <span>
              ข้อมูลทั้งหมด จากวันที่{' '}
              <span className="font-medium text-foreground">
                {formatThaiDate(stats.visitDateRange.minDate)}
              </span>
              {' '}ถึง{' '}
              <span className="font-medium text-foreground">
                {formatThaiDate(stats.visitDateRange.maxDate)}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Stat cards — Row 1: Z51x billing stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Visit Z51x ทั้งหมด"
          value={z51Stats?.totalZ51Visits ?? 0}
          icon={<Syringe className="h-5 w-5" />}
          accentColor="bg-[#0D9488]"
          suffix="visits"
        />
        <StatCard
          label="Z51x เรียกเก็บสำเร็จ"
          value={z51Stats?.approvedZ51Visits ?? 0}
          icon={<CircleCheckBig className="h-5 w-5" />}
          accentColor="bg-emerald-600"
          suffix="visits"
        />
        <StatCard
          label="Z51x รอดำเนินการ"
          value={initialActionable?.total ?? 0}
          icon={<Clock className="h-5 w-5" />}
          accentColor="bg-amber-500"
          suffix="visits"
        />
      </div>

      {/* Stat cards — Row 2: existing overview stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Visit ทั้งหมด"
          value={stats?.totalVisits ?? 0}
          icon={<ClipboardList className="h-5 w-5" />}
          accentColor="bg-[#0D9488]"
        />
        <StatCard
          label="มะเร็งอันดับ 1 (โดย Visit)"
          value={stats?.topCancerSite?.visitCount ?? 0}
          icon={<TrendingUp className="h-5 w-5" />}
          accentColor="bg-accent"
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
          accentColor={
            stats?.emptyRegimensCount ? 'bg-warning' : 'bg-success'
          }
        />
      </div>

      {/* AI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="AI Suggestion ทั้งหมด"
          value={aiStats?.totalCalls ?? 0}
          icon={<Sparkles className="h-5 w-5" />}
          accentColor="bg-accent"
          suffix="ครั้ง"
        />
        <StatCard
          label="Token ที่ใช้ทั้งหมด"
          value={aiStats?.totalTokens ?? 0}
          icon={<Coins className="h-5 w-5" />}
          accentColor="bg-accent"
          suffix="tokens"
        />
        <StatCard
          label="ผู้ใช้ AI สูงสุด"
          value={aiStats?.topUser?.callCount ?? 0}
          icon={<Crown className="h-5 w-5" />}
          accentColor="bg-accent"
          subtitle={aiStats?.topUser?.fullName ?? 'ยังไม่มีการใช้งาน'}
          suffix="ครั้ง"
        />
      </div>

      {/* Charts — 2x2 grid */}
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

      {/* Empty Regimens Table */}
      {emptyRegimens && emptyRegimens.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-heading text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              สูตรยาที่ไม่มียา ({emptyRegimens.length} รายการ)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Regimens with no drugs assigned — consider adding drugs or
              deactivating
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/5">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    รหัส
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    ชื่อสูตรยา
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    ประเภท
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    โปรโตคอลที่ใช้
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {emptyRegimens.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">
                      {r.regimenCode}
                    </td>
                    <td className="px-4 py-3">{r.regimenName}</td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary">
                        {r.regimenType || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {r.protocolCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/regimens/${r.id}/edit`}
                        className="text-xs font-medium text-primary hover:underline"
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
          <div className="md:hidden divide-y">
            {emptyRegimens.map((r) => (
              <div key={r.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{r.regimenCode}</span>
                  <Link
                    href={`/regimens/${r.id}/edit`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    เพิ่มยา →
                  </Link>
                </div>
                <p className="text-sm">{r.regimenName}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Z51x Actionable Visits — work queue */}
      {totalActionable > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-base font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Visit Z51x ที่ต้องดำเนินการ
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visits ที่มีรหัส Z51x แต่ยังไม่มีการเรียกเก็บ หรือถูกปฏิเสธ —{' '}
                  <span className="font-semibold text-foreground tabular-nums">{totalActionable}</span> รายการ
                </p>
              </div>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/5">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">
                    HN
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    ชื่อ-สกุล
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    เคส/โปรโตคอล
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">
                    VN
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-20">
                    วันที่
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground w-36">
                    สถานะการเรียกเก็บ
                  </th>
                </tr>
              </thead>
              <tbody>
                {allVisits.map((v) => (
                  <tr
                    key={v.vn}
                    className="border-b last:border-0 transition-colors hover:bg-muted/5 cursor-pointer"
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
                      {v.billingStatus === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-inset ring-rose-300/40 dark:ring-rose-500/30">
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-inset ring-red-200/60 dark:ring-red-500/30">
                          ยังไม่เรียกเก็บ
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y">
            {allVisits.map((v) => (
              <div
                key={v.vn}
                className="p-4 space-y-2 cursor-pointer active:bg-muted/5"
                onClick={() => {
                  if (v.patientId) {
                    router.push(`/cancer-patients/${v.patientId}`);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CodeBadge code={v.hn} />
                    <span className="font-medium text-sm">{v.fullName || '—'}</span>
                  </div>
                  {v.billingStatus === 'REJECTED' ? (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-inset ring-rose-300/40 dark:ring-rose-500/30">
                      Rejected
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 ring-1 ring-inset ring-red-200/60 dark:ring-red-500/30">
                      ยังไม่เรียกเก็บ
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CodeBadge code={v.vn} />
                  <span>{formatShortDate(v.visitDate)}</span>
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
            ))}
          </div>

          {/* Load more */}
          {!loadedAll && allVisits.length < totalActionable && (
            <div className="p-4 border-t flex items-center justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-1.5">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                    กำลังโหลด...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <ChevronDown className="h-3.5 w-3.5" />
                    โหลดเพิ่ม ({totalActionable - allVisits.length} รายการ)
                  </span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
