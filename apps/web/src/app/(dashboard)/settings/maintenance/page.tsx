'use client';

import { useState, useCallback } from 'react';
import {
  Wrench,
  Server,
  Database,
  HardDrive,
  Users,
  Trash2,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Cpu,
  MemoryStick,
  RefreshCw,
  Zap,
  Clock,
  CalendarDays,
  Ban,
  Search,
  Filter,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ThaiDatePicker } from '@/components/shared/thai-date-picker';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────

interface SystemInfo {
  app: {
    version: string;
    nodeVersion: string;
    platform: string;
    arch: string;
    pid: number;
    uptimeSeconds: number;
    startedAt: string;
  };
  db: {
    connected: boolean;
    version: string;
    name: string;
    sizeBytes: number;
    sizeFormatted: string;
  };
  env: {
    nodeEnv: string;
    apiPort: string;
    encryptionConfigured: boolean;
    backupEncryptionConfigured: boolean;
  };
  dependencies: Record<string, string>;
}

interface TableSize {
  table: string;
  rowCount: number;
  diskSize: number;
  diskSizeFormatted: string;
  indexSize: number;
  indexSizeFormatted: string;
}

interface Resources {
  process: {
    rss: number;
    rssFormatted: string;
    heapTotal: number;
    heapTotalFormatted: string;
    heapUsed: number;
    heapUsedFormatted: string;
    external: number;
    externalFormatted: string;
  };
  os: {
    totalMemory: number;
    totalMemoryFormatted: string;
    freeMemory: number;
    freeMemoryFormatted: string;
    usedMemoryPercent: number;
    cpuCount: number;
    uptimeSeconds: number;
    platform: string;
    hostname: string;
  };
}

interface ActiveQuery {
  pid: number;
  durationSeconds: number;
  query: string;
  state: string;
  waitEventType: string | null;
}

interface SessionInfo {
  id: number;
  userId: number;
  userEmail: string;
  userFullName: string;
  userRole: string;
  ipAddress: string | null;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isExpired: boolean;
}

interface CacheStatus {
  dashboard: {
    keys: { key: string; expiresAt: number }[];
    size: number;
  };
  settingsCacheTtl: string;
}

interface DataStats {
  visits: { total: number; oldestDate: string | null; newestDate: string | null; withoutCaseCount: number };
  auditLogs: { total: number; oldestDate: string | null; newestDate: string | null };
  aiSuggestions: { total: number; oldestDate: string | null; newestDate: string | null };
  billingExportBatches: {
    total: number;
    totalFileSizeBytes: number;
    totalFileSizeFormatted: string;
    oldestDate: string | null;
    newestDate: string | null;
  };
  nightlyScanLogs: { total: number; oldestDate: string | null; newestDate: string | null };
  patientImports: { total: number; oldestDate: string | null; newestDate: string | null };
}

interface IntegrityCheck {
  name: string;
  nameThai: string;
  status: 'ok' | 'warning' | 'error';
  count: number;
  message: string;
}

interface IntegrityResult {
  checks: IntegrityCheck[];
  checkedAt: string;
  totalIssues: number;
  summary: string;
}

interface BulkDeletePreview {
  matchCount: number;
  samples: { vn: string; hn: string; visitDate: string; primaryDiagnosis: string }[];
}

interface BulkDeleteResult {
  deletedCount: number;
  deletedMedications: number;
  deletedAiSuggestions: number;
  deletedBillingClaims: number;
  deletedBillingItems: number;
}

