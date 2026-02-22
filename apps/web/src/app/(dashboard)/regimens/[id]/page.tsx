'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FlaskConical, Pill, FileText, Clock, Repeat, Pencil } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';

// ─── Types ──────────────────────────────────────────────────────────────────
interface Drug {
  id: number;
  drugCode: string;
  genericName: string;
  drugCategory: string;
}

interface RegimenDrug {
  id: number;
  dosePerCycle: string | null;
  route: string | null;
  daySchedule: string | null;
  isOptional: boolean;
  notes: string | null;
  drug: Drug;
}

interface ProtocolRegimen {
  id: number;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  notes: string | null;
  protocol: {
    id: number;
    protocolCode: string;
    nameEnglish: string;
    nameThai: string | null;
    protocolType: string | null;
    treatmentIntent: string | null;
    cancerSite: {
      id: number;
      siteCode: string;
      nameEnglish: string;
      nameThai: string;
    };
  };
}

interface RegimenDetail {
  id: number;
  regimenCode: string;
  regimenName: string;
  description: string | null;
  cycleDays: number | null;
  maxCycles: number | null;
  regimenType: string | null;
  isActive: boolean;
  regimenDrugs: RegimenDrug[];
  protocolRegimens: ProtocolRegimen[];
}

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'secondary'> = {
  chemotherapy: 'default',
  targeted: 'accent',
  immunotherapy: 'success',
  hormonal: 'warning',
  chemoradiation: 'secondary',
};

const intentVariant: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'secondary'> = {
  CURATIVE: 'success',
  PALLIATIVE: 'warning',
  ADJUVANT: 'default',
  NEOADJUVANT: 'accent',
  CONCURRENT: 'secondary',
};

export default function RegimenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: regimen, isLoading } = useApi<RegimenDetail>(`/regimens/${id}`);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!regimen) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบสูตรยา — Regimen not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/regimens">กลับไปรายการสูตรยา</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
          <Link href="/regimens">
            <ArrowLeft className="h-4 w-4 mr-1" />
            สูตรยา
          </Link>
        </Button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <CodeBadge code={regimen.regimenCode} className="text-sm px-3 py-1" />
            <h1 className="font-heading text-xl font-bold text-foreground">
              {regimen.regimenName}
            </h1>
            <StatusBadge active={regimen.isActive} />
          </div>
          <Button asChild size="sm">
            <Link href={`/regimens/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              แก้ไข
            </Link>
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {regimen.regimenType && (
            <Badge variant={typeVariant[regimen.regimenType] || 'secondary'}>
              {regimen.regimenType.replace(/_/g, ' ')}
            </Badge>
          )}
          {regimen.description && (
            <span className="text-sm text-muted-foreground">— {regimen.description}</span>
          )}
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-subtle text-primary">
              <Pill className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{regimen.regimenDrugs.length}</p>
              <p className="text-xs text-muted-foreground">ยาในสูตร</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-subtle text-success">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{regimen.protocolRegimens.length}</p>
              <p className="text-xs text-muted-foreground">โปรโตคอลที่ใช้</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-subtle text-accent">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {regimen.cycleDays != null ? `${regimen.cycleDays} วัน` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">ระยะเวลารอบ</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {regimen.maxCycles != null ? `${regimen.maxCycles} รอบ` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">จำนวนรอบสูงสุด</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drugs table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ยาในสูตร ({regimen.regimenDrugs.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {regimen.regimenDrugs.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              ยังไม่มียาในสูตรนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ยา</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ขนาดยา</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วิธีให้</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">วันที่ให้</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">เพิ่มเติม</th>
                  </tr>
                </thead>
                <tbody>
                  {regimen.regimenDrugs.map((rd) => (
                    <tr
                      key={rd.id}
                      className="border-b last:border-0 hover:bg-muted/5 cursor-pointer"
                      onClick={() => router.push(`/drugs/${rd.drug.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CodeBadge code={rd.drug.drugCode} />
                          <span className="font-medium">{rd.drug.genericName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {rd.dosePerCycle || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {rd.route ? <Badge variant="secondary">{rd.route}</Badge> : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {rd.daySchedule ? (
                          <span className="font-mono text-xs">{rd.daySchedule}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {rd.isOptional && (
                            <Badge variant="warning" className="text-[10px]">Optional</Badge>
                          )}
                          {rd.notes && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{rd.notes}</span>
                          )}
                          {!rd.isOptional && !rd.notes && '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked protocols table */}
      {regimen.protocolRegimens.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              โปรโตคอลที่ใช้สูตรยานี้ ({regimen.protocolRegimens.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y bg-muted/5">
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">โปรโตคอล</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ตำแหน่งมะเร็ง</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">ประเภท</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">เจตนา</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Line</th>
                    <th className="px-4 py-2.5 text-center font-medium text-muted-foreground">Preferred</th>
                    <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  {regimen.protocolRegimens.map((pr) => (
                    <tr
                      key={pr.id}
                      className={`border-b last:border-0 hover:bg-muted/5 cursor-pointer ${pr.isPreferred ? 'border-l-[3px] border-l-primary' : ''}`}
                      onClick={() => router.push(`/protocols/${pr.protocol.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CodeBadge code={pr.protocol.protocolCode} />
                          <div>
                            <span className="font-medium">{pr.protocol.nameEnglish}</span>
                            {pr.protocol.nameThai && (
                              <p className="text-xs text-muted-foreground">{pr.protocol.nameThai}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {pr.protocol.cancerSite.nameThai}
                      </td>
                      <td className="px-4 py-3">
                        {pr.protocol.protocolType ? (
                          <Badge variant={typeVariant[pr.protocol.protocolType] || 'secondary'} className="text-[11px]">
                            {pr.protocol.protocolType.replace(/_/g, ' ')}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {pr.protocol.treatmentIntent ? (
                          <Badge variant={intentVariant[pr.protocol.treatmentIntent] || 'secondary'} className="text-[11px]">
                            {pr.protocol.treatmentIntent.replace(/_/g, ' ')}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {pr.lineOfTherapy ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {pr.isPreferred ? '⭐' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {pr.notes || '—'}
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
