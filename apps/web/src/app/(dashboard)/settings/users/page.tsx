'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { CreateUserDialog } from '@/components/settings/create-user-dialog';

interface UserItem {
  id: number;
  email: string;
  fullName: string;
  fullNameThai: string | null;
  role: string;
  department: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface UsersResponse {
  data: UserItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const roleOptions = [
  { value: 'SUPER_ADMIN', label: 'Super Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
];

const roleVariant: Record<string, 'default' | 'destructive' | 'warning' | 'accent' | 'secondary'> = {
  SUPER_ADMIN: 'destructive',
  ADMIN: 'warning',
  EDITOR: 'default',
  VIEWER: 'secondary',
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'ผู้ดูแลสูงสุด',
  ADMIN: 'ผู้ดูแล',
  EDITOR: 'บรรณาธิการ',
  VIEWER: 'ผู้ดู',
};

export default function UsersPage() {
  const router = useRouter();
  const [page, setPage, h1] = usePersistedState('sso-users-page', 1);
  const [search, setSearch, h2] = usePersistedState('sso-users-search', '');
  const [role, setRole, h3] = usePersistedState('sso-users-role', '');
  const filtersHydrated = h1 && h2 && h3;
  const [showCreate, setShowCreate] = useState(false);

  const { data: response, isLoading, refetch } = usePaginatedApi<UsersResponse>('/users', {
    page,
    limit: 20,
    search: search || undefined,
    role: role || undefined,
  }, { enabled: filtersHydrated });

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const columns: Column<UserItem>[] = [
    {
      key: 'fullName',
      header: 'ชื่อ-สกุล',
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">
            {row.fullNameThai || row.fullName}
          </p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'สิทธิ์',
      render: (row) => (
        <Badge variant={roleVariant[row.role] || 'secondary'} className="text-[11px]">
          {roleLabels[row.role] || row.role}
        </Badge>
      ),
    },
    {
      key: 'department',
      header: 'แผนก',
      render: (row) => (
        <span className="text-sm">{row.department || '—'}</span>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'เข้าใช้ล่าสุด',
      render: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.lastLoginAt
            ? new Date(row.lastLoginAt).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'ยังไม่เคยเข้าใช้'}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'สถานะ',
      render: (row) => <StatusBadge active={row.isActive} />,
    },
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {response?.meta?.total ?? 0} ผู้ใช้งาน
          </p>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <UserPlus className="h-4 w-4 mr-1.5" />
            เพิ่มผู้ใช้
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="ค้นหาผู้ใช้..."
            className="w-full sm:w-[280px]"
          />
          <Select
            value={role}
            onChange={(v) => { setRole(v); setPage(1); }}
            options={roleOptions}
            placeholder="สิทธิ์ทั้งหมด"
            className="w-full sm:w-[160px]"
          />
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : (
          <DataTable
            columns={columns}
            data={response?.data ?? []}
            totalItems={response?.meta?.total ?? 0}
            page={page}
            pageSize={20}
            onPageChange={setPage}
            rowKey={(r) => r.id}
            onRowClick={(r) => router.push(`/settings/users/${r.id}`)}
            emptyTitle="ไม่พบผู้ใช้"
            emptyDescription="No users found"
          />
        )}
      </div>

      <CreateUserDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => {
          setShowCreate(false);
          refetch();
        }}
      />
    </>
  );
}