// ─── Helpers ────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d} วัน ${h} ชม. ${m} น.`;
  if (h > 0) return `${h} ชม. ${m} น.`;
  return `${m} นาที`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} ชม.ที่แล้ว`;
  return `${Math.floor(hrs / 24)} วันที่แล้ว`;
}

// ─── Section Component ──────────────────────────────────────

function Section({
  id,
  icon: Icon,
  title,
  titleEn,
  badge,
  defaultOpen = false,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  titleEn: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden border-border/60">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-primary/[0.02] transition-colors"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-[18px] w-[18px] text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading text-sm font-semibold text-foreground">{title}</h3>
          <p className="text-[11px] text-muted-foreground">{titleEn}</p>
        </div>
        {badge}
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <CardContent className="border-t border-border/40 px-5 py-4">{children}</CardContent>}
    </Card>
  );
}

// ─── Info Row ───────────────────────────────────────────────

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('text-foreground font-medium', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

// ─── Status Dot ─────────────────────────────────────────────

function StatusDot({ status }: { status: 'ok' | 'warning' | 'error' }) {
  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        status === 'ok' && 'bg-emerald-500',
        status === 'warning' && 'bg-amber-500',
        status === 'error' && 'bg-rose-500',
      )}
    />
  );
}

// ─── Memory Bar ─────────────────────────────────────────────

function MemoryBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            pct < 70 ? 'bg-primary' : pct < 90 ? 'bg-amber-500' : 'bg-rose-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Purge Card ─────────────────────────────────────────────

function PurgeCard({
  title,
  total,
  oldestDate,
  newestDate,
  extra,
  minDays,
  defaultDays,
  onPurge,
}: {
  title: string;
  total: number;
  oldestDate: string | null;
  newestDate: string | null;
  extra?: React.ReactNode;
  minDays: number;
  defaultDays: number;
  onPurge: (days: number) => Promise<void>;
}) {
  const [days, setDays] = useState(defaultDays);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePurge = async () => {
    setLoading(true);
    try {
      await onPurge(days);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="rounded-lg border border-border/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <Badge variant="secondary" className="font-mono text-xs">
          {total.toLocaleString()} รายการ
        </Badge>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>เก่าสุด: {formatDate(oldestDate)}</span>
        <span>ใหม่สุด: {formatDate(newestDate)}</span>
      </div>
      {extra}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">เก็บไว้</span>
        <Input
          type="number"
          min={minDays}
          max={3650}
          value={days}
          onChange={(e) => setDays(Math.max(minDays, parseInt(e.target.value) || minDays))}
          className="w-20 h-8 text-xs font-mono"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">วัน</span>
        <Button
          variant="destructive"
          size="sm"
          className="ml-auto h-8 text-xs"
          disabled={loading || total === 0}
          onClick={() => setConfirmOpen(true)}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
          ลบข้อมูลเก่า
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        title="ยืนยันการลบข้อมูล"
        description={`ลบ ${title} ที่เก่ากว่า ${days} วัน — การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
        confirmText="ยืนยันลบ"
        variant="destructive"
        onConfirm={handlePurge}
      />
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────

