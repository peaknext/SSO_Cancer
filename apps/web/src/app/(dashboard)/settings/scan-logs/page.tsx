'use client';

import { useState, Fragment } from 'react';
import Link from 'next/link';
import { ScanSearch, ChevronDown, ChevronRight, Users } from 'lucide-react';
import { useApi, usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { CodeBadge } from '@/components/shared/code-badge';
import { Pagination } from '@/components/shared/pagination';

interface ScanLog {
  id: number;
  scanDate: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  totalScanned: number;
  newPatients: number;
  newVisits: number;
  skipped: number;
  errors: number;
  errorMessage: string | null;
  durationMs: number | null;
  filterConfig: string | null;
  _count?: { details: number };
}

interface ScanDetail {
  id: number;
  hn: string;
  patientName: string | null;
  status: string;
  importedVisits: number;
  skippedVisits: number;
  errorMessage: string | null;
  patientId: number | null;
}

interface ScanLogWithDetails extends ScanLog {
  details: ScanDetail[];
}

interface ScanLogsResponse {
  data: ScanLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const statusOptions = [
  { value: 'success', label: 'สำเร็จ' },
  { value: 'error', label: 'ข้อผิดพลาด' },
];

const statusBadge: Record<string, { variant: 'success' | 'destructive' | 'warning'; label: string }> = {
  success: { variant: 'success', label: 'สำเร็จ' },
  error: { variant: 'destructive', label: 'ข้อผิดพลาด' },
  running: { variant: 'warning', label: 'กำลังสแกน' },
};

const detailStatusBadge: Record<string, { variant: 'success' | 'secondary' | 'destructive'; label: string }> = {
  imported: { variant: 'success', label: 'นำเข้าแล้ว' },
  skipped: { variant: 'secondary', label: 'ข้าม' },
  error: { variant: 'destructive', label: 'ผิดพลาด' },
};

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}m ${rem}s`;
}

function FilterConfigDisplay({ config }: { config: string | null }) {
  if (!config) return <span className="text-muted-foreground">—</span>;
  try {
    const parsed = JSON.parse(config) as { cancerDiag?: boolean; z510?: boolean; z511?: boolean };
    const labels: string[] = [];
    if (parsed.cancerDiag) labels.push('มะเร็ง (C, D0)');
    if (parsed.z510) labels.push('Z510 ฉายรังสี');
    if (parsed.z511) labels.push('Z511 เคมีบำบัด');
    if (labels.length === 0) labels.push('ค่าเริ่มต้น');
    return (
      <div className="flex flex-wrap gap-1">
        {labels.map((l) => (
          <span key={l} className="inline-block rounded bg-muted/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {l}
          </span>
        ))}
      </div>
    );
  } catch {
    return <span className="text-muted-foreground">—</span>;
  }
}

function ScanDetailTable({ scanLogId }: { scanLogId: number }) {
  const { data: scanLog, isLoading } = useApi<ScanLogWithDetails>(
    `/his-integration/scan-logs/${scanLogId}`,
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 animate-pulse rounded bg-muted/30" />
        ))}
      </div>
    );
  }

  if (!scanLog || scanLog.details.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        ไม่มีรายละเอียดผู้ป่วย
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter config */}
      {scanLog.filterConfig && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground font-medium">ตัวกรองที่ใช้:</span>
          <FilterConfigDisplay config={scanLog.filterConfig} />
        </div>
      )}

      {/* Error message */}
      {scanLog.errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="font-medium">ข้อผิดพลาด: </span>
          {scanLog.errorMessage}
        </div>
      )}

      {/* Detail table */}
      <div className="overflow-x-auto rounded-lg border border-glass-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b border-glass-border-subtle">
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">HN</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">ชื่อผู้ป่วย</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">สถานะ</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">นำเข้า</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground w-20">ข้าม</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">ข้อผิดพลาด</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-20"></th>
            </tr>
          </thead>
          <tbody>
            {scanLog.details.map((d) => {
              const badge = detailStatusBadge[d.status] || { variant: 'secondary' as const, label: d.status };
              return (
                <tr key={d.id} className="border-b border-glass-border-subtle last:border-0">
                  <td className="px-3 py-2">
                    <CodeBadge code={d.hn} />
                  </td>
                  <td className="px-3 py-2 text-sm">{d.patientName || '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant={badge.variant} className="text-[10px] px-1.5 py-0">
                      {badge.label}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {d.importedVisits > 0 ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{d.importedVisits}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {d.skippedVisits > 0 ? (
                      <span className="text-muted-foreground">{d.skippedVisits}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {d.errorMessage ? (
                      <span className="text-xs text-destructive line-clamp-2">{d.errorMessage}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.patientId ? (
                      <Link
                        href={`/cancer-patients/${d.patientId}`}
                        className="text-xs text-primary hover:underline"
                      >
                        ดูข้อมูล
                      </Link>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ScanLogsPage() {
  const [page, setPage, h1] = usePersistedState('sso-scan-page', 1);
  const [status, setStatus, h2] = usePersistedState('sso-scan-status', '');
  const filtersHydrated = h1 && h2;
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: response, isLoading } = usePaginatedApi<ScanLogsResponse>(
    '/his-integration/scan-logs',
    {
      page,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: status || undefined,
    },
    { enabled: filtersHydrated },
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-5 w-5 text-primary" />
          <div>
            <h1 className="font-heading text-lg font-semibold">บันทึกการสแกน HIS อัตโนมัติ</h1>
            <p className="text-sm text-muted-foreground">
              {response?.meta?.total ?? 0} รายการ
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(v) => { setStatus(v); setPage(1); }}
          options={statusOptions}
          placeholder="สถานะทั้งหมด"
          className="w-full sm:w-[160px]"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
      ) : (
        <>
          <div className="glass glass-noise relative overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border-subtle bg-white/10 dark:bg-white/5">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8"></th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่สแกน</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">เวลา</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">สถานะ</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-16">
                      <span className="hidden sm:inline">พบทั้งหมด</span>
                      <span className="sm:hidden">พบ</span>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">
                      <span className="hidden sm:inline">ผู้ป่วยใหม่</span>
                      <span className="sm:hidden">ใหม่</span>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-20">Visit</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground w-16">
                      <span className="hidden sm:inline">ผิดพลาด</span>
                      <span className="sm:hidden">Err</span>
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground w-20">ระยะเวลา</th>
                  </tr>
                </thead>
                <tbody>
                  {(response?.data ?? []).map((log) => {
                    const badge = statusBadge[log.status] || { variant: 'secondary' as const, label: log.status };
                    const isExpanded = expandedId === log.id;
                    return (
                      <Fragment key={log.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="border-b border-glass-border-subtle cursor-pointer hover:bg-white/10 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium">
                              {new Date(log.scanDate + 'T00:00:00+07:00').toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {new Date(log.startedAt).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={badge.variant} className="text-[11px]">
                              {badge.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="tabular-nums font-medium">{log.totalScanned}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.newPatients > 0 ? (
                              <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                                +{log.newPatients}
                              </span>
                            ) : (
                              <span className="tabular-nums text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.newVisits > 0 ? (
                              <span className="tabular-nums font-medium text-primary">
                                +{log.newVisits}
                              </span>
                            ) : (
                              <span className="tabular-nums text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {log.errors > 0 ? (
                              <span className="tabular-nums font-medium text-destructive">{log.errors}</span>
                            ) : (
                              <span className="tabular-nums text-muted-foreground">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {formatDuration(log.durationMs)}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="bg-muted/20 dark:bg-white/[0.02] px-6 py-4">
                              <ScanDetailTable scanLogId={log.id} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {(response?.data ?? []).length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-muted-foreground">
                        ไม่พบบันทึกการสแกน
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {response && (
            <Pagination
              page={page}
              totalPages={response.meta.totalPages}
              totalItems={response.meta.total}
              pageSize={20}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
