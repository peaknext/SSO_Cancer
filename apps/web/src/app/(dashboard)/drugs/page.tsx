'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pill, Plus } from 'lucide-react';
import { usePaginatedApi } from '@/hooks/use-api';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';

interface Drug {
  id: number;
  drugCode: string;
  genericName: string;
  drugCategory: string;
  isActive: boolean;
  _count?: { tradeNames: number; regimenDrugs: number };
}

interface DrugsResponse {
  data: Drug[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const categoryOptions = [
  { value: 'CHEMOTHERAPY', label: 'Chemotherapy' },
  { value: 'TARGETED_THERAPY', label: 'Targeted Therapy' },
  { value: 'IMMUNOTHERAPY', label: 'Immunotherapy' },
  { value: 'HORMONAL_THERAPY', label: 'Hormonal Therapy' },
  { value: 'SUPPORTIVE', label: 'Supportive' },
  { value: 'OTHER', label: 'Other' },
];

const categoryVariant: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'secondary'> = {
  CHEMOTHERAPY: 'default',
  TARGETED_THERAPY: 'accent',
  IMMUNOTHERAPY: 'success',
  HORMONAL_THERAPY: 'warning',
  SUPPORTIVE: 'secondary',
  OTHER: 'secondary',
};

export default function DrugsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [drugCategory, setDrugCategory] = useState('');
  const [sortBy, setSortBy] = useState('genericName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { data: response, isLoading } = usePaginatedApi<DrugsResponse>('/drugs', {
    page,
    limit: 20,
    search: search || undefined,
    drugCategory: drugCategory || undefined,
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

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    setPage(1);
  }, []);

  const columns: Column<Drug>[] = [
    {
      key: 'drugCode',
      header: 'รหัส',
      sortable: true,
      className: 'w-28',
      render: (row) => <CodeBadge code={row.drugCode} />,
    },
    {
      key: 'genericName',
      header: 'ชื่อสามัญ',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-foreground">{row.genericName}</span>
      ),
    },
    {
      key: 'drugCategory',
      header: 'หมวดหมู่',
      sortable: true,
      render: (row) => (
        <Badge variant={categoryVariant[row.drugCategory] || 'secondary'} className="text-[11px]">
          {row.drugCategory.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'tradeNames',
      header: 'ชื่อการค้า',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="tabular-nums text-sm">{row._count?.tradeNames ?? 0}</span>
      ),
    },
    {
      key: 'regimens',
      header: 'สูตรยา',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="tabular-nums text-sm">{row._count?.regimenDrugs ?? 0}</span>
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
            <Pill className="h-6 w-6 text-primary" />
            ยา
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Drugs Database — {response?.meta?.total ?? 0} รายการ
          </p>
        </div>
        <Button asChild>
          <Link href="/drugs/new">
            <Plus className="h-4 w-4 mr-1" />
            เพิ่มยา
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="ค้นหายา..."
          className="w-full sm:w-[300px]"
        />
        <Select
          value={drugCategory}
          onChange={(v) => { setDrugCategory(v); setPage(1); }}
          options={categoryOptions}
          placeholder="หมวดหมู่ทั้งหมด"
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
          onRowClick={(r) => router.push(`/drugs/${r.id}`)}
          emptyTitle="ไม่พบยา"
          emptyDescription="No drugs found matching your criteria"
        />
      )}
    </div>
  );
}
