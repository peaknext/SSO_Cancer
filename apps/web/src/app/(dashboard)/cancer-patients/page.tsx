'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Plus, Download } from 'lucide-react';
import { usePaginatedApi } from '@/hooks/use-api';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { DataTable, type Column } from '@/components/shared/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { Select } from '@/components/ui/select';
import { CodeBadge } from '@/components/shared/code-badge';
import { Badge } from '@/components/ui/badge';
import { TableSkeleton } from '@/components/shared/loading-skeleton';
import { Button } from '@/components/ui/button';
import { useApi } from '@/hooks/use-api';
import { ExportModal } from './export-modal';

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
  fullName: string;
  isActive: boolean;
  createdAt: string;
  cases: PatientCase[];
  _count?: { visits: number; z51Visits: number; cases: number };
  _billingCounts?: { pending: number; approved: number; rejected: number };
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

export default function CancerPatientsPage() {
  const router = useRouter();
  const [page, setPage, h1] = usePersistedState('cp-page', 1);
  const [search, setSearch, h2] = usePersistedState('cp-search', '');
  const [cancerSiteId, setCancerSiteId, h3] = usePersistedState('cp-cancerSiteId', '');
  const [sortBy, setSortBy, h4] = usePersistedState('cp-sortBy', 'hn');
  const [sortOrder, setSortOrder, h5] = usePersistedState<'asc' | 'desc'>('cp-sortOrder', 'asc');
  const [sourceHospitalId, setSourceHospitalId, h6] = usePersistedState('cp-sourceHospitalId', '');
  const [exportOpen, setExportOpen] = useState(false);
  const filtersHydrated = h1 && h2 && h3 && h4 && h5 && h6;

  const { data: response, isLoading } = usePaginatedApi<PatientsResponse>('/cancer-patients', {
    page,
    limit: 25,
    search: search || undefined,
    cancerSiteId: cancerSiteId || undefined,
    sourceHospitalId: sourceHospitalId || undefined,
    sortBy,
    sortOrder,
  }, { enabled: filtersHydrated });

  const { data: sitesResponse } = useApi<CancerSitesResponse>(
    '/cancer-sites?limit=100&sortBy=siteCode&sortOrder=asc',
  );

  const { data: caseHospitals } = useApi<{ id: number; hcode5: string | null; nameThai: string; province: string }[]>(
    '/cancer-patients/case-hospitals',
  );

  const siteOptions = (sitesResponse?.data ?? []).map((s) => ({
    value: String(s.id),
    label: `${s.siteCode} — ${s.nameThai}`,
  }));

  const hospitalOptions = (caseHospitals ?? []).map((h) => ({
    value: String(h.id),
    label: `${h.hcode5 ?? '—'} — ${h.nameThai}`,
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
      header: 'Visits (ทั้งหมด/Z51x)',
      className: 'text-center w-32',
      headerClassName: 'text-center',
      render: (row) => {
        const total = row._count?.visits ?? 0;
        const z51 = row._count?.z51Visits ?? 0;
        return (
          <div className="font-mono tabular-nums text-sm flex items-center justify-center gap-0.5">
            <span className="text-foreground">{total}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-primary font-semibold">{z51}</span>
          </div>
        );
      },
    },
    {
      key: 'billing',
      header: 'การเรียกเก็บ',
      className: 'w-44',
      render: (row) => {
        const bc = row._billingCounts;
        const p = bc?.pending ?? 0;
        const a = bc?.approved ?? 0;
        const r = bc?.rejected ?? 0;
        if (p === 0 && a === 0 && r === 0) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {p > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 ring-1 ring-inset ring-amber-300/40 dark:ring-amber-500/30">
                P {p}
              </span>
            )}
            {a > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 ring-1 ring-inset ring-emerald-300/40 dark:ring-emerald-500/30">
                A {a}
              </span>
            )}
            {r > 0 && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 ring-1 ring-inset ring-rose-300/40 dark:ring-rose-500/30">
                R {r}
              </span>
            )}
          </div>
        );
      },
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setExportOpen(true)}>
            <Download className="h-4 w-4 mr-1" />
            ส่งออก Excel
          </Button>
          <Button asChild>
            <Link href="/cancer-patients/new">
              <Plus className="h-4 w-4 mr-1" />
              ลงทะเบียนผู้ป่วย
            </Link>
          </Button>
        </div>
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
        <Select
          value={sourceHospitalId}
          onChange={(v) => { setSourceHospitalId(v); setPage(1); }}
          options={hospitalOptions}
          placeholder="รพ.ต้นทางทั้งหมด"
          className="w-full sm:w-70"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={10} cols={5} />
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

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        total={response?.meta?.total ?? 0}
        filters={{
          search: search || undefined,
          cancerSiteId: cancerSiteId || undefined,
          sourceHospitalId: sourceHospitalId || undefined,
        }}
      />
    </div>
  );
}
