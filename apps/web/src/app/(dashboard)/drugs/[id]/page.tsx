'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pill, FlaskConical, Tags, Pencil } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriceBadge } from '@/components/shared/price-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';

interface DrugTradeName {
  id: number;
  tradeName: string;
  drugCode: string;
  dosageForm: string | null;
  strength: string | null;
  unitPrice: number | null;
  unit: string | null;
  isActive: boolean;
}

interface RegimenDrug {
  id: number;
  dosePerCycle: string | null;
  route: string | null;
  regimen: {
    id: number;
    regimenCode: string;
    regimenName: string;
    protocolRegimens?: {
      protocolName: {
        id: number;
        protocolCode: string;
        nameEnglish: string;
      };
    }[];
  };
}

interface DrugDetail {
  id: number;
  drugCode: string;
  genericName: string;
  drugCategory: string;
  description: string | null;
  isActive: boolean;
  tradeNames: DrugTradeName[];
  regimenDrugs: RegimenDrug[];
}

export default function DrugDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: drug, isLoading } = useApi<DrugDetail>(`/drugs/${id}`);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!drug) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบยา — Drug not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/drugs">กลับไปรายการยา</Link>
        </Button>
      </div>
    );
  }

  const activeTradeNames = drug.tradeNames.filter((tn) => tn.isActive);
  const withPrice = activeTradeNames.filter((tn) => tn.unitPrice != null);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/drugs">
            <ArrowLeft className="h-4 w-4 mr-1" />
            ยา
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <CodeBadge code={drug.drugCode} className="text-sm px-3 py-1" />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {drug.genericName}
            </h1>
            <StatusBadge active={drug.isActive} />
          </div>
          <Button asChild size="sm">
            <Link href={`/drugs/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              แก้ไข
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary">{drug.drugCategory.replace(/_/g, ' ')}</Badge>
          {drug.description && (
            <span className="text-sm text-muted-foreground">— {drug.description}</span>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <Tags className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{activeTradeNames.length}</p>
              <p className="text-xs text-muted-foreground">ชื่อการค้าที่ใช้งาน</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-subtle text-success">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{withPrice.length}/{activeTradeNames.length}</p>
              <p className="text-xs text-muted-foreground">มีราคา SSO</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{drug.regimenDrugs.length}</p>
              <p className="text-xs text-muted-foreground">ใช้ในสูตรยา</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trade names table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ชื่อการค้า ({drug.tradeNames.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y bg-muted/5">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ชื่อการค้า</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">รหัส SSO</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">รูปแบบยา</th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ความแรง</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">ราคา/หน่วย</th>
                  <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {drug.tradeNames.map((tn) => (
                  <tr key={tn.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{tn.tradeName}</td>
                    <td className="px-4 py-3">
                      {tn.drugCode ? (
                        <span className="font-mono text-xs">{tn.drugCode}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{tn.dosageForm || '—'}</td>
                    <td className="px-4 py-3">{tn.strength || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <PriceBadge price={tn.unitPrice} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge active={tn.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Regimen usage */}
      {drug.regimenDrugs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">ใช้ในสูตรยา ({drug.regimenDrugs.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">สูตรยา</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ขนาดยา</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วิธีให้</th>
                  </tr>
                </thead>
                <tbody>
                  {drug.regimenDrugs.map((rd) => (
                    <tr key={rd.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CodeBadge code={rd.regimen.regimenCode} />
                          <span className="font-medium">{rd.regimen.regimenName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {rd.dosePerCycle || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {rd.route ? <Badge variant="secondary">{rd.route}</Badge> : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
