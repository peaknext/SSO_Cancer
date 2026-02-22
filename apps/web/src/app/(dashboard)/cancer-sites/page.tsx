'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Microscope } from 'lucide-react';
import { usePaginatedApi } from '@/hooks/use-api';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { StatusBadge } from '@/components/shared/status-badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';

interface CancerSite {
  id: number;
  siteCode: string;
  nameEnglish: string;
  nameThai: string;
  sortOrder: number;
  isActive: boolean;
  _count?: { protocols: number; siteStages: number };
}

interface CancerSitesResponse {
  data: CancerSite[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export default function CancerSitesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('sortOrder');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: response, isLoading } = usePaginatedApi<CancerSitesResponse>('/cancer-sites', {
    page,
    limit: 50,
    search: search || undefined,
    sortBy,
    sortOrder,
  });

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy]);

  const columns: Column<CancerSite>[] = [
    {
      key: 'siteCode',
      header: 'รหัส',
      sortable: true,
      className: 'w-20',
      render: (row) => <CodeBadge code={row.siteCode} />,
    },
    {
      key: 'nameThai',
      header: 'ชื่อไทย',
      sortable: true,
      render: (row) => <span className="font-medium text-foreground">{row.nameThai}</span>,
    },
    {
      key: 'nameEnglish',
      header: 'ชื่ออังกฤษ',
      sortable: true,
      render: (row) => <span className="text-sm">{row.nameEnglish}</span>,
    },
    {
      key: 'protocols',
      header: 'โปรโตคอล',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (row) => <span className="tabular-nums">{row._count?.protocols ?? 0}</span>,
    },
    {
      key: 'stages',
      header: 'ระยะ',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (row) => <span className="tabular-nums">{row._count?.siteStages ?? 0}</span>,
    },
    {
      key: 'isActive',
      header: 'สถานะ',
      render: (row) => <StatusBadge active={row.isActive} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Microscope className="h-6 w-6 text-primary" />
          ตำแหน่งมะเร็ง
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cancer Sites — {response?.meta?.total ?? 0} รายการ
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="ค้นหาตำแหน่งมะเร็ง..."
          className="w-full sm:w-[300px]"
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
          pageSize={50}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          rowKey={(r) => r.id}
          onRowClick={(row) => router.push(`/cancer-sites/${row.id}`)}
          emptyTitle="ไม่พบตำแหน่งมะเร็ง"
          emptyDescription="No cancer sites found"
        />
      )}
    </div>
  );
}
