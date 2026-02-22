'use client';

import Link from 'next/link';
import {
  FileText,
  Microscope,
  FlaskConical,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  CalendarDays,
  Sparkles,
  Coins,
  Crown,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { StatCard } from '@/components/dashboard/stat-card';
import {
  VisitsBySiteChart,
  TopDrugsChart,
  PriceCoverageChart,
  ConfirmationRateChart,
} from '@/components/dashboard/charts';
import { DashboardSkeleton } from '@/components/shared/loading-skeleton';
import { useAuthStore } from '@/stores/auth-store';
import { Badge } from '@/components/ui/badge';

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

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
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

interface PriceCoverageItem {
  name?: string;
  drugCategory?: string;
  withPrice: number;
  withoutPrice: number;
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

interface RecentActivity {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  user?: { fullName: string } | null;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: overview, isLoading: loadingOverview } =
    useApi<DashboardOverview>('/dashboard/overview');
  const { data: visitsBySite } =
    useApi<VisitBySite[]>('/dashboard/visits-by-site');
  const { data: topDrugs } = useApi<TopDrug[]>('/dashboard/top-drugs');
  const { data: confirmationRate } =
    useApi<ConfirmationRate>('/dashboard/confirmation-rate');
  const { data: emptyRegimens } =
    useApi<EmptyRegimen[]>('/dashboard/empty-regimens');
  const { data: priceCoverage } =
    useApi<PriceCoverageItem[]>('/dashboard/price-coverage');
  const { data: aiStats } =
    useApi<AiStats>('/dashboard/ai-stats');
  const { data: recentActivity } = useApi<RecentActivity[]>(
    '/dashboard/recent-activity',
    {
      enabled: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN',
    },
  );

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

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="ตำแหน่งมะเร็ง"
          value={stats?.cancerSites ?? 0}
          icon={<Microscope className="h-5 w-5" />}
          accentColor="bg-primary"
        />
        <StatCard
          label="โปรโตคอลทั้งหมด"
          value={stats?.protocols ?? 0}
          icon={<FileText className="h-5 w-5" />}
          accentColor="bg-primary"
        />
        <StatCard
          label="สูตรยา (Regimens)"
          value={stats?.regimens ?? 0}
          icon={<FlaskConical className="h-5 w-5" />}
          accentColor="bg-[#0D9488]"
        />
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
        {priceCoverage && (
          <PriceCoverageChart
            data={priceCoverage.map((d) => ({
              name:
                (d as any).category || d.drugCategory || d.name || '',
              withPrice: d.withPrice,
              withoutPrice: d.withoutPrice,
            }))}
          />
        )}
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

      {/* Recent activity (admin only) */}
      {recentActivity && recentActivity.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="p-4 border-b">
            <h2 className="font-heading text-base font-semibold">
              กิจกรรมล่าสุด
            </h2>
          </div>
          <div className="divide-y">
            {recentActivity.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 flex items-center gap-3 text-sm"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle text-primary text-xs font-medium shrink-0">
                  {item.user?.fullName?.charAt(0) || '?'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">
                    {item.user?.fullName || 'System'}
                  </span>
                  <span className="text-muted-foreground">
                    {' '}
                    {item.action.toLowerCase()} {item.entityType}
                    {item.entityId ? ` #${item.entityId}` : ''}
                  </span>
                </div>
                <time className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(item.createdAt).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