export default function MaintenancePage() {
  // ─── Data fetching ──────────────────────────────────────

  const { data: systemInfo, isLoading: sysLoading, refetch: refetchSys } = useApi<SystemInfo>('/maintenance/system-info');
  const { data: resources, isLoading: resLoading, refetch: refetchRes } = useApi<Resources>('/maintenance/resources');
  const [tableSizes, setTableSizes] = useState<TableSize[] | null>(null);
  const [tableSizesLoading, setTableSizesLoading] = useState(false);
  const [activeQueries, setActiveQueries] = useState<ActiveQuery[] | null>(null);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [dataStatsLoading, setDataStatsLoading] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<IntegrityResult | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  // Bulk delete visits
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const [bulkDateFrom, setBulkDateFrom] = useState('');
  const [bulkDateTo, setBulkDateTo] = useState('');
  const [bulkNonCancerOnly, setBulkNonCancerOnly] = useState(false);
  const [bulkNoMedsOrBilling, setBulkNoMedsOrBilling] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<BulkDeletePreview | null>(null);
  const [bulkPreviewLoading, setBulkPreviewLoading] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Confirm dialogs
  const [confirmPurgeExpired, setConfirmPurgeExpired] = useState(false);
  const [confirmRevokeAll, setConfirmRevokeAll] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ─── Loaders ────────────────────────────────────────────

  const loadTableSizes = useCallback(async () => {
    setTableSizesLoading(true);
    try {
      const data = await apiClient.get<TableSize[]>('/maintenance/db-table-sizes');
      setTableSizes(data);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลตารางได้');
    } finally {
      setTableSizesLoading(false);
    }
  }, []);

  const loadActiveQueries = useCallback(async () => {
    setQueriesLoading(true);
    try {
      const data = await apiClient.get<ActiveQuery[]>('/maintenance/db-active-queries');
      setActiveQueries(data);
    } catch {
      toast.error('ไม่สามารถโหลด active queries ได้');
    } finally {
      setQueriesLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await apiClient.get<SessionInfo[]>('/maintenance/sessions');
      setSessions(data);
    } catch {
      toast.error('ไม่สามารถโหลดข้อมูลเซสชันได้');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const loadCacheStatus = useCallback(async () => {
    try {
      const data = await apiClient.get<CacheStatus>('/maintenance/cache-status');
      setCacheStatus(data);
    } catch {
      toast.error('ไม่สามารถโหลดสถานะแคชได้');
    }
  }, []);

  const loadDataStats = useCallback(async () => {
    setDataStatsLoading(true);
    try {
      const data = await apiClient.get<DataStats>('/maintenance/data-stats');
      setDataStats(data);
    } catch {
      toast.error('ไม่สามารถโหลดสถิติข้อมูลได้');
    } finally {
      setDataStatsLoading(false);
    }
  }, []);

  // ─── Actions ────────────────────────────────────────────

  const runVacuum = async (table?: string) => {
    setActionLoading(`vacuum-${table || 'all'}`);
    try {
      const result = await apiClient.post<{ message: string }>('/maintenance/db-vacuum', { table });
      toast.success(result.message);
    } catch {
      toast.error('VACUUM ANALYZE ล้มเหลว');
    } finally {
      setActionLoading(null);
    }
  };

  const cancelQuery = async (pid: number) => {
    try {
      const result = await apiClient.post<{ message: string; success: boolean }>('/maintenance/db-cancel-query', {
        pid,
      });
      if (result.success) {
        toast.success(result.message);
        loadActiveQueries();
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('ไม่สามารถยกเลิก query ได้');
    }
  };

  const purgeExpiredSessions = async () => {
    setActionLoading('purge-sessions');
    try {
      const result = await apiClient.post<{ message: string }>('/maintenance/sessions/purge-expired', {});
      toast.success(result.message);
      loadSessions();
    } catch {
      toast.error('ไม่สามารถลบเซสชันหมดอายุได้');
    } finally {
      setActionLoading(null);
      setConfirmPurgeExpired(false);
    }
  };

  const revokeAllSessions = async () => {
    setActionLoading('revoke-all');
    try {
      const result = await apiClient.post<{ message: string }>('/maintenance/sessions/revoke-all', {});
      toast.success(result.message);
      loadSessions();
    } catch {
      toast.error('ไม่สามารถยกเลิกเซสชันทั้งหมดได้');
    } finally {
      setActionLoading(null);
      setConfirmRevokeAll(false);
    }
  };

  const clearCaches = async () => {
    setActionLoading('clear-cache');
    try {
      const result = await apiClient.post<{ message: string }>('/maintenance/cache-clear', {});
      toast.success(result.message);
      loadCacheStatus();
    } catch {
      toast.error('ไม่สามารถล้างแคชได้');
    } finally {
      setActionLoading(null);
      setConfirmClearCache(false);
    }
  };

  const runIntegrityCheck = async () => {
    setIntegrityLoading(true);
    try {
      const data = await apiClient.get<IntegrityResult>('/maintenance/integrity-check');
      setIntegrityResult(data);
    } catch {
      toast.error('ไม่สามารถตรวจสอบความถูกต้องได้');
    } finally {
      setIntegrityLoading(false);
    }
  };

  const purgeData = async (endpoint: string, days: number) => {
    try {
      const result = await apiClient.post<{ message: string }>(`/maintenance/${endpoint}`, {
        retentionDays: days,
      });
      toast.success(result.message);
      loadDataStats();
    } catch {
      toast.error('การลบข้อมูลล้มเหลว');
    }
  };

  const bulkDeleteHasFilter = bulkDateFrom || bulkDateTo || bulkNonCancerOnly || bulkNoMedsOrBilling;

  const buildBulkDeleteBody = () => ({
    ...(bulkDateFrom ? { dateFrom: bulkDateFrom } : {}),
    ...(bulkDateTo ? { dateTo: bulkDateTo } : {}),
    ...(bulkNonCancerOnly ? { nonCancerOnly: true } : {}),
    ...(bulkNoMedsOrBilling ? { noMedsOrBilling: true } : {}),
  });

  const runBulkDeletePreview = async () => {
    setBulkPreviewLoading(true);
    setBulkPreview(null);
    try {
      const data = await apiClient.post<BulkDeletePreview>(
        '/protocol-analysis/visits/bulk-delete/preview',
        buildBulkDeleteBody(),
      );
      setBulkPreview(data);
    } catch {
      toast.error('ไม่สามารถดูตัวอย่างได้');
    } finally {
      setBulkPreviewLoading(false);
    }
  };

  const executeBulkDelete = async () => {
    setBulkDeleteLoading(true);
    try {
      const result = await apiClient.post<BulkDeleteResult>(
        '/protocol-analysis/visits/bulk-delete/execute',
        buildBulkDeleteBody(),
      );
      toast.success(
        `ลบสำเร็จ: ${result.deletedCount} visits, ${result.deletedMedications} medications, ` +
        `${result.deletedAiSuggestions} AI suggestions, ${result.deletedBillingClaims} billing claims, ` +
        `${result.deletedBillingItems} billing items`,
      );
      setBulkPreview(null);
      setBulkDateFrom('');
      setBulkDateTo('');
      setBulkNonCancerOnly(false);
      setBulkNoMedsOrBilling(false);
    } catch {
      toast.error('การลบ visits ล้มเหลว');
    } finally {
      setBulkDeleteLoading(false);
      setConfirmBulkDelete(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* ─── Section A: System Diagnostics ─── */}
      <Section
        id="diagnostics"
        icon={Server}
        title="ข้อมูลระบบ"
        titleEn="System Diagnostics"
        defaultOpen={true}
        badge={
          systemInfo?.db.connected ? (
            <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              Online
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px]">Offline</Badge>
          )
        }
      >
        {sysLoading || resLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> กำลังโหลด...
          </div>
        ) : systemInfo ? (
          <div className="space-y-5">
            {/* App + DB info grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Application */}
              <div className="rounded-lg border border-border/50 p-3 space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Application</h4>
                <InfoRow label="Version" value={`v${systemInfo.app.version}`} mono />
                <InfoRow label="Node.js" value={systemInfo.app.nodeVersion} mono />
                <InfoRow label="Platform" value={`${systemInfo.app.platform} / ${systemInfo.app.arch}`} mono />
                <InfoRow label="PID" value={systemInfo.app.pid} mono />
                <InfoRow label="Uptime" value={formatUptime(systemInfo.app.uptimeSeconds)} />
              </div>

              {/* Database */}
              <div className="rounded-lg border border-border/50 p-3 space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Database</h4>
                <InfoRow
                  label="สถานะ"
                  value={
                    systemInfo.db.connected ? (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <StatusDot status="ok" /> Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-rose-600">
                        <StatusDot status="error" /> Disconnected
                      </span>
                    )
                  }
                />
                <InfoRow label="Version" value={systemInfo.db.version} mono />
                <InfoRow label="Database" value={systemInfo.db.name} mono />
                <InfoRow label="ขนาด" value={systemInfo.db.sizeFormatted} mono />
              </div>

              {/* Environment */}
              <div className="rounded-lg border border-border/50 p-3 space-y-1">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Environment</h4>
                <InfoRow label="NODE_ENV" value={<Badge variant="secondary" className="text-[10px] font-mono">{systemInfo.env.nodeEnv}</Badge>} />
                <InfoRow label="API Port" value={systemInfo.env.apiPort} mono />
                <InfoRow
                  label="Settings Encryption"
                  value={
                    systemInfo.env.encryptionConfigured ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs">Configured</span>
                    ) : (
                      <span className="text-amber-600 text-xs">Not set</span>
                    )
                  }
                />
                <InfoRow
                  label="Backup Encryption"
                  value={
                    systemInfo.env.backupEncryptionConfigured ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-xs">Configured</span>
                    ) : (
                      <span className="text-amber-600 text-xs">Not set</span>
                    )
                  }
                />
              </div>
            </div>

            {/* Resource bars */}
            {resources && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/50 p-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <MemoryStick className="h-3 w-3" /> Process Memory
                  </h4>
                  <MemoryBar used={resources.process.heapUsed} total={resources.process.heapTotal} label={`Heap: ${resources.process.heapUsedFormatted} / ${resources.process.heapTotalFormatted}`} />
                  <InfoRow label="RSS" value={resources.process.rssFormatted} mono />
                  <InfoRow label="External" value={resources.process.externalFormatted} mono />
                </div>
                <div className="rounded-lg border border-border/50 p-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="h-3 w-3" /> OS Resources
                  </h4>
                  <MemoryBar used={resources.os.totalMemory - resources.os.freeMemory} total={resources.os.totalMemory} label={`RAM: ${resources.os.usedMemoryPercent}% used of ${resources.os.totalMemoryFormatted}`} />
                  <InfoRow label="CPU Cores" value={resources.os.cpuCount} mono />
                  <InfoRow label="Hostname" value={resources.os.hostname} mono />
                  <InfoRow label="OS Uptime" value={formatUptime(resources.os.uptimeSeconds)} />
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => { refetchSys(); refetchRes(); }}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>
          </div>
        ) : null}
      </Section>

      {/* ─── Section B: Database Maintenance ─── */}
      <Section id="database" icon={Database} title="ฐานข้อมูล" titleEn="Database Maintenance">
        <div className="space-y-5">
          {/* Table sizes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">ขนาดตาราง</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={loadTableSizes} disabled={tableSizesLoading}>
                  {tableSizesLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <HardDrive className="h-3 w-3 mr-1" />}
                  โหลดข้อมูล
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => runVacuum()}
                  disabled={actionLoading === 'vacuum-all'}
                >
                  {actionLoading === 'vacuum-all' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                  VACUUM ALL
                </Button>
              </div>
            </div>
            {tableSizes && (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Table</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Rows</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Size</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Index</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground w-20">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableSizes.map((t) => (
                        <tr key={t.table} className="border-b border-border/30 hover:bg-primary/[0.02]">
                          <td className="py-1.5 px-3 font-mono text-foreground">{t.table}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">{t.rowCount.toLocaleString()}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">{t.diskSizeFormatted}</td>
                          <td className="py-1.5 px-3 text-right font-mono text-muted-foreground">{t.indexSizeFormatted}</td>
                          <td className="py-1.5 px-3 text-right">
                            <button
                              onClick={() => runVacuum(t.table)}
                              disabled={actionLoading === `vacuum-${t.table}`}
                              className="text-primary hover:text-primary/80 text-[10px] font-medium disabled:opacity-50"
                            >
                              VACUUM
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Active queries */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">Active Queries</h4>
              <Button variant="outline" size="sm" className="text-xs h-7" onClick={loadActiveQueries} disabled={queriesLoading}>
                {queriesLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Activity className="h-3 w-3 mr-1" />}
                โหลดข้อมูล
              </Button>
            </div>
            {activeQueries && (
              activeQueries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">ไม่มี query ที่กำลังทำงาน</p>
              ) : (
                <div className="space-y-2">
                  {activeQueries.map((q) => (
                    <div key={q.pid} className="rounded-lg border border-border/50 p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-muted-foreground">PID: {q.pid}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{q.state}</Badge>
                          <span className="font-mono text-amber-600">{q.durationSeconds}s</span>
                          {q.durationSeconds > 5 && (
                            <button onClick={() => cancelQuery(q.pid)} className="text-rose-600 hover:text-rose-700 font-medium">
                              <Ban className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="font-mono text-[11px] text-muted-foreground truncate">{q.query}</p>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </Section>

      {/* ─── Section C: Session Management ─── */}
      <Section id="sessions" icon={Users} title="เซสชัน" titleEn="Session Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={loadSessions} disabled={sessionsLoading}>
              {sessionsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              โหลดเซสชัน
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={actionLoading === 'purge-sessions'}
                onClick={() => setConfirmPurgeExpired(true)}
              >
                <Clock className="h-3 w-3 mr-1" /> ลบเซสชันหมดอายุ
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs h-7"
                disabled={actionLoading === 'revoke-all'}
                onClick={() => setConfirmRevokeAll(true)}
              >
                <AlertTriangle className="h-3 w-3 mr-1" /> Force Logout ทั้งหมด
              </Button>
            </div>
          </div>

          {sessions && (
            sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">ไม่มีเซสชันที่ใช้งานอยู่</p>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden">
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-card z-10">
                      <tr className="border-b border-border/50">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">ผู้ใช้</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">บทบาท</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">IP</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">กิจกรรมล่าสุด</th>
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr key={s.id} className="border-b border-border/30 hover:bg-primary/[0.02]">
                          <td className="py-1.5 px-3">
                            <div className="text-foreground font-medium">{s.userFullName}</div>
                            <div className="text-muted-foreground">{s.userEmail}</div>
                          </td>
                          <td className="py-1.5 px-3">
                            <Badge variant="secondary" className="text-[10px]">{s.userRole}</Badge>
                          </td>
                          <td className="py-1.5 px-3 font-mono text-muted-foreground">{s.ipAddress || '—'}</td>
                          <td className="py-1.5 px-3 text-muted-foreground">{timeAgo(s.lastActivityAt)}</td>
                          <td className="py-1.5 px-3">
                            {s.isExpired ? (
                              <Badge variant="destructive" className="text-[10px]">หมดอายุ</Badge>
                            ) : (
                              <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                Active
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          <ConfirmDialog
            open={confirmPurgeExpired}
            onCancel={() => setConfirmPurgeExpired(false)}
            title="ลบเซสชันหมดอายุ"
            description="ลบเซสชันที่หมดอายุแล้วทั้งหมดออกจากระบบ"
            confirmText="ยืนยัน"
            onConfirm={purgeExpiredSessions}
          />
          <ConfirmDialog
            open={confirmRevokeAll}
            onCancel={() => setConfirmRevokeAll(false)}
            title="Force Logout ผู้ใช้ทั้งหมด"
            description="ยกเลิกเซสชันของผู้ใช้ทุกคน (ยกเว้นเซสชันปัจจุบันของคุณ) — ผู้ใช้ทั้งหมดจะต้อง login ใหม่"
            confirmText="ยืนยัน Force Logout"
            variant="destructive"
            onConfirm={revokeAllSessions}
          />
        </div>
      </Section>

      {/* ─── Section D: Cache Management ─── */}
      <Section id="cache" icon={Zap} title="แคช" titleEn="Cache Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={loadCacheStatus}>
              <RefreshCw className="h-3 w-3 mr-1" /> โหลดสถานะ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              disabled={actionLoading === 'clear-cache'}
              onClick={() => setConfirmClearCache(true)}
            >
              {actionLoading === 'clear-cache' ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Trash2 className="h-3 w-3 mr-1" />}
              ล้างแคชทั้งหมด
            </Button>
          </div>

          {cacheStatus && (
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <InfoRow label="Dashboard cache entries" value={cacheStatus.dashboard.size} mono />
              <InfoRow label="Settings cache TTL" value={cacheStatus.settingsCacheTtl} mono />
              {cacheStatus.dashboard.keys.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-2">Cache keys:</p>
                  <div className="flex flex-wrap gap-1">
                    {cacheStatus.dashboard.keys.map((k) => (
                      <Badge key={k.key} variant="secondary" className="text-[10px] font-mono">
                        {k.key}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <ConfirmDialog
            open={confirmClearCache}
            onCancel={() => setConfirmClearCache(false)}
            title="ล้างแคชทั้งหมด"
            description="ล้างแคช Dashboard และ Settings — ข้อมูลจะถูกโหลดใหม่จากฐานข้อมูลในครั้งถัดไป"
            confirmText="ยืนยัน"
            onConfirm={clearCaches}
          />
        </div>
      </Section>

      {/* ─── Section E: Data Cleanup ─── */}
      <Section id="cleanup" icon={Trash2} title="ล้างข้อมูลเก่า" titleEn="Data Cleanup">
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">เลือกระยะเวลาเก็บรักษา แล้วกดลบข้อมูลที่เก่ากว่า</p>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={loadDataStats} disabled={dataStatsLoading}>
              {dataStatsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CalendarDays className="h-3 w-3 mr-1" />}
              โหลดสถิติ
            </Button>
          </div>

          {dataStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <PurgeCard
                title="บันทึกกิจกรรม (Audit Logs)"
                total={dataStats.auditLogs.total}
                oldestDate={dataStats.auditLogs.oldestDate}
                newestDate={dataStats.auditLogs.newestDate}
                minDays={30}
                defaultDays={90}
                onPurge={(days) => purgeData('purge-audit-logs', days)}
              />
              <PurgeCard
                title="AI Suggestions"
                total={dataStats.aiSuggestions.total}
                oldestDate={dataStats.aiSuggestions.oldestDate}
                newestDate={dataStats.aiSuggestions.newestDate}
                minDays={30}
                defaultDays={180}
                onPurge={(days) => purgeData('purge-ai-suggestions', days)}
              />
              <PurgeCard
                title="ไฟล์ Export (ZIP)"
                total={dataStats.billingExportBatches.total}
                oldestDate={dataStats.billingExportBatches.oldestDate}
                newestDate={dataStats.billingExportBatches.newestDate}
                minDays={90}
                defaultDays={365}
                extra={
                  <p className="text-xs text-muted-foreground">
                    พื้นที่ไฟล์: <span className="font-mono font-medium text-foreground">{dataStats.billingExportBatches.totalFileSizeFormatted}</span>
                    <span className="text-[10px] ml-1">(ลบเฉพาะไฟล์ ZIP ข้อมูลสรุปยังคงอยู่)</span>
                  </p>
                }
                onPurge={(days) => purgeData('purge-export-files', days)}
              />
              <PurgeCard
                title="บันทึกสแกน HIS (Scan Logs)"
                total={dataStats.nightlyScanLogs.total}
                oldestDate={dataStats.nightlyScanLogs.oldestDate}
                newestDate={dataStats.nightlyScanLogs.newestDate}
                minDays={30}
                defaultDays={180}
                onPurge={(days) => purgeData('purge-scan-logs', days)}
              />
            </div>
          )}
        </div>
      </Section>

      {/* ─── Section E2: Bulk Delete Visits ─── */}
      {isAdmin && (
        <Section id="bulk-delete-visits" icon={Filter} title="ลบ Visit (Bulk Delete)" titleEn="Bulk Delete Visits">
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              ลบ visits จำนวนมากตามเงื่อนไข — ต้องเลือกอย่างน้อย 1 เงื่อนไข
            </p>

            {/* Date range filters */}
            <div className="rounded-lg border border-border/50 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ช่วงวันที่</h4>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">ตั้งแต่</span>
                  <ThaiDatePicker
                    value={bulkDateFrom}
                    onChange={(v) => { setBulkDateFrom(v); setBulkPreview(null); }}
                    placeholder="เลือกวันที่"
                    className="w-44 h-8 text-xs"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">ถึง</span>
                  <ThaiDatePicker
                    value={bulkDateTo}
                    onChange={(v) => { setBulkDateTo(v); setBulkPreview(null); }}
                    placeholder="เลือกวันที่"
                    className="w-44 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkNonCancerOnly}
                    onChange={(e) => { setBulkNonCancerOnly(e.target.checked); setBulkPreview(null); }}
                    className="rounded border-border"
                  />
                  เฉพาะ visit ที่ไม่ใช่มะเร็ง (nonCancerOnly)
                </label>
                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkNoMedsOrBilling}
                    onChange={(e) => { setBulkNoMedsOrBilling(e.target.checked); setBulkPreview(null); }}
                    className="rounded border-border"
                  />
                  เฉพาะ visit ที่ไม่มีรายการยาหรือค่าใช้จ่าย (noMedsOrBilling)
                </label>
              </div>
            </div>

            {/* Preview button */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                disabled={!bulkDeleteHasFilter || bulkPreviewLoading}
                onClick={runBulkDeletePreview}
              >
                {bulkPreviewLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Search className="h-3 w-3 mr-1" />
                )}
                ดูตัวอย่าง
              </Button>
              {!bulkDeleteHasFilter && (
                <span className="text-xs text-muted-foreground">กรุณาเลือกอย่างน้อย 1 เงื่อนไข</span>
              )}
            </div>

            {/* Preview results */}
            {bulkPreview && (
              <div className="rounded-lg border border-border/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-foreground">ผลการค้นหา</h4>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {bulkPreview.matchCount.toLocaleString()} visits
                  </Badge>
                </div>

                {bulkPreview.matchCount === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">ไม่พบ visit ที่ตรงเงื่อนไข</p>
                ) : (
                  <>
                    {/* Sample table */}
                    {bulkPreview.samples.length > 0 && (
                      <div className="rounded-lg border border-border/50 overflow-hidden">
                        <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-card z-10">
                              <tr className="border-b border-border/50">
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">VN</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">HN</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">วันที่</th>
                                <th className="text-left py-2 px-3 font-medium text-muted-foreground">วินิจฉัยหลัก</th>
                              </tr>
                            </thead>
                            <tbody>
                              {bulkPreview.samples.map((s) => (
                                <tr key={s.vn} className="border-b border-border/30 hover:bg-primary/[0.02]">
                                  <td className="py-1.5 px-3 font-mono text-foreground">{s.vn}</td>
                                  <td className="py-1.5 px-3 font-mono text-muted-foreground">{s.hn}</td>
                                  <td className="py-1.5 px-3 text-muted-foreground">{formatDate(s.visitDate)}</td>
                                  <td className="py-1.5 px-3 text-muted-foreground">{s.primaryDiagnosis || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Execute button */}
                    <div className="flex justify-end pt-1">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs h-8"
                        disabled={bulkDeleteLoading}
                        onClick={() => setConfirmBulkDelete(true)}
                      >
                        {bulkDeleteLoading ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        ลบ {bulkPreview.matchCount.toLocaleString()} visits
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            <ConfirmDialog
              open={confirmBulkDelete}
              onCancel={() => setConfirmBulkDelete(false)}
              title="ยืนยันการลบ Visit"
              description={`ลบ ${bulkPreview?.matchCount.toLocaleString() ?? 0} visits พร้อมข้อมูลที่เกี่ยวข้อง (medications, AI suggestions, billing claims, billing items) — การดำเนินการนี้ไม่สามารถย้อนกลับได้`}
              confirmText="ยืนยันลบ"
              variant="destructive"
              onConfirm={executeBulkDelete}
            />
          </div>
        </Section>
      )}

      {/* ─── Section F: Integrity Check ─── */}
      <Section
        id="integrity"
        icon={ShieldCheck}
        title="ตรวจสอบความถูกต้อง"
        titleEn="Data Integrity Check"
        badge={
          integrityResult ? (
            integrityResult.totalIssues === 0 ? (
              <Badge variant="default" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                ปกติ
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px]">
                {integrityResult.totalIssues} issues
              </Badge>
            )
          ) : null
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">ตรวจสอบข้อมูลในฐานข้อมูลว่ามีความสอดคล้องกัน (read-only, ไม่แก้ไขข้อมูล)</p>
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={runIntegrityCheck} disabled={integrityLoading}>
              {integrityLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldCheck className="h-3 w-3 mr-1" />}
              เริ่มตรวจสอบ
            </Button>
          </div>

          {integrityResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3">
                {integrityResult.totalIssues === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                )}
                <span className="text-sm font-medium text-foreground">{integrityResult.summary}</span>
                <span className="text-xs text-muted-foreground ml-auto">ตรวจเมื่อ {formatDateTime(integrityResult.checkedAt)}</span>
              </div>
              {integrityResult.checks.map((check) => (
                <div
                  key={check.name}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3 text-sm',
                    check.status === 'ok' && 'border-border/50 bg-card',
                    check.status === 'warning' && 'border-amber-500/30 bg-amber-500/[0.03]',
                    check.status === 'error' && 'border-rose-500/30 bg-rose-500/[0.03]',
                  )}
                >
                  {check.status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : check.status === 'warning' ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground font-medium text-xs">{check.nameThai}</span>
                    <p className="text-[11px] text-muted-foreground">{check.message}</p>
                  </div>
                  {check.count > 0 && (
                    <Badge
                      variant={check.status === 'error' ? 'destructive' : check.status === 'warning' ? 'warning' : 'secondary'}
                      className="text-[10px] font-mono shrink-0"
                    >
                      {check.count}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
