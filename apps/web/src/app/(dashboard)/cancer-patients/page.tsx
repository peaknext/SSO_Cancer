'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus } from 'lucide-react';
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
import { useApi } from '@/hooks/use-api';

interface PatientCase {
  id: number;
  caseNumber: string;
  status: string;
  protocol: {
    id: number;
    protocolCode: string;
    nameThai: string;
    nameEnglish: string;
    cancerSite: {
      id: number;
      siteCode: string;
      nameThai: string;
    };
  } | null;
}

interface Patient {
  id: number;
  hn: string;
  citizenId: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  cases: PatientCase[];
  _count?: { visits: number; cases: number };
}

interface PatientsResponse {
  data: Patient[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface CancerSite {
  id: number;
  siteCode: string;
  nameThai: string;
}

interface CancerSitesResponse {
  data: CancerSite[];
  meta: { total: number };
}

function maskCitizenId(cid: string): string {
  if (!cid || cid.length !== 13) return cid;
  return `${cid[0]}-${cid.slice(1, 5)}-${cid.slice(5, 10)}-${cid.slice(10, 12)}-${cid[12]}`;
}

export default function CancerPatientsPage() {
  const router = useRouter();
  const [page, setPage] = usePersistedState('cp-page', 1);
  const [search, setSearch] = usePersistedState('cp-search', '');
  const [cancerSiteId, setCancerSiteId] = usePersistedState('cp-cancerSiteId', '');
  const [sortBy, setSortBy] = usePersistedState('cp-sortBy', 'hn');
  const [sortOrder, setSortOrder] = usePersistedState<'asc' | 'desc'>('cp-sortOrder', 'asc');

  const { data: response, isLoading } = usePaginatedApi<PatientsResponse>('/cancer-patients', {
    page,
    limit: 25,
    search: search || undefined,
    cancerSiteId: cancerSiteId || undefined,
    sortBy,
    sortOrder,
  });

  const { data: sitesResponse } = useApi<CancerSitesResponse>('/cancer-sites?limit=100&sortBy=siteCode&sortOrder=asc');

  const siteOptions = (sitesResponse?.data ?? []).map((s) => ({
    value: String(s.id),
    label: `${s.siteCode} — ${s.nameThai}`,
  }));

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

  const columns: Column<Patient>[] = [
    {
      key: 'hn',
      header: 'HN',
      sortable: true,
      className: 'w-28',
      render: (row) => <CodeBadge code={row.hn} />,
    },
    {
      key: 'fullName',
      header: 'ชื่อ-สกุล',
      sortable: true,
      render: (row) => (
        <span className="font-medium text-foreground">{row.fullName}</span>
      ),
    },
    {
      key: 'citizenId',
      header: 'เลขบัตรประชาชน',
      render: (row) => (
        <span className="font-mono text-xs text-muted-foreground tracking-wide">
          {maskCitizenId(row.citizenId)}
        </span>
      ),
    },
    {
      key: 'activeCase',
      header: 'เคส/โปรโตคอล',
      render: (row) => {
        const activeCase = row.cases?.[0];
        if (!activeCase) {
          return <span className="text-muted-foreground text-xs">ยังไม่มีเคส</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="success" className="text-[11px]">
              {activeCase.caseNumber}
            </Badge>
            {activeCase.protocol && (
              <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                {activeCase.protocol.nameThai}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'visits',
      header: 'Visits',
      className: 'text-center w-20',
      headerClassName: 'text-center',
      render: (row) => (
        <span className="tabular-nums text-sm">{row._count?.visits ?? 0}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'สถานะ',
      sortable: true,
      render: (row) => <StatusBadge active={row.isActive} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            ผู้ป่วยมะเร็ง
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cancer Patients — {response?.meta?.total ?? 0} ราย
          </p>
        </div>
        <Button asChild>
          <Link href="/cancer-patients/new">
            <Plus className="h-4 w-4 mr-1" />
            ลงทะเบียนผู้ป่วย
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="ค้นหา HN / เลขบัตร / ชื่อ..."
          className="w-full sm:w-[320px]"
        />
        <Select
          value={cancerSiteId}
          onChange={(v) => { setCancerSiteId(v); setPage(1); }}
          options={siteOptions}
          placeholder="ตำแหน่งมะเร็งทั้งหมด"
          className="w-full sm:w-[240px]"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={6} />
      ) : (
        <DataTable
          columns={columns}
          data={response?.data ?? []}
          totalItems={response?.meta?.total ?? 0}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          rowKey={(r) => r.id}
          onRowClick={(r) => router.push(`/cancer-patients/${r.id}`)}
          emptyTitle="ไม่พบผู้ป่วย"
          emptyDescription="No patients found matching your criteria"
        />
      )}
    </div>
  );
}
