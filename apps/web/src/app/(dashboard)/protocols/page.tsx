'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';
import { usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { apiClient } from '@/lib/api-client';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/status-badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';

interface Protocol {
  id: number;
  protocolCode: string;
  nameEnglish: string;
  nameThai: string | null;
  protocolType: string;
  treatmentIntent: string;
  isActive: boolean;
  cancerSite?: { nameEnglish: string; nameThai: string };
  _count?: { protocolRegimens: number; protocolStages: number };
}

interface ProtocolsResponse {
  data: Protocol[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

const protocolTypeOptions = [
  { value: 'CHEMOTHERAPY', label: 'Chemotherapy' },
  { value: 'TARGETED_THERAPY', label: 'Targeted Therapy' },
  { value: 'IMMUNOTHERAPY', label: 'Immunotherapy' },
  { value: 'HORMONAL_THERAPY', label: 'Hormonal Therapy' },
  { value: 'CHEMORADIATION', label: 'Chemoradiation' },
  { value: 'COMBINATION', label: 'Combination' },
];

const intentOptions = [
  { value: 'CURATIVE', label: 'Curative' },
  { value: 'PALLIATIVE', label: 'Palliative' },
  { value: 'ADJUVANT', label: 'Adjuvant' },
  { value: 'NEOADJUVANT', label: 'Neoadjuvant' },
  { value: 'CONCURRENT', label: 'Concurrent' },
];

const intentVariantMap: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'secondary'> = {
  CURATIVE: 'success',
  PALLIATIVE: 'warning',
  ADJUVANT: 'default',
  NEOADJUVANT: 'accent',
  CONCURRENT: 'secondary',
};

interface CancerSite {
  id: number;
  siteCode: string;
  nameThai: string;
  nameEnglish: string;
}

export default function ProtocolsPage() {
  const router = useRouter();
  const [page, setPage] = usePersistedState('sso-protocols-page', 1);
  const [search, setSearch] = usePersistedState('sso-protocols-search', '');
  const [protocolType, setProtocolType] = usePersistedState('sso-protocols-type', '');
  const [treatmentIntent, setTreatmentIntent] = usePersistedState('sso-protocols-intent', '');
  const [cancerSiteId, setCancerSiteId] = usePersistedState('sso-protocols-site', '');
  const [sortBy, setSortBy] = usePersistedState('sso-protocols-sortBy', 'protocolCode');
  const [sortOrder, setSortOrder] = usePersistedState<'asc' | 'desc'>('sso-protocols-sortOrder', 'asc');
  const [cancerSites, setCancerSites] = usePersistedState<CancerSite[]>('sso-protocols-sites-cache', []);

  useEffect(() => {
    apiClient
      .get<{ data: CancerSite[]; meta: { total: number } }>('/cancer-sites?limit=100&sortBy=sortOrder&sortOrder=asc')
      .then((res) => setCancerSites(res.data || []))
      .catch(() => {});
  }, []);

  const cancerSiteOptions = cancerSites.map((s) => ({
    value: String(s.id),
    label: `${s.nameThai} (${s.siteCode})`,
  }));

  const { data: response, isLoading } = usePaginatedApi<ProtocolsResponse>('/protocols', {
    page,
    limit: 20,
    search: search || undefined,
    protocolType: protocolType || undefined,
    treatmentIntent: treatmentIntent || undefined,
    cancerSiteId: cancerSiteId || undefined,
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

  const columns: Column<Protocol>[] = [
    {
      key: 'protocolCode',
      header: 'รหัส',
      sortable: true,
      className: 'w-28',
      render: (row) => <CodeBadge code={row.protocolCode} />,
    },
    {
      key: 'nameEnglish',
      header: 'ชื่อโปรโตคอล',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-medium text-foreground">{row.nameEnglish}</p>
          {row.nameThai && <p className="text-xs text-muted-foreground mt-0.5">{row.nameThai}</p>}
        </div>
      ),
    },
    {
      key: 'cancerSite',
      header: 'ตำแหน่งมะเร็ง',
      render: (row) => (
        <span className="text-sm">
          {row.cancerSite?.nameThai || row.cancerSite?.nameEnglish || '—'}
        </span>
      ),
    },
    {
      key: 'protocolType',
      header: 'ประเภท',
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className="text-[11px]">
          {row.protocolType.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'treatmentIntent',
      header: 'เจตนา',
      sortable: true,
      render: (row) => (
        <Badge variant={intentVariantMap[row.treatmentIntent] || 'secondary'} className="text-[11px]">
          {row.treatmentIntent}
        </Badge>
      ),
    },
    {
      key: 'regimens',
      header: 'สูตรยา',
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            โปรโตคอล
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Treatment Protocols — {response?.meta?.total ?? 0} รายการ
          </p>
        </div>
        <Button asChild>
          <Link href="/protocols/new">
            <Plus className="h-4 w-4 mr-1" />
            สร้างโปรโตคอล
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="ค้นหาโปรโตคอล..."
          className="w-full sm:w-[300px]"
        />
        <Select
          value={cancerSiteId}
          onChange={(v) => { setCancerSiteId(v); setPage(1); }}
          options={cancerSiteOptions}
          placeholder="ตำแหน่งมะเร็งทั้งหมด"
          className="w-full sm:w-55"
        />
        <Select
          value={protocolType}
          onChange={(v) => { setProtocolType(v); setPage(1); }}
          options={protocolTypeOptions}
          placeholder="ประเภททั้งหมด"
          className="w-full sm:w-[180px]"
        />
        <Select
          value={treatmentIntent}
          onChange={(v) => { setTreatmentIntent(v); setPage(1); }}
          options={intentOptions}
          placeholder="เจตนาทั้งหมด"
          className="w-full sm:w-[160px]"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton rows={8} cols={7} />
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
          onRowClick={(r) => router.push(`/protocols/${r.id}`)}
          emptyTitle="ไม่พบโปรโตคอล"
          emptyDescription="No protocols found matching your criteria"
        />
      )}
    </div>
  );
}
