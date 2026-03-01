'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FlaskConical, Plus } from 'lucide-react';
import { usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';

interface Regimen {
  id: number;
  regimenCode: string;
  regimenName: string;
  regimenType: string | null;
  cycleDays: number | null;
  maxCycles: number | null;
  isActive: boolean;
  _count?: { regimenDrugs: number; protocolRegimens: number };
}

interface RegimensResponse {
  data: Regimen[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const typeOptions = [
  { value: 'chemotherapy', label: 'Chemotherapy' },
  { value: 'targeted', label: 'Targeted Therapy' },
  { value: 'immunotherapy', label: 'Immunotherapy' },
  { value: 'hormonal', label: 'Hormonal Therapy' },
  { value: 'chemoradiation', label: 'Chemoradiation' },
];

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'secondary'> = {
  chemotherapy: 'default',
  targeted: 'accent',
  immunotherapy: 'success',
  hormonal: 'warning',
  chemoradiation: 'secondary',
};

export default function RegimensPage() {
  const router = useRouter();
  const [page, setPage, h1] = usePersistedState('sso-regimens-page', 1);
  const [search, setSearch, h2] = usePersistedState('sso-regimens-search', '');
  const [regimenType, setRegimenType, h3] = usePersistedState('sso-regimens-type', '');
  const [sortBy, setSortBy, h4] = usePersistedState('sso-regimens-sortBy', 'regimenCode');
  const [sortOrder, setSortOrder, h5] = usePersistedState<'asc' | 'desc'>('sso-regimens-sortOrder', 'asc');
  const filtersHydrated = h1 && h2 && h3 && h4 && h5;

  const { data: response, isLoading } = usePaginatedApi<RegimensResponse>('/regimens', {
    page,
    limit: 20,
    search: search || undefined,
    regimenType: regimenType || undefined,
    sortBy,
    sortOrder,
  }, { enabled: filtersHydrated });

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const columns: Column<Regimen>[] = [
    {
      key: 'regimenCode',
      header: 'รหัส',
      sortable: true,
      className: 'w-32',
      render: (row) => <CodeBadge code={row.regimenCode} />,
    },
    {
      key: 'regimenName',
      header: 'ชื่อสูตรยา',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-foreground">{row.regimenName}</span>
      ),
    },
    {
      key: 'regimenType',
      header: 'ประเภท',
      sortable: true,
      render: (row) =>
        row.regimenType ? (
          <Badge variant={typeVariant[row.regimenType] || 'secondary'} className="text-[11px]">
            {row.regimenType.replace(/_/g, ' ')}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'drugs',
      header: 'ยา',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="tabular-nums text-sm">{row._count?.regimenDrugs ?? 0}</span>
      ),
    },
    {
      key: 'protocols',
      header: 'โปรโตคอล',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="tabular-nums text-sm">{row._count?.protocolRegimens ?? 0}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'สถานะ',
      render: (row) => <StatusBadge active={row.isActive} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <FlaskConical className="h-6 w-6 text-primary" />
            สูตรยา
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Regimens — {response?.meta?.total ?? 0} รายการ
          </p>
        </div>
        <Button asChild>
          <Link href="/regimens/new">
            <Plus className="h-4 w-4 mr-1" />
            สร้างสูตรยา
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 glass-light rounded-xl p-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="ค้นหาสูตรยา..."
          className="w-full sm:w-[300px]"
        />
        <Select
          value={regimenType}
          onChange={(v) => { setRegimenType(v); setPage(1); }}
          options={typeOptions}
          placeholder="ประเภททั้งหมด"
          className="w-full sm:w-[180px]"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={response?.data ?? []}
          totalItems={response?.meta?.total ?? 0}
          page={page}
          pageSize={20}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/regimens/${r.id}`)}
          emptyTitle="ไม่พบสูตรยา"
          emptyDescription="No regimens found matching your criteria"
        />
      )}
    </div>
  );
}
