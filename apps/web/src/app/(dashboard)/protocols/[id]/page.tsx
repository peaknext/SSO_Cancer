'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, ExternalLink, Pencil } from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CodeBadge } from '@/components/shared/code-badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { PriceBadge } from '@/components/shared/price-badge';
import { Skeleton } from '@/components/shared/loading-skeleton';
import { RegimenCard } from '@/components/protocols/regimen-card';

interface DrugTradeName {
  id: number;
  tradeName: string;
  drugCode: string;
  dosageForm: string | null;
  strength: string | null;
  unitPrice: number | null;
  isActive: boolean;
}

interface Drug {
  id: number;
  drugCode: string;
  genericName: string;
  drugCategory: string;
  tradeNames: DrugTradeName[];
}

interface RegimenDrug {
  id: number;
  dosePerCycle: string | null;
  route: string | null;
  daySchedule: string | null;
  notes: string | null;
  drug: Drug;
}

interface Regimen {
  id: number;
  regimenCode: string;
  regimenName: string;
  regimenType: string | null;
  cycleDays: number | null;
  maxCycles: number | null;
  regimenDrugs: RegimenDrug[];
}

interface ProtocolRegimen {
  id: number;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  notes: string | null;
  regimen: Regimen;
}

interface ProtocolStage {
  id: number;
  stage: {
    id: number;
    stageCode: string;
    nameEnglish: string;
    nameThai: string | null;
    stageGroup: string | null;
  };
}

interface ProtocolDetail {
  id: number;
  protocolCode: string;
  nameEnglish: string;
  nameThai: string | null;
  protocolType: string;
  treatmentIntent: string;
  notes: string | null;
  isActive: boolean;
  cancerSite: {
    id: number;
    siteCode: string;
    nameEnglish: string;
    nameThai: string;
  };
  protocolStages: ProtocolStage[];
  protocolRegimens: ProtocolRegimen[];
}

const intentVariant: Record<string, 'default' | 'success' | 'warning' | 'accent' | 'secondary'> = {
  CURATIVE: 'success',
  PALLIATIVE: 'warning',
  ADJUVANT: 'default',
  NEOADJUVANT: 'accent',
  CONCURRENT: 'secondary',
};

export default function ProtocolDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: protocol, isLoading } = useApi<ProtocolDetail>(`/protocols/${id}`);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (!protocol) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">ไม่พบโปรโตคอล — Protocol not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/protocols">กลับไปรายการโปรโตคอล</Link>
        </Button>
      </div>
    );
  }

  const sortedRegimens = [...protocol.protocolRegimens].sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    return (a.lineOfTherapy ?? 99) - (b.lineOfTherapy ?? 99);
  });

  return (
    <div className="space-y-6">
      {/* Back + Sticky header */}
      <div className="sticky top-16 z-10 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 lg:px-6 pt-4 lg:pt-6 pb-4 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-muted-foreground">
              <Link href="/protocols">
                <ArrowLeft className="h-4 w-4 mr-1" />
                โปรโตคอล
              </Link>
            </Button>
            <div className="flex items-center gap-3 flex-wrap">
              <CodeBadge code={protocol.protocolCode} className="text-sm px-3 py-1" />
              <h1 className="font-heading text-xl font-bold text-foreground">
                {protocol.nameEnglish}
              </h1>
              <StatusBadge active={protocol.isActive} />
            </div>
            {protocol.nameThai && (
              <p className="text-sm text-muted-foreground mt-1">{protocol.nameThai}</p>
            )}
          </div>
          <Button asChild size="sm">
            <Link href={`/protocols/${id}/edit`}>
              <Pencil className="h-4 w-4 mr-1" />
              แก้ไข
            </Link>
          </Button>
        </div>
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="pt-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground mb-1">ตำแหน่งมะเร็ง</dt>
              <dd>
                <Link
                  href={`/cancer-sites`}
                  className="text-primary hover:underline font-medium"
                >
                  {protocol.cancerSite.nameThai}
                </Link>
                <span className="text-muted-foreground ml-1">({protocol.cancerSite.siteCode})</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">ประเภท</dt>
              <dd>
                <Badge variant="secondary">{protocol.protocolType.replace(/_/g, ' ')}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">เจตนาการรักษา</dt>
              <dd>
                <Badge variant={intentVariant[protocol.treatmentIntent] || 'secondary'}>
                  {protocol.treatmentIntent}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground mb-1">สูตรยา</dt>
              <dd className="font-medium tabular-nums">{protocol.protocolRegimens.length} สูตร</dd>
            </div>
          </dl>
          {protocol.notes && (
            <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
              {protocol.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stages */}
      {protocol.protocolStages.length > 0 && (
        <div>
          <h2 className="font-heading text-base font-semibold mb-3">
            ระยะของโรคที่ใช้ได้ ({protocol.protocolStages.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {protocol.protocolStages.map((ps) => (
              <Badge key={ps.id} variant="outline" className="px-3 py-1.5 text-sm">
                <span className="font-mono text-xs text-primary mr-1.5">{ps.stage.stageCode}</span>
                {ps.stage.nameThai || ps.stage.nameEnglish}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Regimens */}
      <div>
        <h2 className="font-heading text-base font-semibold mb-3">
          สูตรยา ({protocol.protocolRegimens.length})
        </h2>
        <div className="space-y-4">
          {sortedRegimens.map((pr) => (
            <RegimenCard key={pr.id} protocolRegimen={pr} />
          ))}
        </div>
      </div>
    </div>
  );
}
