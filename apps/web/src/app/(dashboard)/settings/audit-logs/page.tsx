'use client';

import { useState, useCallback, Fragment } from 'react';
import { Download, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { usePaginatedApi } from '@/hooks/use-api';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { AuditDiff } from '@/components/settings/audit-diff';
import { Pagination } from '@/components/shared/pagination';

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: string | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { id: number; fullName: string; email: string } | null;
}

interface AuditLogsResponse {
  data: AuditLog[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const actionOptions = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'PASSWORD_CHANGE', label: 'Password Change' },
  { value: 'AI_SUGGESTION', label: 'AI Suggestion' },
];

const actionVariant: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'accent'> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'destructive',
  LOGIN: 'default',
  LOGOUT: 'secondary',
  LOGIN_FAILED: 'destructive',
  PASSWORD_CHANGE: 'accent',
  AI_SUGGESTION: 'accent',
};

function MetadataView({ metadata }: { metadata: string }) {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(metadata);
  } catch {
    return <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{metadata}</pre>;
  }
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
      {Object.entries(parsed).map(([key, val]) => (
        <Fragment key={key}>
          <span className="font-medium text-muted-foreground">{key}</span>
          <span className="font-mono text-foreground/80">{String(val ?? '—')}</span>
        </Fragment>
      ))}
    </div>
  );
}

export default function AuditLogsPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: response, isLoading } = usePaginatedApi<AuditLogsResponse>('/audit-logs', {
    page,
    limit: 20,
    action: action || undefined,
    entityType: entityType || undefined,
  });

  const entityTypeOptions = [
    { value: 'User', label: 'User' },
    { value: 'ProtocolName', label: 'Protocol' },
    { value: 'Regimen', label: 'Regimen' },
    { value: 'Drug', label: 'Drug' },
    { value: 'DrugTradeName', label: 'Trade Name' },
    { value: 'CancerSite', label: 'Cancer Site' },
    { value: 'AppSetting', label: 'Setting' },
    { value: 'AiSuggestion', label: 'AI Suggestion' },
  ];

  const handleExport = async () => {
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1/audit-logs/export`;
      const token = apiClient.getAccessToken();
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });
      if (!resp.ok) throw new Error('Export failed');
      const blob = await resp.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('ส่งออกสำเร็จ');
    } catch {
      toast.error('ไม่สามารถส่งออกได้');
    }
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'เวลา',
      className: 'w-36',
      render: (row) => (
        <span className="text-xs tabular-nums text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString('th-TH', {
            day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
          })}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'ผู้ใช้',
      render: (row) => (
        <span className="text-sm">{row.user?.fullName || 'System'}</span>
      ),
    },
    {
      key: 'action',
      header: 'การดำเนินการ',
      render: (row) => (
        <Badge variant={actionVariant[row.action] || 'secondary'} className="text-[11px]">
          {row.action}
        </Badge>
      ),
    },
    {
      key: 'entityType',
      header: 'ประเภท',
      render: (row) => (
        <span className="text-sm">{row.entityType}</span>
      ),
    },
    {
      key: 'entityId',
      header: 'ID',
      className: 'w-16',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.entityId || '—'}</span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      className: 'w-28',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground">{row.ipAddress || '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {response?.meta?.total ?? 0} รายการ
        </p>
        {user?.role === 'SUPER_ADMIN' && (
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            ส่งออก CSV
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={action}
          onChange={(v) => { setAction(v); setPage(1); }}
          options={actionOptions}
          placeholder="การดำเนินการทั้งหมด"
          className="w-full sm:w-[180px]"
        />
        <Select
          value={entityType}
          onChange={(v) => { setEntityType(v); setPage(1); }}
          options={entityTypeOptions}
          placeholder="ประเภททั้งหมด"
          className="w-full sm:w-[160px]"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <>
          {/* Custom table with expandable rows */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/5">
                  {columns.map((col) => (
                    <th key={col.key} className={`px-4 py-3 text-left font-medium text-muted-foreground ${col.className || ''}`}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(response?.data ?? []).map((row) => (
                  <Fragment key={row.id}>
                    <tr
                      onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
                      className="border-b cursor-pointer hover:bg-muted/5 transition-colors"
                    >
                      {columns.map((col) => (
                        <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                    {expandedId === row.id && (row.oldValues || row.newValues || row.metadata) && (
                      <tr key={`${row.id}-diff`}>
                        <td colSpan={columns.length} className="bg-muted/5 px-4 py-4">
                          {row.oldValues || row.newValues ? (
                            <AuditDiff oldValues={row.oldValues} newValues={row.newValues} />
                          ) : row.metadata ? (
                            <MetadataView metadata={row.metadata} />
                          ) : null}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {(response?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                      ไม่พบบันทึกกิจกรรม
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
